// BackExams/services/impUpload.services.js
import csv from 'csv-parser';
import fs from 'fs';
import Questions from '../models/questions.model.js';
import ImpAvailability from '../models/impAvailability.model.js';
import ImpStatusMonitor from '../models/impStatusMonitor.model.js';
import QuestionService from './questions.services.js';
import HistoricService from './historic.services.js';
import mapHeader from '../config/headers.js';

const questionsService = new QuestionService();
const historicService = new HistoricService();

class ImpUploadService {
  // Sanitiza datos del CSV (coherente con UnifiedUploadService)
  sanitizeImportData(data) {
    const sanitized = {};
    Object.keys(data).forEach(key => {
      if (data[key] === null || data[key] === undefined) {
        sanitized[key] = null;
        return;
      }
      if (typeof data[key] === 'string') {
        let value = data[key];
        value = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        if (key === 'feedback') value = value.replace(/\n{3,}/g, '\n\n');
        else value = value.replace(/\n/g, ' ');
        value = value.replace(/[ \t]+/g, ' ').trim();
        if (key === 'correctAnswer') {
          value = value.toUpperCase();
          if (!['A', 'B', 'C'].includes(value)) {
            if (value === 'X' || value === '1') value = 'A';
            else if (value === '2') value = 'B';
            else if (value === '3') value = 'C';
            else value = null;
          }
        }
        if (key === 'block') {
          value = String(value);
          const n = parseInt(value);
          if (!['1', '2', '3'].includes(value) && (isNaN(n) || n < 1 || n > 3)) value = null;
          else value = String(n || value);
        }
        if (key === 'topic') {
          const t = parseInt(value);
          value = (!isNaN(t) && t >= 1 && t <= 45) ? t : null;
        }
        sanitized[key] = value || null;
      } else {
        sanitized[key] = data[key];
      }
    });
    return sanitized;
  }

  async transformData(path) {
    const jsonData = [];
    return new Promise((resolve, reject) => {
      fs.createReadStream(path, { encoding: 'utf8' })
        .pipe(csv({
          mapHeaders: ({ header }) => {
            const cleanHeader = header.trim();
            return mapHeader[cleanHeader] || cleanHeader;
          },
          mapValues: ({ value }) => (value === '' ? null : value),
          separator: ';',
          bom: true,
          quote: '"',
          escape: '"',
        }))
        .on('data', (data) => {
          const sanitizedData = this.sanitizeImportData(data);
          jsonData.push(sanitizedData);
        })
        .on('end', () => resolve(jsonData))
        .on('error', (e) => reject(e));
    });
  }

  validateCsvData(csvData) {
    const validationErrors = [];
    csvData.forEach((record, index) => {
      const errors = [];
      const row = index + 2;
      if (!record.block) errors.push('Falta el bloque');
      if (!record.topic) errors.push('Falta el tema');
      if (!record.question || record.question.trim() === '') errors.push('Falta la pregunta');
      if (!record.optionA || record.optionA.trim() === '') errors.push('Falta la opción A');
      if (!record.optionB || record.optionB.trim() === '') errors.push('Falta la opción B');
      if (!record.optionC || record.optionC.trim() === '') errors.push('Falta la opción C');
      if (!record.correctAnswer) errors.push('Falta la respuesta correcta');
      if (record.block && !['1', '2', '3'].includes(String(record.block))) errors.push(`Bloque inválido: "${record.block}"`);
      const topicNum = parseInt(record.topic);
      if (isNaN(topicNum) || topicNum < 1 || topicNum > 45) errors.push(`Tema inválido: "${record.topic}"`);
      if (record.correctAnswer && !['A', 'B', 'C'].includes(record.correctAnswer)) errors.push(`Respuesta correcta inválida: "${record.correctAnswer}"`);
      if (errors.length > 0) validationErrors.push({ row, errors });
    });
    return validationErrors;
  }

