// BackExams/services/exam.services.js - VERSIÓN MEJORADA CON MEJOR MANEJO DE HTML
import fsPromise from 'fs/promises';
import fs from 'fs';
import randomstring from 'randomstring';
import docx from 'docx';
import he from 'he'; // Para decodificar entidades HTML
import createDocument from '../config/document.js';

const { Packer } = docx;
const EXAMS_PATH = './exams';

class ExamService {
  constructor() {
    this.ensureExamsFolderExists();
  }

  ensureExamsFolderExists() {
    if (!fs.existsSync(EXAMS_PATH)) {
      try {
        fs.mkdirSync(EXAMS_PATH, { recursive: true });
        console.log('📁 Carpeta exams creada exitosamente');
      } catch (error) {
        console.error('❌ Error creando carpeta exams:', error);
      }
    }
  }

  // ✅ MÉTODO MEJORADO PARA LIMPIAR Y NORMALIZAR TEXTO PLANO
  sanitizeText(text) {
    if (!text) return '';
    
    // Convertir a string si no lo es
    text = String(text);
    
    // 1. Decodificar entidades HTML primero
    text = he.decode(text);
    
    // 2. Eliminar caracteres de control y zero-width
    text = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width chars
    text = text.replace(/\u2028/g, ' '); // Line separator
    text = text.replace(/\u2029/g, ' '); // Paragraph separator
    
    // 3. Normalizar caracteres tipográficos
    text = text
      // Comillas dobles tipográficas
      .replace(/[""«»„"‟″‶]/g, '"')
      // Comillas simples tipográficas
      .replace(/[''‹›‚‛′‵]/g, "'")
      // Em/en dashes → hyphen (para texto plano)
      .replace(/[–—―]/g, '-')
      // Ellipsis
      .replace(/…/g, '...')
      // Espacios no-break y otros espacios especiales
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      // Bullets y otros símbolos
      .replace(/[•·◦‣⁃]/g, '-')
      // Fracciones comunes
      .replace(/½/g, '1/2')
      .replace(/¼/g, '1/4')
      .replace(/¾/g, '3/4')
      .replace(/⅓/g, '1/3')
      .replace(/⅔/g, '2/3');
    
    // 4. Eliminar cualquier tag HTML residual (para campos de texto plano)
    text = text.replace(/<[^>]*>/g, '');
    
    // 5. Normalizar saltos de línea a espacios
    text = text.replace(/\r\n/g, ' ');
    text = text.replace(/[\r\n]/g, ' ');
    
    // 6. Normalizar espacios múltiples
    text = text.replace(/\s+/g, ' ');
    
    // 7. Trim
    text = text.trim();
    
    return text;
  }

  // ✅ MÉTODO MEJORADO PARA LIMPIAR HTML PARA WORD
  cleanHtmlForWord(html) {
    if (!html) return null;
    
    let cleaned = html;
    
    // 1. Decodificar entidades HTML correctamente
    // Pero NO decodificar < y > para preservar los tags
    cleaned = he.decode(cleaned, {
      isAttributeValue: false,
      strict: false
    });
    
    // 2. Validar y corregir estructura HTML
    cleaned = this.fixMalformedHtml(cleaned);
    
    // 3. Eliminar caracteres problemáticos para Word
    cleaned = cleaned
      // Zero-width y caracteres de control
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[\u2028\u2029]/g, ' ')
      // Normalizar espacios especiales
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ');
    
    // 4. Normalizar caracteres tipográficos EN ATRIBUTOS
    // Pero preservar en el contenido para mejor visualización
    cleaned = cleaned.replace(/(\w+)="([^"]*)"/g, (match, attr, value) => {
      const cleanValue = value
        .replace(/[""«»„"]/g, '"')
        .replace(/[''‹›‚‛]/g, "'")
        .replace(/[–—]/g, '-');
      return `${attr}="${cleanValue}"`;
    });
    
    // 5. Limpiar HTML problemático
    cleaned = cleaned
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<!--.*?-->/gs, '')
      .replace(/<meta[^>]*>/gi, '')
      .replace(/<link[^>]*>/gi, '');
    
