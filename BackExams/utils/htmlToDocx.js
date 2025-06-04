// BackExams/utils/htmlToDocx.js - VERSIÓN ACTUALIZADA PARA CONTENEDORES
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
 * Convierte HTML enriquecido con contenedores a elementos de docx
 * @param {string} html - El HTML a convertir
 * @returns {Array} - Array de elementos docx (Paragraphs)
 */
export function htmlToDocxElements(html) {
  if (!html) return [];
  
  // Limpiar HTML problemático antes de procesar
  html = html.trim();
  // Decodificar entidades HTML
  html = he.decode(html);
  
  // Arreglar HTML mal formado común
  html = html.replace(/<span([^>]*?)\/>/g, '<span$1></span>');
  html = html.replace(/<strong([^>]*?)\/>/g, '<strong$1></strong>');
  
  const elements = [];
  
  try {
    // Detectar si el HTML tiene un contenedor div principal
    const containerMatch = html.match(/<div\s+style="([^"]*)">([\s\S]*?)<\/div>/i);
    
    if (containerMatch) {
      const containerStyle = containerMatch[1];
      const innerContent = containerMatch[2];
      
      // Extraer colores del contenedor
      const borderColorMatch = containerStyle.match(/border-left:\s*6px\s+solid\s+([^;]+)/i);
      const bgColorMatch = containerStyle.match(/background-color:\s*([^;]+)/i);
      
      let borderColor = null;
      let borderStyle = null;
      
      if (borderColorMatch) {
        borderColor = convertColorForWord(borderColorMatch[1].trim());
        
        // Determinar el tipo de contenedor por el color
        const colorHex = borderColorMatch[1].trim().toLowerCase();
        if (colorHex === '#dc3545' || colorHex.includes('dc3545')) {
          // Rojo - Jurídicas
          borderStyle = {
            left: {
              color: borderColor || 'DC3545',
              size: 18, // 6px ≈ 18 twips
              style: BorderStyle.SINGLE
            }
          };
        } else if (colorHex === '#0073e6' || colorHex.includes('0073e6')) {
          // Azul - Sociales
          borderStyle = {
            left: {
              color: borderColor || '0073E6',
              size: 18,
              style: BorderStyle.SINGLE
            }
          };
        } else if (colorHex === '#28a745' || colorHex.includes('28a745')) {
          // Verde - Técnicas
          borderStyle = {
            left: {
              color: borderColor || '28A745',
              size: 18,
              style: BorderStyle.SINGLE
            }
          };
        }
      }
      
      // Procesar el contenido interno del contenedor
      const innerElements = processHtmlContent(innerContent, borderStyle);
      elements.push(...innerElements);
      
    } else {
      // Si no hay contenedor, procesar normalmente
      const processedElements = processHtmlContent(html);
      elements.push(...processedElements);
    }
    
  } catch (e) {
    console.error('Error general en htmlToDocxElements:', e);
    // Fallback: devolver el texto sin HTML
    const plainText = html.replace(/<[^>]*>/g, '').trim();
    if (plainText) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: plainText })],
          alignment: AlignmentType.JUSTIFIED
        })
      );
    }
  }
  
  return elements;
}

/**
 * Procesa contenido HTML interno con soporte para bordes
 * @param {string} html - HTML a procesar
 * @param {Object} borderStyle - Estilo de borde opcional
 * @returns {Array} - Array de Paragraphs
 */
function processHtmlContent(html, borderStyle = null) {
  const elements = [];
  
  // Dividir por párrafos y elementos de bloque
  const paragraphs = html.split(/(?:<\/p>|<\/div>|<\/blockquote>|<br\s*\/?>)/gi);
  
  paragraphs.forEach((paragraphHtml, index) => {
    try {
      paragraphHtml = paragraphHtml.replace(/<p[^>]*>/gi, '').trim();
      paragraphHtml = paragraphHtml.replace(/<blockquote[^>]*>/gi, '').trim();
      
      if (!paragraphHtml) return;
      
      // Configuración base del párrafo
      const paragraphOptions = {
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200 }
      };
      
      // Aplicar borde y padding si es necesario
      if (borderStyle && index === 0) {
        // Solo aplicar borde al primer párrafo
        paragraphOptions.border = borderStyle;
        paragraphOptions.indent = { left: 360 }; // Padding izquierdo
      } else if (borderStyle) {
        // Párrafos subsiguientes solo con padding
        paragraphOptions.indent = { left: 360 };
      }
      
      // Manejo de listas
      if (paragraphHtml.includes('<ul>') || paragraphHtml.includes('<ol>')) {
        const listItems = paragraphHtml.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
        const ordered = paragraphHtml.includes('<ol>');
        let counter = 1;
        
        listItems.forEach(item => {
          try {
            const cleanItem = item.replace(/<\/?li[^>]*>/gi, '').trim();
            const listRuns = parseInlineHtml(cleanItem);
            if (listRuns.length > 0) {
              const listParagraph = {
                children: [
                  new TextRun({ text: ordered ? `${counter}. ` : '• ', bold: true }),
                  ...listRuns
                ],
                indent: { left: borderStyle ? 720 : 360 }, // Más indent si hay borde
                spacing: { after: 120 }
              };
              
              // Aplicar borde continuo a items de lista si es necesario
              if (borderStyle) {
                listParagraph.border = borderStyle;
              }
              
              elements.push(new Paragraph(listParagraph));
              if (ordered) counter++;
            }
          } catch (e) {
            console.error('Error procesando item de lista:', e);
          }
        });
      } else {
        // Párrafo normal
        const runs = parseInlineHtml(paragraphHtml);
        if (runs.length > 0) {
          elements.push(new Paragraph({
            ...paragraphOptions,
            children: runs
          }));
        }
      }
    } catch (e) {
      console.error('Error procesando párrafo:', e);
      // Si hay error, intentar crear un párrafo simple con el texto
      const plainText = paragraphHtml.replace(/<[^>]*>/g, '').trim();
      if (plainText) {
        elements.push(
          new Paragraph({
            children: [new TextRun({ text: plainText })],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 200 },
            ...(borderStyle && index === 0 ? { border: borderStyle, indent: { left: 360 } } : {})
          })
        );
      }
    }
  });
  
  return elements;
}

