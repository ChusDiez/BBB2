// BackExams/utils/htmlToDocx.js - VERSIÓN CORREGIDA Y ROBUSTA
import docx from 'docx';
import he from 'he'; // Para decodificar entidades HTML (&nbsp;, &amp;, etc.)

const { 
  Paragraph, 
  TextRun, 
  AlignmentType,
  UnderlineType
} = docx;

/**
 * Convierte HTML enriquecido a elementos de docx con manejo robusto de errores
 * @param {string} html - El HTML a convertir
 * @returns {Array} - Array de elementos docx (Paragraphs)
 */
export function htmlToDocxElements(html) {
  if (!html) return [];
  
  // Limpiar HTML problemático antes de procesar
  html = html.trim();
  // Decodificar entidades (&nbsp;, &amp;, etc.)
  html = he.decode(html);
  
  // Arreglar HTML mal formado común
  html = html.replace(/<span([^>]*?)\/>/g, '<span$1></span>'); // Cerrar spans auto-cerrados
  html = html.replace(/<strong([^>]*?)\/>/g, '<strong$1></strong>'); // Cerrar strongs auto-cerrados
  
  const elements = [];
  
  try {
    // Dividir por párrafos y elementos de bloque
    const paragraphs = html.split(/(?:<\/p>|<\/div>|<\/blockquote>|<\/li>\s*<\/ul>|<\/li>\s*<\/ol>|<br\s*\/?>)/gi);
    
    paragraphs.forEach(paragraphHtml => {
      try {
        paragraphHtml = paragraphHtml.replace(/<p[^>]*>/gi, '').trim();
        paragraphHtml = paragraphHtml.replace(/<blockquote[^>]*>/gi, '').trim();
        
        if (!paragraphHtml) return;
        
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
                elements.push(
                  new Paragraph({
                    children: [
                      new TextRun({ text: ordered ? `${counter}. ` : '• ', bold: true }),
                      ...listRuns
                    ],
                    indent: { left: 360 },
                    spacing: { after: 120 }
                  })
                );
                if (ordered) counter++;
              }
            } catch (e) {
              console.error('Error procesando item de lista:', e);
            }
          });
          if (ordered) counter = 1; // reset for next paragraph
        } else {
          // Párrafo normal
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
      } catch (e) {
        console.error('Error procesando párrafo:', e);
        // Si hay error, intentar crear un párrafo simple con el texto
        const plainText = paragraphHtml.replace(/<[^>]*>/g, '').trim();
        if (plainText) {
          elements.push(
            new Paragraph({
              children: [new TextRun({ text: plainText })],
              alignment: AlignmentType.JUSTIFIED,
              spacing: { after: 200 }
            })
          );
        }
      }
    });
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
    let openTags = 0; // Contador para verificar balance de tags
    
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
        } else if (match.startsWith('<code')) {
          styleStack.push({ ...currentStyle, color: '8B0000' });
          openTags++;
        } else if (match === '</code>') {
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
            
            // Extraer background-color y convertir a highlight
            const bgMatch = styles.match(/background-color:\s*([^;]+)/);
            if (bgMatch) {
              const bgColor = bgMatch[1].trim().toLowerCase();
              if (bgColor.match(/^#?ff(f3cd|eb3b|fd)$/) || bgColor.includes('yellow')) {
                newStyle.highlight = true;
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
          
          // Aplicar color (convertido para mejor visibilidad)
          if (style.color) {
            runOptions.color = style.color;
          }
          
          // Aplicar highlight (amarillo)
          if (style.highlight) {
            runOptions.highlight = 'yellow';
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
    
    // Si los tags no están balanceados, resetear el stack
    if (openTags !== 0) {
      console.warn(`Tags desbalanceados detectados (${openTags}). Se insertará texto plano para evitar errores de formato.`);
      const plain = html.replace(/<[^>]*>/g, '').trim();
      if (plain) {
        runs.length = 0; // limpiar cualquier run incorrecto
        runs.push(new TextRun({ text: plain }));
      }
    }
    
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
 * Convierte colores problemáticos a colores visibles en Word
 * @param {string} color - Color en formato CSS
 * @returns {string} - Color en formato hexadecimal para Word
 */
function convertColorForWord(color) {
  if (!color) return null;
  
  try {
    color = color.toLowerCase().trim();
    
    // Mapa de conversión de colores problemáticos a colores visibles
    const colorConversions = {
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
      '#28a745': '006400', // Verde → Verde oscuro
      '#fd7e14': 'CC5500', // Naranja → Naranja oscuro
      '#dc3545': '8B0000', // Rojo → Rojo oscuro
      '#1565c0': '000080', // Azul claro → Azul marino
      '#6c757d': '333333', // Gris → Gris oscuro
      
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
        // Si es un color muy claro (alto valor de luminosidad), oscurecerlo
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Calcular luminosidad
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Si es muy claro (luminosidad > 0.8), convertir a un gris oscuro
        if (luminance > 0.8) {
          return '333333';
        }
        
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
      
      // Verificar luminosidad del RGB
      const luminance = (0.299 * parseInt(r) + 0.587 * parseInt(g) + 0.114 * parseInt(b)) / 255;
      if (luminance > 0.8) {
        return '333333';
      }
      
      return hex;
    }
  } catch (e) {
    console.error('Error convirtiendo color:', color, e);
  }
  
  // Por defecto, usar negro
  return '000000';
}

export default htmlToDocxElements;