    // 6. Corregir colores problemáticos para Word
    cleaned = this.fixColorsForWord(cleaned);
    
    // 7. Corregir estilos CSS
    cleaned = this.fixCssStyles(cleaned);
    
    // 8. Eliminar atributos peligrosos
    cleaned = cleaned
      .replace(/\son\w+="[^"]*"/gi, '') // Eliminar event handlers
      .replace(/\sjavascript:[^"'\s]*/gi, ''); // Eliminar javascript: URLs
    
    // 9. Normalizar espacios finales
    cleaned = cleaned
      .replace(/>\s+</g, '><')
      .replace(/\s+/g, ' ')
      .trim();
    
    return cleaned;
  }

  // Nuevo método para corregir HTML mal formado
  fixMalformedHtml(html) {
    if (!html) return html;
    
    let fixed = html;
    
    // 1. Corregir tags no cerrados
    const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
    
    // Encontrar todos los tags
    const tagStack = [];
    const tagRegex = /<(\/?)([\w]+)([^>]*)>/g;
    let match;
    
    while ((match = tagRegex.exec(fixed)) !== null) {
      const [, isClosing, tagName, attributes] = match;
      const lowerTagName = tagName.toLowerCase();
      
      if (!isClosing && !selfClosingTags.includes(lowerTagName)) {
        tagStack.push(lowerTagName);
      } else if (isClosing) {
        const lastIndex = tagStack.lastIndexOf(lowerTagName);
        if (lastIndex >= 0) {
          tagStack.splice(lastIndex, 1);
        }
      }
    }
    
    // Cerrar tags no cerrados
    tagStack.reverse().forEach(tag => {
      fixed += `</${tag}>`;
    });
    
    // 2. Corregir atributos con comillas no cerradas
    fixed = fixed.replace(/<(\w+)([^>]*)>/g, (match, tagName, attributes) => {
      if (!attributes) return match;
      
      let fixedAttrs = attributes;
      
      // Corregir style
      fixedAttrs = fixedAttrs.replace(/style\s*=\s*"([^"]*?)(?=\s|>|$)/g, (m, styleContent) => {
        if (!m.endsWith('"')) {
          return `style="${styleContent}"`;
        }
        return m;
      });
      
      // Corregir otros atributos
      fixedAttrs = fixedAttrs.replace(/(\w+)\s*=\s*["']([^"']*?)(?=\s|>|$)/g, (m, attr, value) => {
        if (!m.endsWith('"') && !m.endsWith("'")) {
          return `${attr}="${value}"`;
        }
        return m;
      });
      
      return `<${tagName}${fixedAttrs}>`;
    });
    
    // 3. Escapar < y > que no son parte de tags
    fixed = fixed.replace(/(<)(?![a-zA-Z\/!])/g, '&lt;');
    fixed = fixed.replace(/(?<![a-zA-Z"\/>])>/g, '&gt;');
    
    return fixed;
  }

  // Nuevo método para corregir colores para Word
  fixColorsForWord(html) {
    if (!html) return html;
    
    let fixed = html;
    
    // Mapa de colores problemáticos a colores visibles
    const colorMap = {
      // Blancos y transparentes
      '#ffffff': '#000000',
      '#fff': '#000000',
      '#fefefe': '#333333',
      'white': '#000000',
      'transparent': '#000000',
      
      // Colores muy claros
      '#f8f9ff': '#0066cc',
      '#fff3cd': '#ffcc00',
      '#e8f4fd': '#0099ff',
      '#ffe4e1': '#ff6666',
      '#f0fff0': '#009900',
      '#fffafa': '#cc0000',
      
      // Grises muy claros
      '#f5f5f5': '#666666',
      '#eeeeee': '#777777',
      '#e0e0e0': '#888888',
      '#cccccc': '#666666'
    };
    
    // Reemplazar colores en estilos
    Object.entries(colorMap).forEach(([oldColor, newColor]) => {
      const regex = new RegExp(`((?:color|background-color)\\s*:\\s*)${oldColor.replace('#', '#?')}(?=[;'"])`, 'gi');
      fixed = fixed.replace(regex, `$1${newColor}`);
    });
    
    return fixed;
  }

  // Nuevo método para corregir estilos CSS
  fixCssStyles(html) {
    if (!html) return html;
    
    let fixed = html;
    
    // Corregir sintaxis CSS en atributos style
    fixed = fixed.replace(/style="([^"]*)"/g, (match, styles) => {
      let fixedStyles = styles;
      
      // 1. Reemplazar comas por punto y coma
      fixedStyles = fixedStyles.replace(/,\s*(?=[\w-]+:)/g, '; ');
      
      // 2. Eliminar punto y coma duplicados
      fixedStyles = fixedStyles.replace(/;\s*;/g, ';');
      
      // 3. Eliminar espacios alrededor de :
      fixedStyles = fixedStyles.replace(/\s*:\s*/g, ':');
      
      // 4. Asegurar espacio después de punto y coma
      fixedStyles = fixedStyles.replace(/;(?=\w)/g, '; ');
      
      // 5. Eliminar punto y coma final
      fixedStyles = fixedStyles.replace(/;\s*$/, '');
      
      // 6. Validar propiedades CSS
      const validProperties = fixedStyles.split(';').map(prop => {
        const trimmed = prop.trim();
        if (!trimmed || !trimmed.includes(':')) return '';
        
        const [property, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();
        
        if (!property || !value) return '';
        
        return `${property.trim()}:${value}`;
      }).filter(s => s).join(';');
      
      return `style="${validProperties}"`;
    });
    
    return fixed;
  }