/**
 * Parsea HTML inline con manejo robusto de errores
 * @param {string} html - HTML con formato inline
 * @returns {Array<TextRun>} - Array de TextRuns
 */
function parseInlineHtml(html) {
  const runs = [];
  
  try {
    // Regex mejorado para capturar todos los elementos HTML
    const regex = /(<span[^>]*>|<\/span>|<strong[^>]*>|<\/strong>|<b>|<\/b>|<em>|<\/em>|<i>|<\/i>|<u>|<\/u>|<mark[^>]*>|<\/mark>|<code[^>]*>|<\/code>|[^<]+)/gi;
    
    // Estilo base por defecto
    const baseStyle = {
      bold: false,
      italic: false,
      underline: false,
      color: null,
      highlight: false
    };
    
    let styleStack = [{ ...baseStyle }];
    let openTags = 0;
    
    const matches = html.match(regex) || [];
    
    matches.forEach(match => {
      try {
        // Asegurar que siempre haya al menos un estilo en el stack
        if (styleStack.length === 0) {
          styleStack.push({ ...baseStyle });
        }
        
        const currentStyle = styleStack[styleStack.length - 1];
        
        // Manejar apertura de tags
        if (match === '<strong>' || match.startsWith('<strong') || match === '<b>') {
          styleStack.push({ ...currentStyle, bold: true });
          openTags++;
        } else if (match === '</strong>' || match === '</b>') {
          if (styleStack.length > 1) styleStack.pop();
          openTags--;
        } else if (match === '<em>' || match === '<i>') {
          styleStack.push({ ...currentStyle, italic: true });
          openTags++;
        } else if (match === '</em>' || match === '</i>') {
          if (styleStack.length > 1) styleStack.pop();
          openTags--;
        } else if (match === '<u>') {
          styleStack.push({ ...currentStyle, underline: true });
          openTags++;
        } else if (match === '</u>') {
          if (styleStack.length > 1) styleStack.pop();
          openTags--;
        } else if (match.startsWith('<mark')) {
          styleStack.push({ ...currentStyle, highlight: true });
          openTags++;
        } else if (match === '</mark>') {
          if (styleStack.length > 1) styleStack.pop();
          openTags--;
        } else if (match.startsWith('<span')) {
          const newStyle = { ...currentStyle };
          
          // Extraer estilos del span
          const styleMatch = match.match(/style="([^"]*)"/);
          if (styleMatch) {
            const styles = styleMatch[1];
            
            // Extraer color
            const colorMatch = styles.match(/color:\s*([^;]+)/);
            if (colorMatch) {
              newStyle.color = convertColorForWord(colorMatch[1].trim());
            }
            
            // Extraer background-color
            const bgMatch = styles.match(/background-color:\s*([^;]+)/);
            if (bgMatch) {
              const bgColor = bgMatch[1].trim().toLowerCase();
              // Convertir colores específicos a highlight de Word
              if (bgColor === '#ffd700' || bgColor === '#ffff00' || bgColor.includes('yellow')) {
                newStyle.highlight = 'yellow';
              } else if (bgColor === '#87ceeb' || bgColor.includes('87ceeb')) {
                newStyle.highlight = 'lightBlue';
              } else if (bgColor === '#98fb98' || bgColor.includes('98fb98')) {
                newStyle.highlight = 'lightGreen';
              } else if (bgColor === '#ffe4e1' || bgColor.includes('ffe4e1')) {
                newStyle.highlight = 'lightGray';
              } else if (bgColor === '#ffa500' || bgColor.includes('orange')) {
                newStyle.highlight = 'yellow';
              } else if (bgColor === '#ff6347' || bgColor.includes('ff6347')) {
                newStyle.highlight = 'red';
              }
            }
            
            // Detectar bold por font-weight
            if (styles.includes('font-weight') && 
                (styles.includes('bold') || styles.includes('600') || styles.includes('700'))) {
              newStyle.bold = true;
            }
            
            // Detectar underline
            if (styles.includes('text-decoration') && styles.includes('underline')) {
              newStyle.underline = true;
            }
          }
          
          styleStack.push(newStyle);
          openTags++;
        } else if (match === '</span>') {
          if (styleStack.length > 1) styleStack.pop();
          openTags--;
        } else if (!match.startsWith('<')) {
          // Es texto, crear TextRun con el estilo actual
          const style = styleStack[styleStack.length - 1] || baseStyle;
          const runOptions = {
            text: match,
            bold: style.bold || false,
            italics: style.italic || false
          };
          
          // Aplicar subrayado
          if (style.underline) {
            runOptions.underline = { type: UnderlineType.SINGLE };
          }
          
          // Aplicar color
          if (style.color) {
            runOptions.color = style.color;
          }
          
          // Aplicar highlight
          if (style.highlight) {
            runOptions.highlight = style.highlight;
          }
          
          // Solo crear el TextRun si hay texto real
          if (match.trim()) {
            runs.push(new TextRun(runOptions));
          }
        }
      } catch (e) {
        console.error('Error procesando match:', match, e);
        // Si hay error, intentar agregar el texto sin formato
        if (!match.startsWith('<') && match.trim()) {
          runs.push(new TextRun({ text: match }));
        }
      }
    });
    
  } catch (e) {
    console.error('Error en parseInlineHtml:', e);
  }
  
  // Si no hay runs y hay contenido, devolver el texto limpio
  if (runs.length === 0 && html) {
    const plainText = html.replace(/<[^>]*>/g, '').trim();
    if (plainText) {
      runs.push(new TextRun({ text: plainText }));
    }
  }
  
  return runs;
}

