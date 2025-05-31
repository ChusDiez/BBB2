// BackExams/services/exam.services.js - VERSIÓN CORREGIDA
import fsPromise from 'fs/promises';
import fs from 'fs';
import randomstring from 'randomstring';
import { Packer } from 'docx';
import createDocument from '../config/document.js';

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

  // Función para limpiar y normalizar texto
  sanitizeText(text) {
    if (!text) return '';
    
    // Convertir a string si no lo es
    text = String(text);
    
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

  async createCsvExam(questions) {
    const path = this.createPath('csv');
    
    try {
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
        const cleanFeedback = this.sanitizeText(feedback);
        
        return `*;${cleanQuestion};
;${cleanOptionA};${correctAnswer === 'A' ? 'x' : ''}
;${cleanOptionB};${correctAnswer === 'B' ? 'x' : ''}
;${cleanOptionC};${correctAnswer === 'C' ? 'x' : ''}
@;${cleanFeedback}; \n`;
      }).join('');
      
      // Añadir BOM para UTF-8 y escribir el archivo
      const BOM = '\ufeff';
      await fsPromise.writeFile(path, BOM + results, 'utf8');
      
      console.log(`✅ CSV creado exitosamente: ${path}`);
      return path;
      
    } catch (error) {
      console.error('❌ Error creando CSV:', error);
      throw error;
    }
  }

  async createDocExam(questions, hasFeedback = false) {
    const path = this.createPath('docx');
    
    try {
      console.log(`📝 Creando documento Word con ${questions.length} preguntas...`);
      
      // Crear el documento
      const exam = createDocument(questions, hasFeedback);
      
      // Generar el buffer del documento
      console.log('🔄 Generando buffer del documento...');
      const buffer = await Packer.toBuffer(exam);
      
      // Escribir el archivo de forma síncrona para asegurar que se complete
      console.log('💾 Escribiendo archivo al disco...');
      await fsPromise.writeFile(path, buffer);
      
      // Verificar que el archivo se creó correctamente
      const stats = await fsPromise.stat(path);
      console.log(`✅ Documento Word creado exitosamente: ${path} (${stats.size} bytes)`);
      
      // Dar un pequeño delay para asegurar que el archivo esté completamente escrito
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return path;
      
    } catch (error) {
      console.error('❌ Error creando documento Word:', error);
      
      // Limpiar archivo parcial si existe
      try {
        if (fs.existsSync(path)) {
          await fsPromise.unlink(path);
          console.log('🗑️ Archivo parcial eliminado');
        }
      } catch (cleanupError) {
        console.error('⚠️ Error limpiando archivo parcial:', cleanupError);
      }
      
      throw error;
    }
  }

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

  createPath(type) {
    // Generar un hash más único para evitar colisiones
    const timestamp = Date.now();
    const hash = randomstring.generate(8);
    const filename = `${timestamp}_${hash}.${type}`;
    const path = `${EXAMS_PATH}/${filename}`;
    
    console.log(`📄 Generando archivo: ${path}`);
    return path;
  }

  // Método para verificar el estado de un archivo
  async checkFileStatus(path) {
    try {
      const stats = await fsPromise.stat(path);
      return {
        exists: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message
      };
    }
  }

  // Método para limpiar archivos antiguos (opcional)
  async cleanupOldFiles(maxAgeHours = 24) {
    try {
      const files = await fsPromise.readdir(EXAMS_PATH);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000; // Convertir a millisegundos
      
      for (const file of files) {
        const filePath = `${EXAMS_PATH}/${file}`;
        const stats = await fsPromise.stat(filePath);
        
        if (now - stats.birthtime.getTime() > maxAge) {
          await this.removeExam(filePath);
          console.log(`🧹 Archivo antiguo eliminado: ${file}`);
        }
      }
    } catch (error) {
      console.error('❌ Error en limpieza de archivos:', error);
    }
  }
}

export default ExamService;