  validateImpMetadata({ themeNumber, themeName, impVariant = 1 }) {
    const errors = [];
    
    // Validar número de tema
    if (!themeNumber || themeNumber < 1 || themeNumber > 45) {
      errors.push('Número de tema inválido (1-45)');
    }
    
    // Validar variante IMP
    if (![1, 2].includes(impVariant)) {
      errors.push('Variante IMP inválida (debe ser 1 o 2)');
    }
    
    // Validar formato de nombre: "X_IMP1" o "X_IMP2"
    if (!/^\d+_IMP[12]$/.test(themeName || '')) {
      errors.push('Formato de nombre incorrecto. Debe ser "X_IMP1" o "X_IMP2"');
    } else {
      const matches = String(themeName).match(/^(\d+)_IMP([12])$/);
      if (matches) {
        const numberFromName = parseInt(matches[1]);
        const variantFromName = parseInt(matches[2]);
        
        if (numberFromName !== themeNumber) {
          errors.push('El número del tema no coincide con el nombre');
        }
        
        if (variantFromName !== impVariant) {
          errors.push('La variante del tema no coincide con el nombre');
        }
      }
    }
    
    return errors;
  }

  addDays(dateOrString, days) {
    const d = (dateOrString instanceof Date) ? dateOrString : new Date(dateOrString);
    const r = new Date(d.getTime());
    r.setDate(r.getDate() + days);
    return r.toISOString();
  }

  async uploadImpExam(filePath, impOptions) {
    const {
      themeNumber,
      themeName,
      impVariant = 1,
      windowStartDate,
      autoRelease = true,
      immediatelyAvailable = true,
    } = impOptions || {};

    // Validación de metadatos IMP
    const metaErrors = this.validateImpMetadata({ themeNumber, themeName, impVariant });
    if (metaErrors.length > 0) {
      throw new Error(metaErrors.join(' | '));
    }

    // Procesar CSV
    const csvData = await this.transformData(filePath);
    if (!csvData || csvData.length === 0) {
      throw new Error('El archivo CSV está vacío o no tiene el formato correcto');
    }
    
    // Validación flexible: 40 para IMP1, 20 para IMP2
    const expectedQuestions = impVariant === 1 ? 40 : 20;
    if (csvData.length !== expectedQuestions) {
      throw new Error(
        `IMP${impVariant} debe tener exactamente ${expectedQuestions} preguntas (actual: ${csvData.length})`
      );
    }

    // Validación detallada
    const rowErrors = this.validateCsvData(csvData);
    if (rowErrors.length > 0) {
      const first = rowErrors[0];
      throw new Error(`Errores de validación. Ej fila ${first.row}: ${first.errors.join(', ')}`);
    }

    // Insertar preguntas (separación del pool global)
    const questionsToCreate = csvData.map((q) => ({ ...q, globally_available: false }));
    await Questions.bulkCreate(questionsToCreate);
    const questions = await questionsService.getLastQuestions(questionsToCreate.length);

    // Crear historic (tipo IMP)
    const historicIdExam = await historicService.addRecord(
      themeName, // "X_IMP1" o "X_IMP2"
      questions,
      'Tema',
      'IMP'
    );

    // Crear control de disponibilidad IMP
    const releaseDate = autoRelease && windowStartDate ? this.addDays(windowStartDate, 7) : null;
    await ImpAvailability.create({
      theme_number: themeNumber,
      theme_name: themeName,
      historic_id: historicIdExam,
      imp_variant: impVariant,
      status: 'active',
      window_start_date: windowStartDate ? new Date(windowStartDate) : null,
      global_release_date: releaseDate ? new Date(releaseDate) : null,
      immediately_available: !!immediatelyAvailable,
      auto_release: !!autoRelease,
      total_questions: expectedQuestions,
    });

    // Inicializar monitor IMP
    await ImpStatusMonitor.create({
      theme_number: themeNumber,
      theme_name: themeName,
      total_attempts: 0,
      total_users: 0,
      avg_score: 0,
      pass_rate_p80: 0,
    });

    return {
      success: true,
      historic_id: historicIdExam,
      theme_name: themeName,
      imp_variant: impVariant,
      total_questions: expectedQuestions,
      message: `IMP "${themeName}" subido correctamente con ${expectedQuestions} preguntas`,
    };
  }
}

export default ImpUploadService;

