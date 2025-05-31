// BackExams/utils/htmlToDocx.js - VERSIÓN MEJORADA
import { 
  Paragraph, 
  TextRun, 
  AlignmentType,
  UnderlineType
} from 'docx';

/**
 * Convierte HTML enriquecido semánticamente a elementos de docx
 * @param {string} html - El HTML a convertir
 * @returns {Array} - Array de elementos docx (Paragraphs)
 */
export function htmlToDocxElements(html) {
  if (!html) return [];
  
  html = html.trim();
  const elements = [];
  
  // Dividir por párrafos y elementos de bloque
  const paragraphs = html.split(/(?:<\/p>|<br\s*\/?>)/gi);
  
  paragraphs.forEach(paragraphHtml => {
    paragraphHtml = paragraphHtml.replace(/<p[^>]*>/gi, '').trim();
    
    if (!paragraphHtml) return;
    
    // Manejo de listas
    if (paragraphHtml.includes('<ul>') || paragraphHtml.includes('<li>')) {
      const listItems = paragraphHtml.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
      listItems.forEach(item => {
        const cleanItem = item.replace(/<\/?li[^>]*>/gi, '').trim();
        const listRuns = parseInlineHtml(cleanItem);
        elements.push(
          new Paragraph({
            children: [
              new TextRun({ text: '• ', bold: true, color: '0066CC' }),
              ...listRuns
            ],
            indent: { left: 360 },
            spacing: { after: 120 }
          })
        );
      });
    } 
    // Manejo de blockquotes
    else if (paragraphHtml.includes('<blockquote>')) {
      const cleanQuote = paragraphHtml.replace(/<\/?blockquote[^>]*>/gi, '').trim();
      const quoteRuns = parseInlineHtml(cleanQuote);
      elements.push(
        new Paragraph({
          children: quoteRuns,
          indent: { left: 720, right: 360 },
          italics: true,
          spacing: { after: 200 },
          border: {
            left: {
              color: '0066CC',
              size: 6,
              style: 'single'
            }
          }
        })
      );
    }
    // Párrafo normal
    else {
      const runs = parseInlineHtml(paragraphHtml);
      if (runs.length > 0) {
        elements.push(
          new Paragraph({
            children: runs,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 }
          })
        );
      }
    }
  });
  
  return elements;
}

/**
 * Parsea HTML inline con estilos semánticos avanzados
 * @param {string} html - HTML con formato inline
 * @returns {Array<TextRun>} - Array de TextRuns
 */
