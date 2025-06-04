// BackExams/utils/htmlToDocx.js - VERSIÓN CORREGIDA Y ROBUSTA
import docx from 'docx';

const { 
  Paragraph, 
  TextRun, 
  AlignmentType,
  UnderlineType
} = docx;

/**
 * Convierte HTML enriquecido a elementos docx
 * SIEMPRE devuelve un array, nunca null o undefined
 */
export function htmlToDocxElements(html) {
  // Garantizar que siempre devolvemos un array
  if (!html || typeof html !== 'string') {
    console.warn('htmlToDocxElements: Input no válido, devolviendo array vacío');
    return [];
  }
  
  try {
    html = html.trim();
    
    // Si es texto plano (sin HTML)
    if (!html.includes('<')) {
      return createParagraphsFromText(html);
    }
    
    // Procesar el HTML preservando contenedores
    const blocks = extractBlocks(html);
    const docxElements = [];
    
    for (const block of blocks) {
      const elements = processBlock(block);
      if (Array.isArray(elements)) {
        docxElements.push(...elements);
      }
    }
    
    // Garantizar que devolvemos un array
    return docxElements.length > 0 ? docxElements : createParagraphsFromText(stripHtml(html));
    
  } catch (error) {
    console.error('Error convirtiendo HTML a docx:', error);
    // En caso de error, devolver el texto sin formato como párrafos
    try {
      return createParagraphsFromText(stripHtml(html));
    } catch (fallbackError) {
      console.error('Error en fallback:', fallbackError);
      // Último recurso: devolver array vacío
      return [];
    }
  }
}

/**
 * Extrae bloques de contenido del HTML
 */
function extractBlocks(html) {
  const blocks = [];
  
  try {
    // Primero, extraer contenedores div principales
    const divRegex = /<div[^>]*>[\s\S]*?<\/div>/gi;
    const divMatches = html.match(divRegex) || [];
    
    divMatches.forEach(divContent => {
      blocks.push({
        type: 'container',
        content: divContent,
        style: extractDivStyle(divContent)
      });
    });
    
    // Luego, procesar contenido fuera de divs
    let remainingHtml = html;
    divMatches.forEach(div => {
      remainingHtml = remainingHtml.replace(div, '|||DIV|||');
    });
    
    // Dividir por párrafos y otros elementos de bloque
    const parts = remainingHtml.split(/(<\/?(p|br|ul|ol|li|blockquote)[^>]*>)/gi);
    
    let currentBlock = '';
    let currentType = 'text';
    
    for (const part of parts) {
      if (!part) continue;
      
      if (part === '|||DIV|||') {
        if (currentBlock.trim()) {
          blocks.push({ type: currentType, content: currentBlock });
        }
        currentBlock = '';
        currentType = 'text';
      } else if (part.match(/<(p|ul|ol|blockquote)/i)) {
        if (currentBlock.trim()) {
          blocks.push({ type: currentType, content: currentBlock });
        }
        const tagMatch = part.match(/<(\w+)/);
        currentType = tagMatch ? tagMatch[1].toLowerCase() : 'text';
        currentBlock = part;
      } else if (part.match(/<\/(p|ul|ol|blockquote)>/i)) {
        currentBlock += part;
        blocks.push({ type: currentType, content: currentBlock });
        currentBlock = '';
        currentType = 'text';
      } else if (part.match(/<br/i)) {
        if (currentBlock.trim()) {
          blocks.push({ type: currentType, content: currentBlock });
        }
        blocks.push({ type: 'break', content: '' });
        currentBlock = '';
      } else {
        currentBlock += part;
      }
    }
    
    if (currentBlock.trim()) {
      blocks.push({ type: currentType, content: currentBlock });
    }
    
    return blocks.filter(b => b.content || b.type === 'break');
    
  } catch (error) {
    console.error('Error extrayendo bloques:', error);
    return [{ type: 'text', content: html }];
  }
}

/**
 * Extrae el estilo de un div
 */
function extractDivStyle(divHtml) {
  try {
    const styleMatch = divHtml.match(/style="([^"]*)"/);
    if (!styleMatch) return {};
    
    const styleString = styleMatch[1];
    const styles = {};
    
    styleString.split(';').forEach(rule => {
      const colonIndex = rule.indexOf(':');
      if (colonIndex > 0) {
        const prop = rule.substring(0, colonIndex).trim();
        const value = rule.substring(colonIndex + 1).trim();
        if (prop && value) {
          styles[prop] = value;
        }
      }
    });
    
    return styles;
  } catch (error) {
    return {};
  }
}

/**
 * Procesa un bloque de contenido
 * SIEMPRE devuelve un array
 */
