// BackExams/services/upload.services.js
import csv from 'csv-parser';
import fs from 'fs';
import Questions from '../models/questions.model.js';
import mapHeader from '../config/headers.js';
import QuestionService from './questions.services.js';
import HistoricService from './historic.services.js';

const questionsService = new QuestionService();
const historicService = new HistoricService();

class UploadService {
  // Función para limpiar los datos al importar
  sanitizeImportData(data) {
    const sanitized = {};
    
    Object.keys(data).forEach(key => {
      if (data[key] === null || data[key] === undefined) {
        sanitized[key] = null;
        return;
      }
      
      // Si es un string, limpiarlo
      if (typeof data[key] === 'string') {
        let value = data[key];
        
        // Normalizar saltos de línea
        value = value.replace(/\r\n/g, '\n');
        value = value.replace(/\r/g, '\n');
        
        // En feedback, mantener saltos de línea simples
        if (key === 'feedback') {
          // Reemplazar múltiples saltos por dos máximo
          value = value.replace(/\n{3,}/g, '\n\n');
        } else {
          // En otros campos, reemplazar saltos de línea por espacios
          value = value.replace(/\n/g, ' ');
        }
        
        // Limpiar espacios múltiples
        value = value.replace(/[ \t]+/g, ' ');
        
        // Trim
        value = value.trim();
        
        sanitized[key] = value || null;
      } else {
        sanitized[key] = data[key];
      }
    });
    
    return sanitized;
  }
  
// En BackExams/services/upload.services.js
// Actualiza el método transformData para manejar correctamente campos entrecomillados:

async transformData(path) {
  const jsonData = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(path, { encoding: 'utf8' })
      .pipe(csv({
        mapHeaders: ({ header }) => {
          // Limpiar el header también (quitar espacios extras)
          const cleanHeader = header.trim();
          return mapHeader[cleanHeader] || cleanHeader;
        },
        mapValues: ({ value }) => (value === '' ? null : value),
        separator: ';',
        bom: true,
        quote: '"',  // Especificar que usa comillas dobles
        escape: '"',  // Las comillas se escapan duplicándolas
        // Esto permite que csv-parser maneje correctamente campos entrecomillados
      }))
      .on('data', (data) => {
        // Sanitizar cada fila de datos
        const sanitizedData = this.sanitizeImportData(data);
        jsonData.push(sanitizedData);
      })
      .on('end', () => {
        resolve(jsonData);
      })
      .on('error', (e) => {
        reject(e);
      });
  });
}

  async insertCSV(file) {
    try {
      const csvData = await this.transformData(file.path);
      
      // Validar que tenemos datos
      if (!csvData || csvData.length === 0) {
        throw new Error('El archivo CSV está vacío o no tiene el formato correcto');
      }
      
      // Verificar que todos los registros tienen los campos necesarios
      const invalidRecords = csvData.filter(record => 
        !record.block || 
        !record.topic || 
        !record.question || 
        !record.optionA || 
        !record.optionB || 
        !record.optionC || 
        !record.correctAnswer
      );
      
      if (invalidRecords.length > 0) {
        throw new Error(`${invalidRecords.length} registros no tienen todos los campos requeridos`);
      }
      
      await Questions.bulkCreate(csvData);
      const questions = await questionsService.getLastQuestions(csvData.length);
      await historicService.addRecord(
        `Carga Auto. ${file.originalFilename}`, 
        questions, 
        'Multiple', 
        ''
      );

      return {
        message: `Datos cargados correctamente desde ${file.originalFilename}`,
        fileName: file.originalFilename,
        rowsAmount: csvData.length,
      };
    } catch (e) {
      console.error('Error al procesar CSV:', e);
      // eslint-disable-next-line no-throw-literal
      throw {
        message: e.message || 'Error al procesar el archivo CSV',
        fileName: file.originalFilename,
        error: e,
      };
    }
  }
}

export default UploadService;