function parseInlineHtml(html) {
  const runs = [];
  
  // Regex más complejo para capturar todos los elementos
  const regex = /(<span[^>]*>|<\/span>|<strong>|<\/strong>|<b>|<\/b>|<em>|<\/em>|<i>|<\/i>|<u>|<\/u>|<mark[^>]*>|<\/mark>|[^<]+)/gi;
  
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let currentColor = null;
  let currentBackground = null;
  let isHighlighted = false;
  let spanStack = []; // Para manejar spans anidados
  
  const matches = html.match(regex) || [];
  
  matches.forEach(match => {
    // Detectar apertura/cierre de tags básicos
    if (match === '<strong>' || match === '<b>') {
      isBold = true;
    } else if (match === '</strong>' || match === '</b>') {
      isBold = false;
    } else if (match === '<em>' || match === '<i>') {
      isItalic = true;
    } else if (match === '</em>' || match === '</i>') {
      isItalic = false;
    } else if (match === '<u>') {
      isUnderline = true;
    } else if (match === '</u>') {
      isUnderline = false;
    } 
    // Manejo de mark con estilos
    else if (match.startsWith('<mark')) {
      isHighlighted = true;
      const bgMatch = match.match(/background-color:\s*([^;"]+)/);
      if (bgMatch) {
        currentBackground = bgMatch[1].trim();
      }
    } else if (match === '</mark>') {
      isHighlighted = false;
      currentBackground = null;
    }
    // Manejo de spans con estilos complejos
    else if (match.startsWith('<span')) {
      const spanInfo = parseSpanStyle(match);
      spanStack.push(spanInfo);
      
      // Aplicar estilos del span actual
      if (spanInfo.color) currentColor = spanInfo.color;
      if (spanInfo.background) currentBackground = spanInfo.background;
      if (spanInfo.underline) isUnderline = true;
      if (spanInfo.bold) isBold = true;
    } else if (match === '</span>') {
      // Cerrar el span más reciente
      if (spanStack.length > 0) {
        spanStack.pop();
        
        // Restaurar estilos del span anterior o resetear
        if (spanStack.length > 0) {
          const previousSpan = spanStack[spanStack.length - 1];
          currentColor = previousSpan.color;
          currentBackground = previousSpan.background;
          isUnderline = previousSpan.underline;
          isBold = previousSpan.bold;
        } else {
          currentColor = null;
          currentBackground = null;
          isUnderline = false;
          // No resetear isBold aquí porque podría estar por strong/b
        }
      }
    } else if (!match.startsWith('<')) {
      // Es texto, crear TextRun con el formato actual
      const runOptions = {
        text: match,
        bold: isBold,
        italics: isItalic
      };
      
      // Aplicar subrayado
      if (isUnderline) {
        runOptions.underline = { type: UnderlineType.SINGLE };
      }
      
      // Aplicar color
      if (currentColor) {
        runOptions.color = normalizeColor(currentColor);
      }
      
      // Aplicar resaltado/fondo
      if (isHighlighted || currentBackground) {
        const bgColor = normalizeBackgroundColor(currentBackground);
        if (bgColor) {
          runOptions.highlight = bgColor;
        }
      }
      
      runs.push(new TextRun(runOptions));
    }
  });
  
  // Si no hay runs, devolver al menos el texto limpio
  if (runs.length === 0 && html) {
    runs.push(new TextRun({ text: html.replace(/<[^>]*>/g, '') }));
  }
  
  return runs;
}

/**
 * Parsea los estilos de un elemento span
 * @param {string} spanTag - El tag span completo
 * @returns {Object} - Objeto con los estilos parseados
 */
function parseSpanStyle(spanTag) {
  const styles = {
    color: null,
    background: null,
    underline: false,
    bold: false
  };
  
  // Extraer color
  const colorMatch = spanTag.match(/color:\s*([^;"]+)/);
  if (colorMatch) {
    styles.color = colorMatch[1].trim();
  }
  
  // Extraer background-color
  const bgMatch = spanTag.match(/background-color:\s*([^;"]+)/);
  if (bgMatch) {
    styles.background = bgMatch[1].trim();
  }
  
  // Detectar text-decoration: underline
  if (spanTag.includes('text-decoration') && spanTag.includes('underline')) {
    styles.underline = true;
  }
  
  // Detectar font-weight: bold/600
  if (spanTag.includes('font-weight') && (spanTag.includes('bold') || spanTag.includes('600'))) {
    styles.bold = true;
  }
  
  return styles;
}

/**
 * Normaliza colores CSS para Word
 * @param {string} color - Color en formato CSS
 * @returns {string} - Color en formato hexadecimal para Word
 */
function normalizeColor(color) {
  const colorMap = {
    // Colores del sistema de enriquecimiento
    '#0066cc': '0066CC', // Azul para artículos
    '#28a745': '28A745', // Verde para conceptos técnicos
    '#fd7e14': 'FD7E14', // Naranja para datos numéricos
    '#dc3545': 'DC3545', // Rojo para elementos críticos
    
    // Colores CSS estándar
    'red': 'FF0000',
    'green': '00FF00',
    'blue': '0000FF',
    'orange': 'FFA500',
    'purple': '800080',
    'black': '000000'
  };
  
  // Si ya es hexadecimal, limpiarlo
  if (color.startsWith('#')) {
    return color.replace('#', '').toUpperCase();
  }
  
  return colorMap[color] || '000000';
}

/**
 * Normaliza colores de fondo para highlight en Word
 * @param {string} background - Color de fondo en formato CSS
 * @returns {string} - Color de highlight para Word
 */
function normalizeBackgroundColor(background) {
  if (!background) return null;
  
  const backgroundMap = {
    '#fff3cd': 'yellow',      // Amarillo pastel para leyes
    '#f8f9ff': 'lightBlue',   // Azul claro para definiciones
    '#e9ecef': 'lightGray',   // Gris claro para términos importantes
    '#d4edda': 'lightGreen',  // Verde claro
    'yellow': 'yellow',
    'lightgray': 'lightGray',
    'lightblue': 'lightBlue'
  };
  
  return backgroundMap[background] || 'yellow';
}

export default htmlToDocxElements;