// BackExams/utils/htmlToDocx-fixed.js
// VERSIÓN COMPLETA - Solo corrige los problemas sin eliminar funcionalidad
import docx from 'docx';
import he from 'he';

const { 
  Paragraph, 
  TextRun, 
  AlignmentType,
  UnderlineType,
  BorderStyle
} = docx;

/**
 * Detecta si el texto necesita decodificación
 */
function needsDecoding(html) {
  // Si contiene entidades HTML, necesita decodificación
  return /&[a-zA-Z]+;|&#\d+;|&#x[a-fA-F0-9]+;/.test(html);
}

/**
 * Valida y limpia HTML antes de procesarlo
 * @param {string} html - El HTML a limpiar
 * @returns {string} - HTML limpio y válido
 */
function sanitizeHtml(html) {
  if (!html) return '';
  
  let cleaned = html;
  
  // 1. 🔴 CORRECCIÓN: Solo decodificar si es necesario
  if (needsDecoding(cleaned)) {
    cleaned = he.decode(cleaned);
  }
  
  // 2. 🔴 CORRECCIÓN: Escapar SOLO casos específicos, no todos los < >
  // Solo escapar cuando claramente NO son tags (ej: "< 5" o "5 >")
  cleaned = cleaned.replace(/(<)\s+(\d)/g, '&lt; $2');
  cleaned = cleaned.replace(/(\d)\s+(>)/g, '$1 &gt;');
  // NO aplicar el regex general que rompe tags válidos
  
  // 3. Asegurar que todos los tags estén cerrados
  const openTags = [];
  const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link'];
  
  // Parsear el HTML para encontrar tags no cerrados
  const tagRegex = /<(\/?)([\w]+)([^>]*)>/g;
  let match;
  
  while ((match = tagRegex.exec(cleaned)) !== null) {
    const [fullMatch, isClosing, tagName, attributes] = match;
    const lowerTagName = tagName.toLowerCase();
    
    if (!isClosing && !selfClosingTags.includes(lowerTagName)) {
      // Tag de apertura
      openTags.push(lowerTagName);
    } else if (isClosing) {
      // Tag de cierre
      const lastIndex = openTags.lastIndexOf(lowerTagName);
      if (lastIndex >= 0) {
        openTags.splice(lastIndex, 1);
      }
    }
  }
  
  // Cerrar tags no cerrados
  openTags.reverse().forEach(tag => {
    cleaned += `</${tag}>`;
  });
  
  // 4. Corregir atributos mal formados
  cleaned = cleaned.replace(/<(\w+)([^>]*)>/g, (match, tagName, attributes) => {
    if (!attributes) return match;
    
    // Corregir atributos con comillas no cerradas
    let fixedAttrs = attributes;
    
    // Buscar atributos y asegurar que tengan comillas completas
    fixedAttrs = fixedAttrs.replace(/(\w+)=["']([^"']*?)(?=\s|\/>|>|$)/g, (m, attr, value) => {
      // Si el valor no termina con comilla, añadirla
      if (!m.endsWith('"') && !m.endsWith("'")) {
        return `${attr}="${value}"`;
      }
      return m;
    });
    
    // Corregir estilos específicamente
    fixedAttrs = fixedAttrs.replace(/style="([^"]*)(?="|\s|>|$)/g, (m, styles) => {
      // Asegurar que los estilos terminen correctamente
      let fixedStyles = styles;
      
      // Eliminar punto y coma al final si existe
      fixedStyles = fixedStyles.replace(/;\s*$/, '');
      
      // Corregir propiedades CSS mal formadas
      fixedStyles = fixedStyles.split(';').map(style => {
        const trimmed = style.trim();
        if (trimmed && !trimmed.includes(':')) {
          return ''; // Propiedad inválida
        }
        return trimmed;
      }).filter(s => s).join(';');
      
      return `style="${fixedStyles}"`;
    });
    
    return `<${tagName}${fixedAttrs}>`;
  });
  
  return cleaned;
}

/**
 * Parsea un fragmento de HTML de forma segura
 * @param {string} html - HTML a parsear
 * @returns {Object} - Árbol de elementos parseados
 */