  // ✅ MÉTODO PARA VALIDAR ESTRUCTURA DE PREGUNTAS
  validateQuestions(questions) {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('No se proporcionaron preguntas válidas');
    }

    const invalidQuestions = [];
    
    questions.forEach((q, index) => {
      const errors = [];
      
      if (!q.question || q.question.trim().length === 0) {
        errors.push('pregunta vacía');
      }
      if (!q.optionA || q.optionA.trim().length === 0) {
        errors.push('opción A vacía');
      }
      if (!q.optionB || q.optionB.trim().length === 0) {
        errors.push('opción B vacía');
      }
      if (!q.optionC || q.optionC.trim().length === 0) {
        errors.push('opción C vacía');
      }
      if (!q.correctAnswer || !['A', 'B', 'C'].includes(q.correctAnswer)) {
        errors.push('respuesta correcta inválida');
      }
      
      if (errors.length > 0) {
        invalidQuestions.push({
          index: index + 1,
          id: q.id || 'sin ID',
          errors
        });
      }
    });

    if (invalidQuestions.length > 0) {
      const errorMsg = invalidQuestions
        .map(q => `Pregunta ${q.index} (ID: ${q.id}): ${q.errors.join(', ')}`)
        .join('\n');
      throw new Error(`Preguntas inválidas encontradas:\n${errorMsg}`);
    }

