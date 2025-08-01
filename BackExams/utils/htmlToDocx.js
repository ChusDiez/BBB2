// BackExams/utils/htmlToDocx.js - VERSIÓN ROBUSTA CON PARSER DOM
import { parseDocument } from 'htmlparser2';
import { DomHandler } from 'domhandler';
import render from 'dom-serializer';
import docx from 'docx';

const { 
  Paragraph, 
  TextRun, 
  AlignmentType,
  UnderlineType,
  HeadingLevel,
  Table,
  TableCell,
  TableRow,
  WidthType,
  ShadingType,
  BorderStyle
} = docx;

/**
 * Parser mejorado de estilos CSS inline a objeto JavaScript
 * @param {string} styleString - String de estilos CSS
 * @returns {Object} - Objeto con estilos en camelCase
 */
function parseInlineStyles(styleString) {
  if (!styleString) return {};
  
  return Object.fromEntries(
    styleString
      .split(";")
      .map(rule => rule.trim())
      .filter(Boolean)
      .map(rule => {
        const [key, ...valueParts] = rule.split(":");
        if (!key || valueParts.length === 0) return null;
        
        // Convertir kebab-case a camelCase
        const camelKey = key.trim().replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        const value = valueParts.join(":").trim();
        
        return [camelKey, value];
      })
      .filter(Boolean)
  );
}

/**
 * Convierte color hex a formato Word (mayúsculas, sin #)
 * @param {string} color - Color en cualquier formato
 * @returns {string} - Color en formato RRGGBB mayúsculas
 */