/**
 * Convierte colores CSS a formato Word
 * @param {string} color - Color en formato CSS
 * @returns {string} - Color en formato hexadecimal para Word
 */
function convertColorForWord(color) {
  if (!color) return null;
  
  try {
    color = color.toLowerCase().trim();
    
    // Mapa de conversión de colores
    const colorConversions = {
      // Colores del sistema de contenedores
      '#dc3545': 'DC3545', // Rojo (Jurídicas)
      '#0073e6': '0073E6', // Azul (Sociales)
      '#28a745': '28A745', // Verde (Técnicas)
      '#6c757d': '6C757D', // Gris (General)
      
      // Colores de highlights
      '#ffd700': 'FFD700', // Oro
      '#87ceeb': '87CEEB', // Azul cielo
      '#98fb98': '98FB98', // Verde claro
      '#ffe4e1': 'FFE4E1', // Rosa claro
      '#ffa500': 'FFA500', // Naranja
      '#ff6347': 'FF6347', // Rojo tomate
      
      // Colores muy claros → Colores oscuros equivalentes
      '#fff3cd': 'B8860B', // Amarillo muy claro → Dorado oscuro
      '#f8f9ff': '000080', // Azul muy claro → Azul marino
      '#e8f4fd': '0066CC', // Azul pastel → Azul estándar
      '#e9ecef': '666666', // Gris muy claro → Gris medio
      '#d4edda': '006400', // Verde muy claro → Verde oscuro
      '#f8d7da': '8B0000', // Rosa claro → Rojo oscuro
      '#fff': '000000',    // Blanco → Negro
      '#ffffff': '000000', // Blanco → Negro
      
      // Colores del sistema actual → Versiones más oscuras
      '#0066cc': '000080', // Azul → Azul marino
      '#000080': '000080', // Azul marino
      '#006400': '006400', // Verde oscuro
      '#8b0000': '8B0000', // Rojo oscuro
      '#cc5500': 'CC5500', // Naranja oscuro
      '#4b0082': '4B0082', // Índigo
      '#8b4513': '8B4513', // Marrón
      
      // Colores CSS estándar
      'white': '000000',
      'lightblue': '000080',
      'lightgreen': '006400',
      'lightgray': '666666',
      'lightgrey': '666666',
      'red': '8B0000',
      'green': '006400',
      'blue': '000080',
      'orange': 'CC5500',
      'yellow': 'B8860B',
      'gray': '666666',
      'grey': '666666'
    };
    
    // Si está en el mapa de conversión, usar el color convertido
    if (colorConversions[color]) {
      return colorConversions[color];
    }
    
    // Si es hexadecimal
    if (color.startsWith('#')) {
      let hex = color.replace('#', '').toUpperCase();
      
      // Validar hex
      if (/^[0-9A-F]{6}$/i.test(hex)) {
        return hex;
      } else if (/^[0-9A-F]{3}$/i.test(hex)) {
        // Expandir hex corto
        return hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
    }
    
    // Si es rgb()
    const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      const hex = [r, g, b]
        .map(val => parseInt(val, 10).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      
      return hex;
    }
  } catch (e) {
    console.error('Error convirtiendo color:', color, e);
  }
  
  // Por defecto, usar negro
  return '000000';
}

export default htmlToDocxElements;