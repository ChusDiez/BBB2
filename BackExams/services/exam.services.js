// BackExams/services/exam.services.js - VERSIÓN COMPLETA MEJORADA
import fsPromise from 'fs/promises';
import fs from 'fs';
import randomstring from 'randomstring';
import docx from 'docx';
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

  // ✅ MÉTODO MEJORADO PARA LIMPIAR Y NORMALIZAR TEXTO
  sanitizeText(text) {
    if (!text) return '';
    
    // Convertir a string si no lo es
    text = String(text);
    
    // Eliminar caracteres de control y zero-width
    text = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width chars
    
    // Normalizar caracteres especiales
    text = text.replace(/[""'']/g, '"'); // Smart quotes → regular quotes
    text = text.replace(/[–—]/g, '-'); // Em/en dashes → hyphens
    text = text.replace(/…/g, '...'); // Ellipsis → three dots
    
    // Reemplazar diferentes tipos de saltos de línea por un espacio
    text = text.replace(/\r\n/g, ' ');
    text = text.replace(/\n/g, ' ');
    text = text.replace(/\r/g, ' ');
    
    // Reemplazar múltiples espacios por uno solo
    text = text.replace(/\s+/g, ' ');
    
    // Eliminar espacios al inicio y final
    text = text.trim();
    
    // Escapar punto y coma si existe (ya que es nuestro delimitador)
    text = text.replace(/;/g, ',');
    
    // Eliminar comillas dobles y reemplazar por simples
    text = text.replace(/"/g, "'");
    
    return text;
  }

  // ✅ MÉTODO PARA LIMPIAR HTML PROBLEMÁTICO PARA WORD
  cleanHtmlForWord(html) {
    if (!html) return null;
    
    let cleaned = html;
    
    // Eliminar caracteres problemáticos para Word
    cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Zero-width chars
    cleaned = cleaned.replace(/[""'']/g, '"'); // Smart quotes → regular quotes
    cleaned = cleaned.replace(/[–—]/g, '-'); // Em/en dashes → hyphens
    cleaned = cleaned.replace(/…/g, '...'); // Ellipsis → three dots
    
    // Eliminar caracteres de control
    cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    // Simplificar HTML complejo que puede causar problemas
    cleaned = cleaned.replace(/<script[^>]*>.*?<\/script>/gi, ''); // Remove scripts
    cleaned = cleaned.replace(/<style[^>]*>.*?<\/style>/gi, ''); // Remove styles
    cleaned = cleaned.replace(/<!--.*?-->/g, ''); // Remove comments
    
    // Normalizar espacios en HTML
    cleaned = cleaned.replace(/>\s+</g, '><'); // Remove spaces between tags
    cleaned = cleaned.replace(/\s+/g, ' '); // Multiple spaces → single space
    
    // Asegurar que los colores sean visibles en Word
    cleaned = cleaned.replace(/color:\s*#(fff|ffffff|fefefe)/gi, 'color: #000000');
    cleaned = cleaned.replace(/background-color:\s*#(fff|ffffff|fefefe)/gi, 'background-color: #f5f5f5');
    
    // Corregir colores muy claros que se ven mal en Word
    cleaned = cleaned.replace(/color:\s*#f8f9ff/gi, 'color: #0066cc');
    cleaned = cleaned.replace(/background-color:\s*#fff3cd/gi, 'background-color: #ffffcc');
    
    // Limpiar atributos problemáticos
    cleaned = cleaned.replace(/\s*style\s*=\s*["'][^"']*color:\s*transparent[^"']*["']/gi, '');
    
    return cleaned.trim();
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
          return {
            ...q,
            question: this.sanitizeText(q.question),
            optionA: this.sanitizeText(q.optionA),
            optionB: this.sanitizeText(q.optionB),
            optionC: this.sanitizeText(q.optionC),
            correctAnswer: q.correctAnswer,
            feedback: q.feedback ? this.cleanHtmlForWord(q.feedback) : null
          };
        } catch (error) {
          console.error(`❌ Error limpiando pregunta ${index + 1}:`, error);
          throw new Error(`Error procesando pregunta ${index + 1}: ${error.message}`);
        }
      });
      
      console.log(`✅ ${cleanedQuestions.length} preguntas limpiadas y validadas`);
      
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
      if (buffer.length < 1000) { // Un documento Word mínimo suele ser > 1KB
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
      
      // Verificar que el tamaño del archivo sea razonable
      if (stats.size !== buffer.length) {
        console.warn(`⚠️ Tamaño del archivo (${stats.size}) difiere del buffer (${buffer.length})`);
      }
      
      console.log(`✅ Documento Word creado exitosamente: ${path} (${stats.size} bytes)`);
      
      // ✅ VERIFICACIÓN FINAL DE INTEGRIDAD
      try {
        // Intentar leer los primeros bytes para verificar que es un archivo válido
        const fileHeader = await fsPromise.readFile(path, { start: 0, end: 4 });
        const isProbablyZip = fileHeader[0] === 0x50 && fileHeader[1] === 0x4B; // "PK" - ZIP header
        
        if (!isProbablyZip) {
          console.warn('⚠️ El archivo generado podría no ser un documento Word válido');
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

  // ✅ MÉTODO createCsvExam MEJORADO
  async createCsvExam(questions) {
    const path = this.createPath('csv');
    
    try {
      console.log(`📊 Creando archivo CSV con ${questions.length} preguntas...`);
      
      // Validar preguntas
      this.validateQuestions(questions);
      
      // Crear el contenido del CSV con texto sanitizado
      const results = questions.map(({
        question,
        optionA,
        optionB,
        optionC,
        correctAnswer,
        feedback,
      }) => {
        // Sanitizar todos los campos de texto
        const cleanQuestion = this.sanitizeText(question);
        const cleanOptionA = this.sanitizeText(optionA);
        const cleanOptionB = this.sanitizeText(optionB);
        const cleanOptionC = this.sanitizeText(optionC);
        const cleanFeedback = feedback ? this.sanitizeText(feedback.replace(/<[^>]*>/g, '')) : '';
        
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
}

export default ExamService;