function processBlock(block) {
  const elements = [];
  
  try {
    switch (block.type) {
      case 'container':
        // Procesar contenedor con estilos
        const innerHtml = block.content
          .replace(/<div[^>]*>/, '')
          .replace(/<\/div>$/, '');
        const innerBlocks = extractBlocks(innerHtml);
        
        for (const innerBlock of innerBlocks) {
          const innerElements = processBlock(innerBlock);
          if (Array.isArray(innerElements)) {
            elements.push(...innerElements);
          }
        }
        break;
        
      case 'p':
      case 'text':
        const paragraph = createParagraphFromHtml(block.content);
        if (paragraph) elements.push(paragraph);
        break;
        
      case 'ul':
      case 'ol':
        const listItems = processListHtml(block.content, block.type);
        if (Array.isArray(listItems)) {
          elements.push(...listItems);
        }
        break;
        
      case 'blockquote':
        const quote = createBlockquote(block.content);
        if (quote) elements.push(quote);
        break;
        
      case 'break':
        elements.push(new Paragraph({ children: [] }));
        break;
        
      default:
        const defaultPara = createParagraphFromHtml(block.content);
        if (defaultPara) elements.push(defaultPara);
    }
  } catch (error) {
    console.error('Error procesando bloque:', error);
    // En caso de error, intentar crear un párrafo simple
    try {
      const fallbackPara = new Paragraph({
        children: [new TextRun({ text: stripHtml(block.content || '') })]
      });
      elements.push(fallbackPara);
    } catch (fallbackError) {
      console.error('Error en fallback de bloque:', fallbackError);
    }
  }
  
  // Garantizar que siempre devolvemos un array
  return elements;
}

/**
 * Crea un párrafo desde HTML
 */
function createParagraphFromHtml(html) {
  try {
    const runs = parseInlineHtml(html);
    if (!runs || runs.length === 0) return null;
    
    return new Paragraph({
      children: runs,
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200 }
    });
  } catch (error) {
    console.error('Error creando párrafo:', error);
    return null;
  }
}

/**
 * Parsea HTML inline para crear TextRuns
 * SIEMPRE devuelve un array
 */
function parseInlineHtml(html) {
  const runs = [];
  
  try {
    // Limpiar el HTML
    html = stripOuterTags(html);
    
    if (!html) return runs;
    
    // Regex mejorado para capturar elementos inline y texto
    const regex = /(<(?:strong|b|em|i|u|mark|span|code)[^>]*>.*?<\/(?:strong|b|em|i|u|mark|span|code)>|[^<]+)/gi;
    const matches = html.match(regex) || [html];
    
    for (const match of matches) {
      if (!match || !match.trim()) continue;
      
      if (match.startsWith('<')) {
        // Es un elemento con formato
        const { text, style } = extractTextAndStyle(match);
        if (text) {
          runs.push(new TextRun({
            text,
            ...style
          }));
        }
      } else {
        // Es texto plano
        const text = cleanText(match);
        if (text) {
          runs.push(new TextRun({ text }));
        }
      }
    }
  } catch (error) {
    console.error('Error parseando HTML inline:', error);
    // En caso de error, intentar devolver el texto sin formato
    try {
      const plainText = stripHtml(html);
      if (plainText) {
        runs.push(new TextRun({ text: plainText }));
      }
    } catch (fallbackError) {
      console.error('Error en fallback de parseInlineHtml:', fallbackError);
    }
  }
  
  return runs;
}

/**
 * Extrae texto y estilo de un elemento HTML
 */
function extractTextAndStyle(element) {
  try {
    // Extraer el tag y contenido
    const tagMatch = element.match(/<(\w+)([^>]*)>(.*?)<\/\1>/s);
    if (!tagMatch) {
      return { text: stripHtml(element), style: {} };
    }
    
    const [, tagName, attributes, content] = tagMatch;
    const text = stripHtml(content);
    const style = {};
    
    // Estilos por tag
    switch (tagName.toLowerCase()) {
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
        style.size = 20; // Tamaño ligeramente menor
        break;
    }
    
    // Estilos inline
    const styleMatch = attributes.match(/style="([^"]*)"/);
    if (styleMatch) {
      const inlineStyles = parseInlineStyles(styleMatch[1]);
      
      if (inlineStyles.color) {
        const normalizedColor = normalizeColor(inlineStyles.color);
        if (normalizedColor) {
          style.color = normalizedColor;
        }
      }
      
      if (inlineStyles['background-color']) {
        const highlight = getHighlightColor(inlineStyles['background-color']);
        if (highlight) {
          style.highlight = highlight;
        }
      }
      
      if (inlineStyles['font-weight'] === 'bold' || 
          inlineStyles['font-weight'] === '700' ||
          inlineStyles['font-weight'] === '600') {
        style.bold = true;
      }
      
      if (inlineStyles['text-decoration'] && 
          inlineStyles['text-decoration'].includes('underline')) {
        style.underline = { type: UnderlineType.SINGLE };
      }
    }
    
    return { text, style };
  } catch (error) {
    console.error('Error extrayendo texto y estilo:', error);
    return { text: stripHtml(element), style: {} };
  }
}

/**
 * Parsea estilos CSS inline
 */