function normalizeHexColorForWord(color) {
  if (!color) return "000000";
  
  // Extraer hex del color
  const hexMatch = color.match(/#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})/);
  if (!hexMatch) return "000000";
  
  let hex = hexMatch[1].toUpperCase();
  
  // Expandir shorthand (ej: F0A -> FF00AA)
  if (hex.length === 3) {
    hex = hex.split("").map(c => c + c).join("");
  }
  
  return hex;
}

/**
 * Parsea border-left CSS a configuración Word
 * @param {string} borderLeft - Valor CSS de border-left
 * @returns {Object|null} - Configuración de borde para Word
 */
function parseBorderLeftForWord(borderLeft) {
  if (!borderLeft) return null;
  
  // Formato esperado: "6px solid #DC3545"
  const match = borderLeft.match(/(\d+)px\s+(solid|dotted|dashed)\s+(#?[a-fA-F0-9]{6}|#?[a-fA-F0-9]{3})/);
  if (!match) return null;
  
  const widthPx = parseInt(match[1], 10);
  const style = match[2];
  const color = normalizeHexColorForWord(match[3]);
  
  // Convertir px a eighths of a point (Word units)
  // 1px ≈ 0.75pt, 1pt = 8 eighths → 1px ≈ 6 eighths
  const size = Math.max(1, Math.round(widthPx * 0.75 * 8));
  
  // Mapear estilos CSS a BorderStyle
  const borderStyleMap = {
    'solid': BorderStyle.SINGLE,
    'dotted': BorderStyle.DOTTED,
    'dashed': BorderStyle.DASHED
  };
  
  return { 
    size, 
    color, 
    style: borderStyleMap[style] || BorderStyle.SINGLE 
  };
}

/**
 * Detecta si un contenedor necesita tabla especial (tiene fondo o borde)
 * @param {Object} styles - Estilos extraídos del elemento
 * @returns {boolean} - True si necesita tabla especial
 */
function needsSpecialContainer(styles) {
  return styles.backgroundColor || styles.borderLeft;
}

/**
 * Crea tabla 1x1 para contenedores especiales
 * @param {Array} content - Contenido a envolver
 * @param {Object} styles - Estilos del contenedor
 * @returns {Table} - Tabla con estilos aplicados
 */
function createSpecialContainerTable(content, styles) {
  // Configurar shading (fondo)
  const cellShading = styles.backgroundColor ? {
    type: ShadingType.SOLID,
    color: "auto",
    fill: normalizeHexColorForWord(styles.backgroundColor)
  } : undefined;
  
  // Configurar borde izquierdo
  const borderConfig = parseBorderLeftForWord(styles.borderLeft);
  const cellBorders = borderConfig ? {
    left: {
      style: borderConfig.style,
      size: borderConfig.size,
      color: borderConfig.color
    }
  } : undefined;
  
  // Crear celda con configuración completa
  const cell = new TableCell({
    children: content,
    shading: cellShading,
    borders: cellBorders,
    margins: {
      // Aplicar padding de 10pt en todos los lados
      top: 141, // 10pt en twips (1pt = 14.1 twips)
      bottom: 141,
      left: 141,
      right: 141
    }
  });
  
  // Crear fila con cantSplit para evitar saltos de página
  const row = new TableRow({
    children: [cell],
    cantSplit: true // Evitar que Word parta esta fila entre páginas
  });
  
  return new Table({
    rows: [row],
    width: { size: 100, type: WidthType.PERCENTAGE }
  });
}

/**
 * Convierte HTML a elementos docx usando un parser DOM real
 * @param {string} html - HTML a convertir
 * @returns {Array} - Array de elementos docx (Paragraphs)
 */
export function htmlToDocxElements(html) {
  if (!html || typeof html !== 'string') {
    return [];
  }

  try {
    // Parsear HTML a DOM
    const dom = parseDocument(html.trim());
    
    // Procesar el DOM y generar elementos docx
    const elements = [];
    processNodes(dom.children, elements);
    
    // Si no se generaron elementos, crear al menos un párrafo
    if (elements.length === 0 && html.trim()) {
      elements.push(createParagraph([
        new TextRun({ text: stripHtml(html) })
      ]));
    }
    
    return elements;
    
  } catch (error) {
    console.error('Error convirtiendo HTML a docx:', error);
    // Fallback: devolver texto sin formato
    return [createParagraph([
      new TextRun({ text: stripHtml(html) })
    ])];
  }
}

/**
 * Procesa nodos del DOM recursivamente
 * @param {Array} nodes - Nodos del DOM a procesar
 * @param {Array} elements - Array donde agregar elementos docx
 * @param {Object} context - Contexto para elementos anidados
 */
function processNodes(nodes, elements, context = {}) {
  for (const node of nodes) {
    processNode(node, elements, context);
  }
}

/**
 * Procesa un nodo individual del DOM
 * @param {Object} node - Nodo del DOM
 * @param {Array} elements - Array donde agregar elementos docx
 * @param {Object} context - Contexto heredado
 */
function processNode(node, elements, context = {}) {
  // Nodo de texto
  if (node.type === 'text') {
    // En contexto inline, no crear párrafo
    if (context.inline) {
      return createTextRun(node.data, context.style || {});
    }
    // Texto suelto, crear párrafo
    const text = node.data.trim();
    if (text) {
      elements.push(createParagraph([
        new TextRun({ text })
      ]));
    }
    return;
  }

  // Nodo elemento
  if (node.type === 'tag') {
    const tagName = node.name.toLowerCase();
    
    // Elementos de bloque
    if (isBlockElement(tagName)) {
      processBlockElement(node, elements, context);
    } 
    // Elementos inline - no procesamos aquí, se procesan dentro de bloques
    else if (context.inline) {
      return processInlineElement(node, context);
    }
    // Elemento inline suelto, crear párrafo
    else {
      const runs = [];
      const inlineContext = { ...context, inline: true };
      collectInlineContent(node.children, runs, inlineContext);
      if (runs.length > 0) {
        elements.push(createParagraph(runs));
      }
    }
  }
}

/**
 * Determina si un elemento es de bloque
 */
function isBlockElement(tagName) {
  const blockElements = [
    'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'hr',
    'table', 'tr', 'td', 'th', 'article', 'section',
    'header', 'footer', 'main', 'nav', 'aside'
  ];
  return blockElements.includes(tagName);
}

/**
 * Procesa elementos de bloque
 */
function processBlockElement(node, elements, context) {
  const tagName = node.name.toLowerCase();
  const style = extractStyles(node);
  
  switch (tagName) {
    case 'p':
      processParagraph(node, elements, { ...context, style });
      break;
      
    case 'div':
      // Los divs pueden ser contenedores especiales o simples
      if (style.borderLeft || style['border-left']) {
        // Es un contenedor con borde (tema)
        processContainer(node, elements, style);
      } else {
        // Div simple, procesar hijos
        processNodes(node.children, elements, context);
      }
      break;
      
    case 'ul':
    case 'ol':
      processList(node, elements, tagName === 'ol');
      break;
      
    case 'li':
      // Los li se procesan dentro de listas
      if (!context.inList) {
        processParagraph(node, elements, context);
      }
      break;
      
    case 'blockquote':
      processBlockquote(node, elements);
      break;
      
    case 'br':
      elements.push(createParagraph([]));
      break;
      
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      processHeading(node, elements, parseInt(tagName[1]));
      break;
      
    case 'hr':
      elements.push(createParagraph([
        new TextRun({ text: '─'.repeat(50) })
      ]));
      break;
      
    default:
      // Otros elementos de bloque, procesar como párrafo
      processParagraph(node, elements, context);
  }
}

/**
 * Procesa un párrafo
 */
function processParagraph(node, elements, context) {
  const runs = [];
  const inlineContext = { ...context, inline: true };
  collectInlineContent(node.children, runs, inlineContext);
  
  if (runs.length > 0) {
    elements.push(createParagraph(runs, context.style));
  }
}

/**
 * Procesa un contenedor con estilos (divs temáticos)
 */
function processContainer(node, elements, style) {
  // Verificar si necesita tabla especial para estilos
  if (needsSpecialContainer(style)) {
    // Procesar contenido interno en array temporal
    const containerContent = [];
    processNodes(node.children, containerContent, {});
    
    // Si hay contenido, crear tabla especial
    if (containerContent.length > 0) {
      // Aplicar keepLines a párrafos largos dentro del contenedor
      const enhancedContent = containerContent.map(element => {
        if (element instanceof Paragraph) {
          // Clonar párrafo con keepLines para mantener cohesión
          const originalChildren = element.children;
          return new Paragraph({
            children: originalChildren,
            keepLines: true, // Evitar que Word parta párrafos largos
            alignment: element.alignment || AlignmentType.JUSTIFIED,
            spacing: element.spacing || { after: 200 }
          });
        }
        return element;
      });
      
      const specialTable = createSpecialContainerTable(enhancedContent, style);
      elements.push(specialTable);
    }
  } else {
    // Contenedor sin estilos especiales, procesar normalmente
    processNodes(node.children, elements, {});
  }
}

/**
 * Procesa listas
 */
function processList(node, elements, isOrdered) {
  let index = 1;
  
  for (const child of node.children) {
    if (child.type === 'tag' && child.name === 'li') {
      const runs = [];
      const bullet = isOrdered ? `${index}. ` : '• ';
      
      runs.push(new TextRun({ 
        text: bullet, 
        bold: true 
      }));
      
      // Recolectar contenido del li
      collectInlineContent(child.children, runs, { inline: true });
      
      elements.push(new Paragraph({
        children: runs,
        indent: { left: 360 },
        spacing: { after: 120 }
      }));
      
      index++;
    }
  }
}

/**
 * Procesa blockquotes
 */
function processBlockquote(node, elements) {
  const runs = [];
  collectInlineContent(node.children, runs, { inline: true });
  
  if (runs.length > 0) {
    elements.push(new Paragraph({
      children: runs,
      indent: { left: 720 },
      italics: true,
      spacing: { after: 200 },
      shading: {
        fill: "E8E8E8"
      }
    }));
  }
}

/**
 * Procesa encabezados
 */
function processHeading(node, elements, level) {
  const runs = [];
  collectInlineContent(node.children, runs, { inline: true });
  
  if (runs.length > 0) {
    const headingLevel = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6
    };
    
    elements.push(new Paragraph({
      children: runs,
      heading: headingLevel[level] || HeadingLevel.HEADING_6,
      spacing: { before: 240, after: 120 }
    }));
  }
}

/**
 * Recolecta contenido inline recursivamente
 */
function collectInlineContent(nodes, runs, context) {
  for (const node of nodes) {
    if (node.type === 'text') {
      const text = cleanText(node.data);
      if (text) {
        runs.push(createTextRun(text, context.style || {}));
      }
    } else if (node.type === 'tag') {
      const result = processInlineElement(node, context);
      if (result) {
        if (Array.isArray(result)) {
          runs.push(...result);
        } else {
          runs.push(result);
        }
      }
    }
  }
}

/**
 * Procesa elementos inline
 */
function processInlineElement(node, context) {
  const tagName = node.name.toLowerCase();
  const style = { ...(context.style || {}), ...extractStyles(node) };
  
  // Aplicar estilos según el tag
  switch (tagName) {
    case 'strong':
    case 'b':
      style.bold = true;
      break;
      
    case 'em':
    case 'i':
      style.italics = true;
      break;
      
    case 'u':
      style.underline = { type: UnderlineType.SINGLE };
      break;
      
    case 'mark':
      style.highlight = 'yellow';
      break;
      
    case 'code':
      style.font = 'Courier New';
      style.size = 20;
      break;
      
    case 'sub':
      style.subScript = true;
      break;
      
    case 'sup':
      style.superScript = true;
      break;
      
    case 's':
    case 'strike':
    case 'del':
      style.strike = true;
      break;
      
    case 'a':
      // Los enlaces se muestran subrayados en azul
      style.color = '0066CC';
      style.underline = { type: UnderlineType.SINGLE };
      break;
      
    case 'br':
      return new TextRun({ text: '\n' });
      
    case 'span':
      // Los spans solo aportan estilos, ya extraídos
      break;
  }
  
  // Si es un span vacío o sin contenido, no procesar
  if (tagName === 'span' && (!node.children || node.children.length === 0)) {
    return null;
  }
  
  // Recolectar contenido interno
  const runs = [];
  const newContext = { ...context, style, inline: true };
  
  for (const child of node.children) {
    if (child.type === 'text') {
      const text = cleanText(child.data);
      if (text) {
        runs.push(createTextRun(text, style));
      }
    } else if (child.type === 'tag') {
      const childResult = processInlineElement(child, newContext);
      if (childResult) {
        if (Array.isArray(childResult)) {
          runs.push(...childResult);
        } else {
          runs.push(childResult);
        }
      }
    }
  }
  
  return runs;
}

/**
 * Extrae estilos de un elemento usando el parser mejorado
 */
function extractStyles(node) {
  const styles = {};
  
  if (!node.attribs || !node.attribs.style) {
    return styles;
  }
  
  // Usar el parser mejorado de estilos
  const parsedStyles = parseInlineStyles(node.attribs.style);
  
  // Mapear propiedades CSS a opciones de docx
  Object.entries(parsedStyles).forEach(([prop, value]) => {
    switch (prop) {
      case 'color':
        const color = normalizeColor(value);
        if (color) styles.color = color;
        break;
        
      case 'backgroundColor':
        // MEJORADO: Usar shading en lugar de highlight cuando sea posible
        styles.backgroundColor = value; // Guardar valor original
        const highlight = getHighlightColor(value);
        if (highlight) styles.highlight = highlight;
        break;
        
      case 'fontWeight':
        if (value === 'bold' || parseInt(value) >= 600) {
          styles.bold = true;
        }
        break;
        
      case 'fontStyle':
        if (value === 'italic') styles.italics = true;
        break;
        
      case 'textDecoration':
        if (value.includes('underline')) {
          styles.underline = { type: UnderlineType.SINGLE };
        }
        if (value.includes('line-through')) {
          styles.strike = true;
        }
        break;
        
      case 'fontSize':
        // Convertir a puntos si es necesario
        const size = parseFontSize(value);
        if (size) styles.size = size;
        break;
        
      case 'fontFamily':
        styles.font = value.replace(/['"]/g, '').split(',')[0].trim();
        break;
        
      // MEJORADO: Guardar propiedades especiales para Word
      case 'borderLeft':
        styles.borderLeft = value;
        break;
        
      case 'padding':
        styles.padding = value;
        break;
        
      case 'margin':
        styles.margin = value;
        break;
    }
  });
  
  return styles;
}

/**
 * Crea un TextRun con estilos
 */
function createTextRun(text, style = {}) {
  const runOptions = { text };
  
  // Aplicar estilos
  if (style.bold) runOptions.bold = true;
  if (style.italics) runOptions.italics = true;
  if (style.underline) runOptions.underline = style.underline;
  if (style.strike) runOptions.strike = true;
  if (style.subScript) runOptions.subScript = true;
  if (style.superScript) runOptions.superScript = true;
  if (style.highlight) runOptions.highlight = style.highlight;
  if (style.color) runOptions.color = style.color;
  if (style.font) runOptions.font = style.font;
  if (style.size) runOptions.size = style.size;
  
  return new TextRun(runOptions);
}

/**
 * Crea un párrafo con opciones
 */
function createParagraph(runs, style = {}) {
  const options = {
    children: runs,
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 200 }
  };
  
  // Aplicar estilos del párrafo si existen
  if (style.indent) options.indent = style.indent;
  if (style.spacing) options.spacing = { ...options.spacing, ...style.spacing };
  if (style.shading) options.shading = style.shading;
  
  return new Paragraph(options);
}

/**
 * Normaliza colores CSS a formato Word (usa la función mejorada)
 */
function normalizeColor(color) {
  if (!color) return null;
  
  const normalized = color.trim().toLowerCase();
  
  // Colores nombrados comunes
  const namedColors = {
    'black': '#000000',
    'white': '#FFFFFF',
    'red': '#FF0000',
    'green': '#008000',
    'blue': '#0000FF',
    'yellow': '#FFFF00',
    'orange': '#FFA500',
    'purple': '#800080',
    'gray': '#808080',
    'grey': '#808080',
    'silver': '#C0C0C0',
    'maroon': '#800000',
    'navy': '#000080',
    'olive': '#808000',
    'teal': '#008080',
    'aqua': '#00FFFF',
    'fuchsia': '#FF00FF',
    'lime': '#00FF00'
  };
  
  // Convertir color nombrado a hex
  let colorToProcess = namedColors[normalized] || color;
  
  // RGB/RGBA
  const rgbMatch = normalized.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    const hex = [r, g, b].map(n => 
      parseInt(n).toString(16).padStart(2, '0')
    ).join('').toUpperCase();
    colorToProcess = '#' + hex;
  }
  
  // Usar la función mejorada para normalizar
  const result = normalizeHexColorForWord(colorToProcess);
  return result !== "000000" ? result : null;
}

/**
 * Mapea colores de fondo a highlights de Word (RESTRINGIDO a colores estándar)
 * NOTA: Solo usar highlight para colores específicos que Word maneja bien
 */
function getHighlightColor(bgColor) {
  if (!bgColor) return null;
  
  const normalized = bgColor.toLowerCase().trim();
  
  // RESTRINGIDO: Solo mapear colores que Word maneja perfectamente como highlight
  const restrictedHighlightMap = {
    // Solo amarillos claros (highlight amarillo funciona bien)
    '#ffd700': 'yellow',
    '#ffff00': 'yellow',
    '#ffffcc': 'yellow',
    'yellow': 'yellow',
    
    // Solo azules muy claros (cyan funciona bien)
    '#f0f8ff': 'cyan',
    '#e8f4fd': 'cyan',
    'lightblue': 'cyan',
    
    // Solo verdes muy claros
    '#f0fff0': 'green',
    'lightgreen': 'green'
  };
  
  // Intentar encontrar coincidencia exacta SOLO para colores seguros
  if (restrictedHighlightMap[normalized]) {
    return restrictedHighlightMap[normalized];
  }
  
  // NO usar highlight para colores arbitrarios
  // En su lugar, se usará shading en las tablas especiales
  return null;
}

/**
 * Parsea tamaño de fuente a puntos
 */
function parseFontSize(value) {
  if (!value) return null;
  
  const match = value.match(/^(\d+(?:\.\d+)?)(px|pt|em|rem)?$/);
  if (!match) return null;
  
  const [, num, unit] = match;
  const size = parseFloat(num);
  
  switch (unit) {
    case 'pt':
      return size * 2; // docx usa half-points
    case 'px':
      return Math.round(size * 1.5); // Aproximación px a pt
    case 'em':
    case 'rem':
      return Math.round(size * 24); // Asumiendo base 12pt
    default:
      return size * 2; // Asumir puntos
  }
}

/**
 * Limpia texto
 */
function cleanText(text) {
  if (!text) return '';
  
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ');
}

/**
 * Elimina todo el HTML (para fallback)
 */
function stripHtml(html) {
  if (!html) return '';
  
  // Usar el parser para obtener solo texto
  try {
    const dom = parseDocument(html);
    return extractText(dom);
  } catch (error) {
    // Fallback con regex
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
}

/**
 * Extrae texto de un nodo DOM recursivamente
 */
function extractText(node) {
  if (node.type === 'text') {
    return cleanText(node.data);
  }
  
  if (node.children) {
    return node.children.map(child => extractText(child)).join(' ');
  }
  
  return '';
}
