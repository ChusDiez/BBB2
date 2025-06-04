// BackExams/utils/htmlToDocx.js - VERSIÓN ROBUSTA PARA HTML ENRIQUECIDO
import docx from 'docx';

const { 
  Paragraph, 
  TextRun, 
  AlignmentType,
  UnderlineType,
  HeadingLevel
} = docx;

/**
 * Convierte HTML enriquecido a elementos docx
 * Maneja contenedores complejos y HTML con estilos inline
 */
export function htmlToDocxElements(html) {
  if (!html || typeof html !== 'string') return [];
  
  try {
    // Limpiar el HTML pero preservar la estructura
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
      docxElements.push(...elements);
    }
    
    return docxElements.length > 0 ? docxElements : createParagraphsFromText(html);
    
  } catch (error) {
    console.error('Error convirtiendo HTML a docx:', error);
    // Fallback seguro
    return createParagraphsFromText(stripHtml(html));
  }
}

/**
 * Extrae bloques de contenido del HTML
 */
function extractBlocks(html) {
  const blocks = [];
  
  // Primero, extraer contenedores div principales
  const divRegex = /<div[^>]*>[\s\S]*?<\/div>/gi;
  const divMatches = html.match(divRegex);
  
  if (divMatches) {
    divMatches.forEach(divContent => {
      blocks.push({
        type: 'container',
        content: divContent,
        style: extractDivStyle(divContent)
      });
    });
  }
  
  // Luego, procesar contenido fuera de divs
  let remainingHtml = html;
  if (divMatches) {
    divMatches.forEach(div => {
      remainingHtml = remainingHtml.replace(div, '|||DIV|||');
    });
  }
  
  // Dividir por párrafos y otros elementos de bloque
  const parts = remainingHtml.split(/(<\/?(p|br|ul|ol|li|blockquote)[^>]*>)/gi);
  
  let currentBlock = '';
  let currentType = 'text';
  
  for (const part of parts) {
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
      currentType = part.match(/<(\w+)/)[1].toLowerCase();
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
}

/**
 * Extrae el estilo de un div
 */
function extractDivStyle(divHtml) {
  const styleMatch = divHtml.match(/style="([^"]*)"/);
  if (!styleMatch) return {};
  
  const styleString = styleMatch[1];
  const styles = {};
  
  styleString.split(';').forEach(rule => {
    const [prop, value] = rule.split(':').map(s => s.trim());
    if (prop && value) {
      styles[prop] = value;
    }
  });
  
  return styles;
}

/**
 * Procesa un bloque de contenido
 */
function processBlock(block) {
  const elements = [];
  
  switch (block.type) {
    case 'container':
      // Procesar contenedor con estilos
      const innerHtml = block.content.replace(/<div[^>]*>/, '').replace(/<\/div>$/, '');
      const innerBlocks = extractBlocks(innerHtml);
      
      // Aplicar estilo del contenedor a los elementos internos
      for (const innerBlock of innerBlocks) {
        const innerElements = processBlock(innerBlock);
        // Aquí podrías aplicar estilos del contenedor si es necesario
        elements.push(...innerElements);
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
      elements.push(...listItems);
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
  
  return elements;
}

/**
 * Crea un párrafo desde HTML
 */
function createParagraphFromHtml(html) {
  const runs = parseInlineHtml(html);
  if (runs.length === 0) return null;
  
  return new Paragraph({
    children: runs,
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 200 }
  });
}

/**
 * Parsea HTML inline para crear TextRuns
 */
function parseInlineHtml(html) {
  const runs = [];
  
  // Limpiar el HTML
  html = stripOuterTags(html);
  
  // Regex mejorado para capturar elementos inline y texto
  const regex = /(<(?:strong|b|em|i|u|mark|span|code)[^>]*>.*?<\/(?:strong|b|em|i|u|mark|span|code)>|[^<]+)/gi;
  const matches = html.match(regex) || [html];
  
  for (const match of matches) {
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
  
  return runs;
}

/**
 * Extrae texto y estilo de un elemento HTML
 */
function extractTextAndStyle(element) {
  // Extraer el tag y contenido
  const tagMatch = element.match(/<(\w+)([^>]*)>(.*?)<\/\1>/s);
  if (!tagMatch) return { text: stripHtml(element), style: {} };
  
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
      break;
  }
  
  // Estilos inline
  const styleMatch = attributes.match(/style="([^"]*)"/);
  if (styleMatch) {
    const inlineStyles = parseInlineStyles(styleMatch[1]);
    
    if (inlineStyles.color) {
      style.color = normalizeColor(inlineStyles.color);
    }
    
    if (inlineStyles['background-color']) {
      style.highlight = getHighlightColor(inlineStyles['background-color']);
    }
    
    if (inlineStyles['font-weight'] === 'bold' || 
        inlineStyles['font-weight'] >= 600) {
      style.bold = true;
    }
  }
  
  return { text, style };
}