function parseInlineStyles(styleString) {
  const styles = {};
  
  try {
    styleString.split(';').forEach(rule => {
      const colonIndex = rule.indexOf(':');
      if (colonIndex > 0) {
        const prop = rule.substring(0, colonIndex).trim();
        const value = rule.substring(colonIndex + 1).trim();
        if (prop && value) {
          styles[prop] = value;
        }
      }
    });
  } catch (error) {
    console.error('Error parseando estilos:', error);
  }
  
  return styles;
}

/**
 * Normaliza colores para Word
 */
function normalizeColor(color) {
  if (!color) return null;
  
  try {
    // Quitar # y espacios
    color = color.trim().replace('#', '');
    
    // Si es hex válido de 6 caracteres
    if (/^[0-9A-Fa-f]{6}$/.test(color)) {
      return color.toUpperCase();
    }
    
    // Si es hex de 3 caracteres, expandir
    if (/^[0-9A-Fa-f]{3}$/.test(color)) {
      return color.split('').map(c => c + c).join('').toUpperCase();
    }
    
    // Colores nombrados comunes
    const namedColors = {
      'red': 'FF0000',
      'blue': '0000FF',
      'green': '008000',
      'black': '000000',
      'white': 'FFFFFF',
      'yellow': 'FFFF00',
      'orange': 'FFA500',
      'purple': '800080'
    };
    
    return namedColors[color.toLowerCase()] || '000000';
  } catch (error) {
    return '000000';
  }
}

/**
 * Obtiene color de highlight para Word
 */
function getHighlightColor(bgColor) {
  if (!bgColor) return null;
  
  const colorMap = {
    '#ffd700': 'yellow',
    '#ffff00': 'yellow',
    '#fff3cd': 'yellow',
    '#ffffcc': 'yellow',
    '#87ceeb': 'cyan',
    '#e8f4fd': 'cyan',
    '#f0f8ff': 'cyan',
    '#98fb98': 'green',
    '#90ee90': 'green',
    '#ffe4e1': 'lightGray',
    '#f5f5f5': 'lightGray',
    '#ff6347': 'red',
    '#ffa500': 'yellow'
  };
  
  const normalized = bgColor.toLowerCase().trim();
  return colorMap[normalized] || null;
}

/**
 * Procesa listas HTML
 * SIEMPRE devuelve un array
 */
function processListHtml(html, type) {
  const items = [];
  
  try {
    const itemRegex = /<li[^>]*>(.*?)<\/li>/gis;
    let match;
    let index = 1;
    
    while ((match = itemRegex.exec(html)) !== null) {
      const itemContent = match[1];
      const runs = parseInlineHtml(itemContent);
      
      if (runs && runs.length > 0) {
        // Añadir bullet o número
        const bullet = type === 'ul' ? '• ' : `${index}. `;
        runs.unshift(new TextRun({ text: bullet, bold: true }));
        
        items.push(new Paragraph({
          children: runs,
          indent: { left: 360 },
          spacing: { after: 120 }
        }));
        
        index++;
      }
    }
  } catch (error) {
    console.error('Error procesando lista:', error);
  }
  
  return items;
}

/**
 * Crea un blockquote
 */
function createBlockquote(html) {
  try {
    const content = stripOuterTags(html);
    const runs = parseInlineHtml(content);
    
    if (!runs || runs.length === 0) return null;
    
    return new Paragraph({
      children: runs,
      indent: { left: 720 },
      italics: true,
      spacing: { after: 200 },
      shading: {
        fill: "E8E8E8"
      }
    });
  } catch (error) {
    console.error('Error creando blockquote:', error);
    return null;
  }
}

/**
 * Crea párrafos desde texto plano
 * SIEMPRE devuelve un array
 */
function createParagraphsFromText(text) {
  try {
    if (!text) return [];
    
    const lines = text.split(/\n+/);
    const paragraphs = lines
      .filter(line => line.trim())
      .map(line => {
        try {
          return new Paragraph({
            children: [new TextRun({ text: line.trim() })],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          });
        } catch (error) {
          console.error('Error creando párrafo de texto:', error);
          return null;
        }
      })
      .filter(p => p !== null);
    
    return paragraphs.length > 0 ? paragraphs : [];
  } catch (error) {
    console.error('Error en createParagraphsFromText:', error);
    return [];
  }
}

/**
 * Limpia texto
 */
function cleanText(text) {
  if (!text) return '';
  
  try {
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  } catch (error) {
    return String(text).trim();
  }
}

/**
 * Elimina tags HTML
 */
function stripHtml(html) {
  if (!html) return '';
  
  try {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  } catch (error) {
    return String(html).trim();
  }
}

/**
 * Elimina tags externos manteniendo el contenido
 */
function stripOuterTags(html) {
  if (!html) return '';
  
  try {
    return html
      .replace(/^<[^>]+>/, '')
      .replace(/<\/[^>]+>$/, '')
      .trim();
  } catch (error) {
    return String(html).trim();
  }
}

// IMPORTANTE: Solo exportar como named export, NO como default
export { htmlToDocxElements };