function safeParseHtml(html) {
  const sanitized = sanitizeHtml(html);
  const elements = [];
  
  // Parser simple basado en regex con mejor manejo de errores
  const parts = sanitized.split(/(<[^>]+>)/);
  
  let currentElement = null;
  const elementStack = [];
  
  parts.forEach(part => {
    if (!part) return;
    
    // Es un tag
    if (part.startsWith('<')) {
      const tagMatch = part.match(/<(\/?)([\w]+)([^>]*)>/);
      if (!tagMatch) return;
      
      const [, isClosing, tagName, attributes] = tagMatch;
      
      if (isClosing) {
        // Tag de cierre
        if (elementStack.length > 0 && elementStack[elementStack.length - 1].tag === tagName) {
          currentElement = elementStack.pop();
          if (elementStack.length > 0) {
            elementStack[elementStack.length - 1].children.push(currentElement);
          } else {
            elements.push(currentElement);
          }
        }
      } else {
        // Tag de apertura
        const newElement = {
          tag: tagName,
          attributes: parseAttributes(attributes),
          children: [],
          text: ''
        };
        
        if (elementStack.length > 0) {
          elementStack[elementStack.length - 1].children.push(newElement);
        }
        
        // No apilar tags auto-cerrados
        if (!['br', 'hr', 'img'].includes(tagName)) {
          elementStack.push(newElement);
        } else {
          elements.push(newElement);
        }
      }
    } else {
      // Es texto
      const text = part.trim();
      if (text) {
        if (elementStack.length > 0) {
          elementStack[elementStack.length - 1].text += text;
        } else {
          elements.push({ tag: 'text', text });
        }
      }
    }
  });
  
  // Agregar elementos restantes en el stack
  while (elementStack.length > 0) {
    elements.push(elementStack.pop());
  }
  
  return elements;
}

/**
 * Parsea atributos de un tag HTML
 * @param {string} attributeString - String con los atributos
 * @returns {Object} - Objeto con los atributos parseados
 */
function parseAttributes(attributeString) {
  const attributes = {};
  if (!attributeString) return attributes;
  
  const attrRegex = /(\w+)(?:=["']([^"']*?)["'])?/g;
  let match;
  
  while ((match = attrRegex.exec(attributeString)) !== null) {
    const [, name, value] = match;
    attributes[name] = value || true;
  }
  
  return attributes;
}

/**
 * Convierte elementos parseados a elementos de docx
 * @param {Array} elements - Elementos parseados
 * @param {Object} defaultStyle - Estilo por defecto
 * @returns {Array} - Array de TextRuns
 */
function elementsToTextRuns(elements, defaultStyle = {}) {
  const runs = [];
  
  elements.forEach(element => {
    if (element.tag === 'text') {
      // Texto simple
      runs.push(new TextRun({ 
        text: element.text,
        ...defaultStyle 
      }));
    } else {
      // Elemento con estilo
      const style = { ...defaultStyle };
      
      // Aplicar estilos según el tag
      switch (element.tag) {
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
          break;
      }
      
      // Aplicar estilos desde atributos
      if (element.attributes.style) {
        const styles = parseInlineStyles(element.attributes.style);
        
        if (styles.color) {
          style.color = convertColorForWord(styles.color);
        }
        
        if (styles['background-color']) {
          style.highlight = convertBackgroundToHighlight(styles['background-color']);
        }
        
        if (styles['font-weight'] && (styles['font-weight'] === 'bold' || parseInt(styles['font-weight']) >= 600)) {
          style.bold = true;
        }
        
        if (styles['text-decoration'] && styles['text-decoration'].includes('underline')) {
          style.underline = { type: UnderlineType.SINGLE };
        }
      }
      
      // Crear runs para el texto del elemento
      if (element.text) {
        runs.push(new TextRun({ 
          text: element.text,
          ...style 
        }));
      }
      
      // Procesar hijos recursivamente
      if (element.children && element.children.length > 0) {
        const childRuns = elementsToTextRuns(element.children, style);
        runs.push(...childRuns);
      }
    }
  });
  
  return runs;
}

/**
 * Parsea estilos inline CSS
 * @param {string} styleString - String con estilos CSS
 * @returns {Object} - Objeto con propiedades CSS
 */