/**
 * Parsea estilos CSS inline
 */
function parseInlineStyles(styleString) {
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
}

/**
 * Normaliza colores para Word
 */
function normalizeColor(color) {
  if (!color) return null;
  
  // Quitar # y espacios
  color = color.trim().replace('#', '');
  
  // Si es hex válido de 6 caracteres
  if (/^[0-9A-Fa-f]{6}$/.test(color)) {
    return color.toUpperCase();
  }
  
  // Colores nombrados comunes
  const namedColors = {
    'red': 'FF0000',
    'blue': '0000FF',
    'green': '008000',
    'black': '000000',
    'white': 'FFFFFF'
  };
  
  return namedColors[color.toLowerCase()] || '000000';
}

/**
 * Obtiene color de highlight para Word
 */
function getHighlightColor(bgColor) {
  const colorMap = {
    '#ffd700': 'yellow',
    '#ffff00': 'yellow',
    '#fff3cd': 'yellow',
    '#87ceeb': 'cyan',
    '#e8f4fd': 'cyan',
    '#98fb98': 'green',
    '#ffe4e1': 'lightGray',
    '#ff6347': 'red'
  };
  
  return colorMap[bgColor.toLowerCase()] || null;
}

/**
 * Procesa listas HTML
 */
function processListHtml(html, type) {
  const items = [];
  const itemRegex = /<li[^>]*>(.*?)<\/li>/gis;
  let match;
  let index = 1;
  
  while ((match = itemRegex.exec(html)) !== null) {
    const itemContent = match[1];
    const runs = parseInlineHtml(itemContent);
    
    if (runs.length > 0) {
      // Añadir bullet o número
      const bullet = type === 'ul' ? '• ' : `${index}. `;
      runs.unshift(new TextRun({ text: bullet }));
      
      items.push(new Paragraph({
        children: runs,
        indent: { left: 360 },
        spacing: { after: 120 }
      }));
      
      index++;
    }
  }
  
  return items;
}

/**
 * Crea un blockquote
 */
function createBlockquote(html) {
  const content = stripOuterTags(html);
  const runs = parseInlineHtml(content);
  
  if (runs.length === 0) return null;
  
  return new Paragraph({
    children: runs,
    indent: { left: 720 },
    italics: true,
    spacing: { after: 200 }
  });
}

/**
 * Crea párrafos desde texto plano
 */
function createParagraphsFromText(text) {
  const lines = text.split(/\n+/);
  return lines
    .filter(line => line.trim())
    .map(line => new Paragraph({
      children: [new TextRun({ text: line.trim() })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 200 }
    }));
}

/**
 * Limpia texto
 */
function cleanText(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Elimina tags HTML
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * Elimina tags externos manteniendo el contenido
 */
function stripOuterTags(html) {
  // Eliminar tags de apertura y cierre externos
  return html
    .replace(/^<[^>]+>/, '')
    .replace(/<\/[^>]+>$/, '')
    .trim();
}

export default htmlToDocxElements;