    return true;
  }

  // ✅ MÉTODO createDocExam MEJORADO
  async createDocExam(questions, hasFeedback = false) {
    const path = this.createPath('docx');
    
    try {
      console.log(`📝 Creando documento Word con ${questions.length} preguntas...`);
      
      // ✅ VALIDAR DATOS ANTES DE GENERAR
      if (!questions || questions.length === 0) {
        throw new Error('No hay preguntas para generar el documento');
      }
      
      // ✅ VALIDAR ESTRUCTURA DE PREGUNTAS
      this.validateQuestions(questions);
      
      // ✅ LIMPIAR DATOS PROBLEMÁTICOS
      const cleanedQuestions = questions.map((q, index) => {
        try {
          const cleaned = {
            ...q,
            // Campos de texto plano - usar sanitización completa
            question: this.sanitizeText(q.question),
            optionA: this.sanitizeText(q.optionA),
            optionB: this.sanitizeText(q.optionB),
            optionC: this.sanitizeText(q.optionC),
            correctAnswer: q.correctAnswer,
            // Feedback HTML - usar limpieza especial para preservar formato
            feedback: q.feedback ? this.cleanHtmlForWord(q.feedback) : null
          };
          
          // Validación adicional del feedback
          if (cleaned.feedback && cleaned.feedback.includes('<') && !cleaned.feedback.includes('>')) {
            console.warn(`⚠️ Pregunta ${index + 1}: Feedback con HTML potencialmente corrupto`);
          }
          
          return cleaned;
        } catch (error) {
          console.error(`❌ Error limpiando pregunta ${index + 1}:`, error);
          throw new Error(`Error procesando pregunta ${index + 1}: ${error.message}`);
        }
      });
      
      console.log(`✅ ${cleanedQuestions.length} preguntas limpiadas y validadas`);
      
      // Log de muestra para debugging
      if (cleanedQuestions.length > 0 && cleanedQuestions[0].feedback) {
        console.log('📋 Muestra de feedback procesado (primeros 200 chars):');
        console.log(cleanedQuestions[0].feedback.substring(0, 200) + '...');
      }
      
      // ✅ CREAR DOCUMENTO CON MEJOR MANEJO DE ERRORES
      console.log('🔄 Generando estructura del documento...');
      let exam;
      try {
        exam = createDocument(cleanedQuestions, hasFeedback);
      } catch (error) {
        console.error('❌ Error en createDocument:', error);
        throw new Error(`Error creando estructura del documento: ${error.message}`);
      }
      
      if (!exam) {
        throw new Error('El generador de documentos devolvió null');
      }
      
      // ✅ GENERAR BUFFER CON TIMEOUT Y MEJOR MANEJO
      console.log('🔄 Generando buffer del documento...');
      let buffer;
      try {
        buffer = await Promise.race([
          Packer.toBuffer(exam),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout generando documento (30s)')), 30000)
          )
        ]);
      } catch (error) {
        console.error('❌ Error en Packer.toBuffer:', error);
        throw new Error(`Error generando buffer: ${error.message}`);
      }
      
      // ✅ VALIDAR BUFFER
      if (!buffer || buffer.length === 0) {
        throw new Error('Buffer del documento está vacío');
      }
      
      // Validar que el buffer tenga el tamaño mínimo de un documento Word válido
      if (buffer.length < 1000) {
        throw new Error(`Buffer del documento es muy pequeño (${buffer.length} bytes)`);
      }
      
      console.log(`✅ Buffer generado exitosamente: ${buffer.length} bytes`);
      
      // ✅ ESCRIBIR CON VALIDACIÓN Y REINTENTO
      let writeAttempts = 0;
      const maxAttempts = 3;
      
      while (writeAttempts < maxAttempts) {
        try {
          await fsPromise.writeFile(path, buffer);
          break; // Éxito, salir del bucle
        } catch (writeError) {
          writeAttempts++;
          console.warn(`⚠️ Intento ${writeAttempts} de escritura falló:`, writeError.message);
          
          if (writeAttempts >= maxAttempts) {
            throw new Error(`Error escribiendo archivo después de ${maxAttempts} intentos: ${writeError.message}`);
          }
          
          // Esperar un poco antes del siguiente intento
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // ✅ VERIFICAR ARCHIVO FINAL
      let stats;
      try {
        stats = await fsPromise.stat(path);
      } catch (statError) {
        throw new Error(`Error verificando archivo generado: ${statError.message}`);
      }
      
      if (stats.size === 0) {
        throw new Error('Archivo generado está vacío');
      }
      
      console.log(`✅ Documento Word creado exitosamente: ${path} (${stats.size} bytes)`);
      
      // ✅ VERIFICACIÓN FINAL DE INTEGRIDAD
      try {
        const fileHeader = Buffer.alloc(4);
        const fd = await fsPromise.open(path, 'r');
        await fd.read(fileHeader, 0, 4, 0);
        await fd.close();
        
        const isProbablyZip = fileHeader[0] === 0x50 && fileHeader[1] === 0x4B;
        
        if (!isProbablyZip) {
          console.warn('⚠️ El archivo generado podría no ser un documento Word válido');
        } else {
          console.log('✅ Verificación de integridad: Archivo Word válido (PK header)');
        }
      } catch (headerError) {
        console.warn('⚠️ No se pudo verificar la integridad del archivo:', headerError.message);
      }
      
      return path;
      
    } catch (error) {
      console.error('❌ Error creando documento Word:', error);
      
      // ✅ LIMPIAR ARCHIVO CORRUPTO
      try {
        if (fs.existsSync(path)) {
          await fsPromise.unlink(path);
          console.log('🗑️ Archivo corrupto eliminado');
        }
      } catch (cleanupError) {
        console.error('⚠️ Error limpiando archivo:', cleanupError);
      }
      
      // Re-throw con mensaje más descriptivo
      throw new Error(`Error generando documento Word: ${error.message}`);
    }
  }
  // Método para crear examen HTML
async createHtmlExam(questions, hasFeedback = false) {
  const path = this.createPath('html');
  
  try {
    console.log(`🌐 Creando archivo HTML con ${questions.length} preguntas...`);
    
    // Validar preguntas
    this.validateQuestions(questions);
    
    // Generar HTML con estilos mejorados para impresión
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Examen - ${new Date().toLocaleDateString('es-ES')}</title>
  <style>
    /* Reset y estilos base */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    /* Estilos de impresión críticos */
    @media print {
      body {
        padding: 0;
        margin: 0;
      }
      
      .no-print {
        display: none !important;
      }
      
      /* Evitar cortes de página dentro de preguntas */
      .question-block {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      /* Forzar nueva página después del encabezado */
      .header-section {
        page-break-after: always;
      }
      
      /* Respuestas siempre en nueva página */
      .answer-key {
        page-break-before: always;
        margin-top: 0 !important;
      }
    }
    
    /* Encabezado */
    .header-section {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #0066cc;
    }
    
    .header-section h1 {
      color: #0066cc;
      margin-bottom: 10px;
      font-size: 2em;
    }
    
    .header-section .date {
      color: #666;
      font-size: 1.1em;
    }
    
    /* Bloque de pregunta - CRÍTICO para evitar cortes */
    .question-block {
      margin-bottom: 30px;
      padding: 20px;
      background: #f9f9f9;
      border-left: 4px solid #0066cc;
      border-radius: 4px;
      /* Propiedades críticas para evitar cortes en impresión */
      page-break-inside: avoid;
      break-inside: avoid;
      display: block;
      position: relative;
    }
    
    .question-number {
      font-weight: bold;
      color: #0066cc;
      font-size: 1.1em;
      margin-bottom: 10px;
    }
    
    .question-text {
      margin-bottom: 15px;
      font-weight: 500;
    }
    
    .options {
      margin-left: 20px;
    }
    
    .option {
      margin-bottom: 8px;
      padding: 5px 0;
    }
    
    .option-letter {
      font-weight: bold;
      color: #0066cc;
      margin-right: 10px;
    }
    
    /* Retroalimentación con estilos del sistema */
    .feedback {
      margin-top: 15px;
      padding: 15px;
      background: #fff;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }
    
    .feedback-title {
      font-weight: bold;
      color: #0066cc;
      margin-bottom: 10px;
      text-decoration: underline;
    }
    
    .correct-answer {
      font-weight: bold;
      color: #28a745;
      margin-bottom: 10px;
    }
    
    /* Contenedores por tema (copiados del sistema) */
    .feedback-container {
      font-size: 0.9rem;
      line-height: 1.6;
    }
    
    /* Estilos para elementos enriquecidos (idénticos al sistema) */
    .feedback-container span[style*="background-color: #FFD700"] {
      background-color: #FFD700 !important;
      color: #000000 !important;
      padding: 2px 6px !important;
      border-radius: 3px !important;
      font-weight: 700 !important;
      border: 1px solid #DAA520 !important;
    }
    
    .feedback-container span[style*="background-color: #87CEEB"] {
      background-color: #87CEEB !important;
      color: #000080 !important;
      padding: 2px 6px !important;
      border-radius: 3px !important;
      font-weight: 700 !important;
      border: 1px solid #4682B4 !important;
    }
    
    .feedback-container span[style*="background-color: #98FB98"] {
      background-color: #98FB98 !important;
      color: #006400 !important;
      padding: 2px 6px !important;
      border-radius: 3px !important;
      font-weight: 600 !important;
      border: 1px solid #32CD32 !important;
    }
    
    /* Tabla de respuestas */
    .answer-key {
      margin-top: 50px;
      padding: 20px;
      background: #f0f8ff;
      border-radius: 8px;
      border: 2px solid #0066cc;
    }
    
    .answer-key h2 {
      text-align: center;
      color: #0066cc;
      margin-bottom: 20px;
    }
    
    .answer-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      text-align: center;
    }
    
    .answer-item {
      padding: 8px;
      background: white;
      border-radius: 4px;
      border: 1px solid #ddd;
    }
    
    .answer-number {
      font-weight: bold;
    }
    
    .answer-letter {
      color: #0066cc;
      font-weight: bold;
      font-size: 1.1em;
    }
    
    /* Botón de impresión */
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: #0066cc;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      z-index: 1000;
    }
    
    .print-button:hover {
      background: #0052a3;
    }
  </style>
</head>
<body>
  <!-- Botón de impresión (no se muestra al imprimir) -->
  <button class="print-button no-print" onclick="window.print()">
    🖨️ Imprimir
  </button>
  
  <!-- Encabezado -->
  <div class="header-section">
    <h1>EXAMEN DE EVALUACIÓN</h1>
    <div class="date">Fecha: ${new Date().toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}</div>
    <div class="total-questions">Total de preguntas: ${questions.length}</div>
  </div>
  
  <!-- Preguntas -->
  <div class="questions-container">
    ${questions.map((q, index) => `
      <div class="question-block">
        <div class="question-number">Pregunta ${index + 1}</div>
        <div class="question-text">${this.sanitizeText(q.question)}</div>
        <div class="options">
          <div class="option">
            <span class="option-letter">A)</span>
            <span class="option-text">${this.sanitizeText(q.optionA)}</span>
          </div>
          <div class="option">
            <span class="option-letter">B)</span>
            <span class="option-text">${this.sanitizeText(q.optionB)}</span>
          </div>
          <div class="option">
            <span class="option-letter">C)</span>
            <span class="option-text">${this.sanitizeText(q.optionC)}</span>
          </div>
        </div>
        ${hasFeedback && q.feedback ? `
          <div class="feedback">
            <div class="correct-answer">Respuesta correcta: ${q.correctAnswer}</div>
            <div class="feedback-title">Retroalimentación:</div>
            <div class="feedback-container">
              ${q.feedback}
            </div>
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>
  
  <!-- Tabla de respuestas (solo si hay feedback) -->
  ${hasFeedback ? `
    <div class="answer-key">
      <h2>RESPUESTAS CORRECTAS</h2>
      <div class="answer-grid">
        ${questions.map((q, index) => `
          <div class="answer-item">
            <span class="answer-number">${index + 1}.</span>
            <span class="answer-letter">${q.correctAnswer}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : ''}
  
  <script>
    // Script para mejorar la experiencia de impresión
    window.addEventListener('beforeprint', function() {
      // Verificar que ninguna pregunta se corte
      const questions = document.querySelectorAll('.question-block');
      questions.forEach((q, index) => {
        const rect = q.getBoundingClientRect();
        const pageHeight = 1123; // Altura aproximada de página A4 en px
        const pageNumber = Math.floor(rect.top / pageHeight);
        const nextPageStart = (pageNumber + 1) * pageHeight;
        
        // Si la pregunta cruza el límite de página, añadir espacio antes
        if (rect.bottom > nextPageStart && rect.top < nextPageStart) {
          q.style.marginTop = (nextPageStart - rect.top + 20) + 'px';
        }
      });
    });
  </script>
</body>
</html>`;
    
    // Escribir archivo
    await fsPromise.writeFile(path, html, 'utf8');
    
    const stats = await fsPromise.stat(path);
    console.log(`✅ HTML creado exitosamente: ${path} (${stats.size} bytes)`);
    
    return path;
    
  } catch (error) {
    console.error('❌ Error creando HTML:', error);
    
    // Limpiar archivo parcial
    try {
      if (fs.existsSync(path)) {
        await fsPromise.unlink(path);
      }
    } catch (cleanupError) {
      console.error('⚠️ Error limpiando HTML parcial:', cleanupError);
    }
    
    throw new Error(`Error generando archivo HTML: ${error.message}`);
  }
}
  // ✅ MÉTODO createCsvExam MEJORADO
  async createCsvExam(questions) {
    const path = this.createPath('csv');
    
    try {
      console.log(`📊 Creando archivo CSV con ${questions.length} preguntas...`);
      
      // Validar preguntas
      this.validateQuestions(questions);
      
      // Función mejorada para procesar campos CSV
      const processCsvField = (field, forceQuote = false) => {
        if (!field) return '';
        
        // Convertir a string
        let str = String(field);
        
        // Decodificar entidades HTML para CSV
        str = he.decode(str);
        
        // Eliminar caracteres de control
        str = str.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        str = str.replace(/[\u200B-\u200D\uFEFF]/g, '');
        
        // Determinar si necesita comillas
        const needsQuotes = forceQuote || 
                           str.includes(';') ||     // Contiene el delimitador
                           str.includes('"') ||     // Contiene comillas
                           str.includes('\n') ||    // Contiene saltos de línea
                           str.includes('\r') ||    // Contiene retornos de carro
                           str.includes('<');       // Contiene HTML
        
        if (needsQuotes) {
          // Duplicar comillas internas según estándar CSV
          str = str.replace(/"/g, '""');
          // Encerrar entre comillas
          return `"${str}"`;
        }
        
        return str;
      };
      
      // Crear el contenido del CSV
      const results = questions.map(({
        question,
        optionA,
        optionB,
        optionC,
        correctAnswer,
        feedback,
      }) => {
        // Procesar cada campo apropiadamente
        const cleanQuestion = processCsvField(question);
        const cleanOptionA = processCsvField(optionA);
        const cleanOptionB = processCsvField(optionB);
        const cleanOptionC = processCsvField(optionC);
        
        // Feedback SIEMPRE entrecomillado porque puede contener HTML
        const cleanFeedback = processCsvField(feedback, true);
        
        return `*;${cleanQuestion};
;${cleanOptionA};${correctAnswer === 'A' ? 'x' : ''}
;${cleanOptionB};${correctAnswer === 'B' ? 'x' : ''}
;${cleanOptionC};${correctAnswer === 'C' ? 'x' : ''}
@;${cleanFeedback}; \n`;
      }).join('');
      
      // Añadir BOM para UTF-8 y escribir el archivo
      const BOM = '\ufeff';
      await fsPromise.writeFile(path, BOM + results, 'utf8');
      
      // Verificar archivo generado
      const stats = await fsPromise.stat(path);
      console.log(`✅ CSV creado exitosamente: ${path} (${stats.size} bytes)`);
      console.log(`   Formato: CSV estándar con campos entrecomillados`);
      console.log(`   Delimitador: punto y coma (;)`);
      console.log(`   Codificación: UTF-8 con BOM`);
      
      return path;
      
    } catch (error) {
      console.error('❌ Error creando CSV:', error);
      
      // Limpiar archivo parcial
      try {
        if (fs.existsSync(path)) {
          await fsPromise.unlink(path);
        }
      } catch (cleanupError) {
        console.error('⚠️ Error limpiando CSV parcial:', cleanupError);
      }
      
      throw new Error(`Error generando archivo CSV: ${error.message}`);
    }
  }

  // ✅ MÉTODO removeExam MEJORADO
  async removeExam(path) {
    try {
      // Verificar que el archivo existe antes de intentar eliminarlo
      if (fs.existsSync(path)) {
        await fsPromise.unlink(path);
        console.log(`🗑️ Archivo eliminado: ${path}`);
      } else {
        console.log(`⚠️ Archivo no encontrado para eliminar: ${path}`);
      }
    } catch (error) {
      console.error('❌ Error eliminando archivo:', error);
      // No lanzar el error para evitar problemas en la respuesta HTTP
    }
  }

  // ✅ MÉTODO createPath MEJORADO
  createPath(type) {
    // Generar un hash más único para evitar colisiones
    const timestamp = Date.now();
    const hash = randomstring.generate(8);
    const filename = `${timestamp}_${hash}.${type}`;
    const path = `${EXAMS_PATH}/${filename}`;
    
    console.log(`📄 Generando archivo: ${path}`);
    return path;
  }

  // ✅ MÉTODO PARA VERIFICAR EL ESTADO DE UN ARCHIVO
  async checkFileStatus(path) {
    try {
      const stats = await fsPromise.stat(path);
      return {
        exists: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isValid: stats.size > 0
      };
    } catch (error) {
      return {
        exists: false,
        size: 0,
        isValid: false,
        error: error.message
      };
    }
  }

  // ✅ MÉTODO PARA LIMPIAR ARCHIVOS ANTIGUOS
  async cleanupOldFiles(maxAgeHours = 24) {
    try {
      console.log(`🧹 Limpiando archivos más antiguos que ${maxAgeHours} horas...`);
      
      const files = await fsPromise.readdir(EXAMS_PATH);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Convertir a millisegundos
      
      let cleanedCount = 0;
      
      for (const file of files) {
        const filePath = `${EXAMS_PATH}/${file}`;
        try {
          const stats = await fsPromise.stat(filePath);
          
          if (now - stats.birthtime.getTime() > maxAge) {
            await this.removeExam(filePath);
            console.log(`🧹 Archivo antiguo eliminado: ${file}`);
            cleanedCount++;
          }
        } catch (error) {
          console.error(`❌ Error procesando archivo ${file}:`, error.message);
        }
      }
      
      console.log(`✅ Limpieza completada: ${cleanedCount} archivos eliminados`);
      
    } catch (error) {
      console.error('❌ Error en limpieza de archivos:', error);
    }
  }

  // ✅ MÉTODO PARA OBTENER ESTADÍSTICAS DE ARCHIVOS
  async getStorageStats() {
    try {
      const files = await fsPromise.readdir(EXAMS_PATH);
      let totalSize = 0;
      let fileCount = 0;
      const filesByType = { docx: 0, csv: 0, other: 0 };
      
      for (const file of files) {
        const filePath = `${EXAMS_PATH}/${file}`;
        try {
          const stats = await fsPromise.stat(filePath);
          totalSize += stats.size;
          fileCount++;
          
          const extension = file.split('.').pop()?.toLowerCase();
          if (extension === 'docx') {
            filesByType.docx++;
          } else if (extension === 'csv') {
            filesByType.csv++;
          } else {
            filesByType.other++;
          }
        } catch (error) {
          console.error(`Error getting stats for ${file}:`, error.message);
        }
      }
      
      return {
        totalFiles: fileCount,
        totalSizeBytes: totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        filesByType
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return null;
    }
  }

  // ✅ NUEVO MÉTODO: Diagnóstico de problemas HTML
  async diagnoseHtmlIssues(questions) {
    console.log('\n🔍 Diagnóstico de problemas HTML en feedbacks:');
    
    const issues = {
      malformedHtml: [],
      problematicChars: [],
      unclosedTags: [],
      invalidColors: []
    };
    
    questions.forEach((q, index) => {
      if (!q.feedback) return;
      
      const feedback = q.feedback;
      
      // Verificar HTML mal formado
      if (feedback.includes('<') && !feedback.includes('>')) {
        issues.malformedHtml.push({ index, preview: feedback.substring(0, 50) });
      }
      
      // Verificar caracteres problemáticos
      if (/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/.test(feedback)) {
        issues.problematicChars.push({ index, preview: feedback.substring(0, 50) });
      }
      
      // Verificar tags no cerrados
      const openTags = (feedback.match(/<[^/>]+>/g) || []).length;
      const closeTags = (feedback.match(/<\/[^>]+>/g) || []).length;
      if (openTags !== closeTags) {
        issues.unclosedTags.push({ index, openTags, closeTags });
      }
      
      // Verificar colores problemáticos
      if (/color:\s*#(fff|ffffff|fefefe)/i.test(feedback)) {
        issues.invalidColors.push({ index, preview: feedback.substring(0, 50) });
      }
    });
    
    // Reportar resultados
    Object.entries(issues).forEach(([issueType, issueList]) => {
      if (issueList.length > 0) {
        console.log(`\n⚠️  ${issueType}: ${issueList.length} casos encontrados`);
        issueList.slice(0, 3).forEach(issue => {
          console.log(`   - Pregunta ${issue.index + 1}:`, issue);
        });
      }
    });
    
    return issues;
  }
}

export default ExamService;