// BackExams/services/exam.services.js
import fsPromise from 'fs/promises';
import fs from 'fs';
import randomstring from 'randomstring';
import { Packer } from 'docx';
import createDocument from '../config/document.js';

const EXAMS_PATH = './exams';

class ExamService {
  constructor() {
    if (!fs.existsSync(EXAMS_PATH)) {
      fs.mkdir(EXAMS_PATH, (e) => {
        if (e) console.log('Folder not created');
        else console.log('Exams folder created for first time');
      });
    }
  }

  // Función para limpiar y normalizar texto
  sanitizeText(text) {
    if (!text) return '';
    
    // Convertir a string si no lo es
    text = String(text);
    
    // Reemplazar diferentes tipos de saltos de línea por un espacio
    // Esto incluye \r\n (Windows), \n (Unix), \r (Mac antiguo)
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

    return path;
  }

  async createDocExam(questions, hasFeedback) {
    const exam = createDocument(questions, hasFeedback);
    const path = this.createPath('docx');
    const buffer = await Packer.toBuffer(exam);
    await fsPromise.writeFile(path, buffer);
    return path;
  }

  async removeExam(path) {
    await fsPromise.unlink(path);
  }

  createPath(type) {
    const hash = randomstring.generate(6);
    const path = `${EXAMS_PATH}/${hash}.${type}`;
    return path;
  }
}

export default ExamService;