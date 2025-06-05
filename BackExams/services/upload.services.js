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
        
        // IMPORTANTE: Normalizar respuestas correctas a mayúsculas
        if (key === 'correctAnswer') {
          value = value.toUpperCase();
          // Validar que sea A, B o C
          if (!['A', 'B', 'C'].includes(value)) {
            console.warn(`⚠️ Respuesta correcta inválida: "${value}". Se esperaba A, B o C.`);
            // Si no es válida, intentar mapear valores comunes
            if (value === 'X' || value === '1') value = 'A';
            else if (value === '2') value = 'B';
            else if (value === '3') value = 'C';
            else {
              // Si no podemos mapear, usar null para que se detecte el error
              value = null;
            }
          }
        }
        
        // IMPORTANTE: Normalizar el campo block si es necesario
        if (key === 'block') {
          // Asegurar que el block sea string y esté en el rango correcto
          value = String(value);
          if (!['1', '2', '3'].includes(value)) {
            console.warn(`⚠️ Bloque inválido: "${value}". Se esperaba 1, 2 o 3.`);
            // Intentar corregir valores comunes
            const blockNum = parseInt(value);
            if (blockNum >= 1 && blockNum <= 3) {
              value = String(blockNum);
            } else {
              value = null;
            }
          }
        }
        
        // IMPORTANTE: Validar el campo topic
        if (key === 'topic') {
          const topicNum = parseInt(value);
          if (isNaN(topicNum) || topicNum < 1 || topicNum > 45) {
            console.warn(`⚠️ Tema inválido: "${value}". Se esperaba un número entre 1 y 45.`);
            value = null;
          } else {
            value = topicNum; // Guardar como número
          }
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
            // Limpiar el header también (quitar espacios extras)
            const cleanHeader = header.trim();
            return mapHeader[cleanHeader] || cleanHeader;
          },
          mapValues: ({ value }) => (value === '' ? null : value),
          separator: ';',
          bom: true,
          quote: '"',  // Especificar que usa comillas dobles
          escape: '"',  // Las comillas se escapan duplicándolas
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
      console.log(`📄 Procesando archivo CSV: ${file.originalFilename}`);
      
      const csvData = await this.transformData(file.path);
      
      // Validar que tenemos datos
      if (!csvData || csvData.length === 0) {
        throw new Error('El archivo CSV está vacío o no tiene el formato correcto');
      }
      
      console.log(`📊 Registros encontrados: ${csvData.length}`);
      
      // Validación más detallada de los registros
      const validationErrors = [];
      const invalidRecords = [];
      
      csvData.forEach((record, index) => {
        const errors = [];
        const rowNum = index + 2; // +2 porque índice empieza en 0 y hay header
        
        // Validar campos obligatorios
        if (!record.block) errors.push('Falta el bloque');
        if (!record.topic) errors.push('Falta el tema');
        if (!record.question || record.question.trim() === '') errors.push('Falta la pregunta');
        if (!record.optionA || record.optionA.trim() === '') errors.push('Falta la opción A');
        if (!record.optionB || record.optionB.trim() === '') errors.push('Falta la opción B');
        if (!record.optionC || record.optionC.trim() === '') errors.push('Falta la opción C');
        if (!record.correctAnswer) errors.push('Falta la respuesta correcta');
        
        // Validar valores específicos
        if (record.block && !['1', '2', '3'].includes(String(record.block))) {
          errors.push(`Bloque inválido: "${record.block}" (debe ser 1, 2 o 3)`);
        }
        
        if (record.topic) {
          const topicNum = parseInt(record.topic);
          if (isNaN(topicNum) || topicNum < 1 || topicNum > 45) {
            errors.push(`Tema inválido: "${record.topic}" (debe ser entre 1 y 45)`);
          }
        }
        
        if (record.correctAnswer && !['A', 'B', 'C'].includes(record.correctAnswer)) {
          errors.push(`Respuesta correcta inválida: "${record.correctAnswer}" (debe ser A, B o C)`);
        }
        
        if (errors.length > 0) {
          invalidRecords.push(record);
          validationErrors.push({
            row: rowNum,
            errors: errors,
            preview: record.question ? record.question.substring(0, 50) + '...' : 'Sin pregunta'
          });
        }
      });
      
      // Si hay errores de validación, mostrar detalles
      if (validationErrors.length > 0) {
        console.error('❌ Errores de validación encontrados:');
        validationErrors.slice(0, 5).forEach(error => {
          console.error(`   Fila ${error.row}: ${error.errors.join(', ')}`);
          console.error(`   Preview: ${error.preview}`);
        });
        
        if (validationErrors.length > 5) {
          console.error(`   ... y ${validationErrors.length - 5} errores más`);
        }
        
        const errorMessage = `Se encontraron ${validationErrors.length} registros con errores. ` +
          `Primera fila con error (${validationErrors[0].row}): ${validationErrors[0].errors.join(', ')}`;
        
        throw new Error(errorMessage);
      }
      
      // Si todo está bien, insertar los datos
      console.log('✅ Validación completada. Insertando datos...');
      
      await Questions.bulkCreate(csvData);
      const questions = await questionsService.getLastQuestions(csvData.length);
      const fileNameWithoutExt = file.originalFilename.replace(/\.[^/.]+$/, '');
      
      await historicService.addRecord(
        fileNameWithoutExt,
        questions, 
        'Multiple', 
        ''
      );

      console.log(`✅ ${csvData.length} preguntas importadas exitosamente`);

      return {
        message: `Datos cargados correctamente desde ${file.originalFilename}`,
        fileName: file.originalFilename,
        rowsAmount: csvData.length,
      };
      
    } catch (e) {
      console.error('❌ Error al procesar CSV:', e);
      
      // Crear un objeto de error consistente
      const errorObj = {
        message: e.message || 'Error al procesar el archivo CSV',
        fileName: file.originalFilename,
        error: e,
      };
      
      // Si es un error de base de datos, incluir la información SQL
      if (e.original && e.original.sqlMessage) {
        errorObj.original = {
          sqlMessage: e.original.sqlMessage,
          code: e.original.code,
          errno: e.original.errno
        };
      }
      
      throw errorObj;
    }
  }

  // Método para diagnosticar problemas en un CSV
  async diagnoseCsvFile(filePath) {
    console.log('🔍 Diagnosticando archivo CSV...\n');
    
    try {
      const data = await this.transformData(filePath);
      
      if (!data || data.length === 0) {
        console.log('❌ No se encontraron datos en el archivo');
        return;
      }
      
      console.log(`📊 Total de registros: ${data.length}`);
      console.log('\n📋 Muestra de los primeros 3 registros:');
      
      data.slice(0, 3).forEach((record, index) => {
        console.log(`\nRegistro ${index + 1}:`);
        Object.entries(record).forEach(([key, value]) => {
          console.log(`   ${key}: "${value}" (tipo: ${typeof value})`);
        });
      });
      
      // Análisis de respuestas correctas
      console.log('\n📈 Análisis de respuestas correctas:');
      const answerCounts = {};
      data.forEach(record => {
        const answer = record.correctAnswer || 'VACIO';
        answerCounts[answer] = (answerCounts[answer] || 0) + 1;
      });
      
      Object.entries(answerCounts).forEach(([answer, count]) => {
        console.log(`   "${answer}": ${count} veces`);
      });
      
      // Detectar problemas comunes
      const problemasComunes = {
        respuestasMinusculas: data.filter(r => r.correctAnswer && /[a-c]/.test(r.correctAnswer)).length,
        bloqueInvalido: data.filter(r => r.block && !['1', '2', '3'].includes(String(r.block))).length,
        temaInvalido: data.filter(r => {
          const topic = parseInt(r.topic);
          return isNaN(topic) || topic < 1 || topic > 45;
        }).length,
        camposVacios: data.filter(r => !r.question || !r.optionA || !r.optionB || !r.optionC).length
      };
      
      console.log('\n⚠️  Problemas detectados:');
      Object.entries(problemasComunes).forEach(([problema, cantidad]) => {
        if (cantidad > 0) {
          console.log(`   ${problema}: ${cantidad} registros`);
        }
      });
      
    } catch (error) {
      console.error('❌ Error al diagnosticar CSV:', error);
    }
  }
} // <-- ESTA ES LA LLAVE DE CIERRE DE LA CLASE

export default UploadService;