function parseInlineStyles(styleString) {
  const styles = {};
  if (!styleString) return styles;
  
  styleString.split(';').forEach(style => {
    const [property, value] = style.split(':').map(s => s.trim());
    if (property && value) {
      styles[property] = value;
    }
  });
  
  return styles;
}

/**
 * Convierte color CSS a formato Word
 * @param {string} color - Color CSS
 * @returns {string} - Color en formato Word
 */
function convertColorForWord(color) {
  if (!color) return null;
  
  try {
    color = color.toLowerCase().trim();
    
    // Mapa de conversión existente
    const colorConversions = {
      '#4b0082': '4B0082',
      '#000080': '000080',
      '#006400': '006400',
      '#8b0000': '8B0000',
      '#0066cc': '0066CC',
      '#28a745': '28A745',
      '#fd7e14': 'FD7E14',
      '#dc3545': 'DC3545',
      '#1565c0': '1565C0',
      'red': 'FF0000',
      'blue': '0000FF',
      'green': '008000',
      'black': '000000',
      'white': 'FFFFFF'
    };
    
    if (colorConversions[color]) {
      return colorConversions[color];
    }
    
    // Procesar hex
    if (color.startsWith('#')) {
      return color.substring(1).toUpperCase();
    }
    
  } catch (e) {
    console.error('Error convirtiendo color:', e);
  }
  
  return '000000';
}

/**
 * Convierte color de fondo a highlight de Word
 * @param {string} bgColor - Color de fondo
 * @returns {string} - Highlight para Word
 */
function convertBackgroundToHighlight(bgColor) {
  // Mapeo simple de colores a highlights de Word
  const highlightMap = {
    '#ffd700': 'yellow',
    '#ffff00': 'yellow',
    '#87ceeb': 'lightBlue',
    '#98fb98': 'lightGreen',
    '#ffe4e1': 'lightGray',
    '#ffa500': 'yellow',
    '#ff6347': 'red'
  };
  
  return highlightMap[bgColor.toLowerCase()] || null;
}

/**
 * Función principal mejorada para convertir HTML a elementos docx
 * @param {string} html - HTML a convertir
 * @returns {Array} - Array de Paragraphs para docx
 */
export function htmlToDocxElements(html) {
  if (!html) return [];
  
  try {
    // Sanitizar y parsear el HTML
    const elements = safeParseHtml(html);
    
    // Si no hay elementos, devolver texto plano
    if (elements.length === 0) {
      const plainText = html.replace(/<[^>]*>/g, '').trim();
      if (plainText) {
        return [
          new Paragraph({
            children: [new TextRun({ text: plainText })],
            alignment: AlignmentType.JUSTIFIED
          })
        ];
      }
      return [];
    }
    
    // Convertir elementos a párrafos de docx
    const paragraphs = [];
    let currentRuns = [];
    
    elements.forEach(element => {
      if (element.tag === 'p' || element.tag === 'div') {
        // Nuevo párrafo
        if (currentRuns.length > 0) {
          paragraphs.push(new Paragraph({
            children: currentRuns,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }));
          currentRuns = [];
        }
        
        // Procesar contenido del párrafo
        const runs = elementsToTextRuns([element]);
        if (runs.length > 0) {
          paragraphs.push(new Paragraph({
            children: runs,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          }));
        }
      } else if (element.tag === 'br') {
        // Salto de línea - crear nuevo párrafo
        if (currentRuns.length > 0) {
          paragraphs.push(new Paragraph({
            children: currentRuns,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 100 }
          }));
          currentRuns = [];
        }
      } else {
        // Agregar runs al párrafo actual
        const runs = elementsToTextRuns([element]);
        currentRuns.push(...runs);
      }
    });
    
    // Agregar runs restantes
    if (currentRuns.length > 0) {
      paragraphs.push(new Paragraph({
        children: currentRuns,
        alignment: AlignmentType.JUSTIFIED
      }));
    }
    
    return paragraphs;
    
  } catch (error) {
    console.error('Error convirtiendo HTML a docx:', error);
    
    // Fallback: devolver texto sin formato
    const plainText = html.replace(/<[^>]*>/g, '').trim();
    if (plainText) {
      return [
        new Paragraph({
          children: [new TextRun({ text: plainText })],
          alignment: AlignmentType.JUSTIFIED
        })
      ];
    }
    
    return [];
  }
}

export default htmlToDocxElements;