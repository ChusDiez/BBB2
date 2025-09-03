// BackExams/services/unifiedUpload.services.js
import csv from 'csv-parser';
import fs from 'fs';
import Questions from '../models/questions.model.js';
import Historic from '../models/historicExams.model.js';
import SpecificExam from '../models/specificExams.model.js';
import mapHeader from '../config/headers.js';
import QuestionService from './questions.services.js';
import HistoricService from './historic.services.js';

const questionsService = new QuestionService();
const historicService = new HistoricService();

/**
 * 🎯 SISTEMA UNIFICADO DE SUBIDA DE PREGUNTAS CON CONTROL FLEXIBLE
 * 
 * Soporta 4 tipos de subida:
 * 1. DIRECTA: Inmediatamente disponible (comportamiento actual)
 * 2. RF CON VENTANA: Disponible en fechas específicas + liberación automática
 * 3. PREGUNTAS FUTURAS: Subir ahora, liberar después (trabajo previo)
 * 4. EXAMEN PERSONALIZADO: Tests específicos independientes del pool global
 */
class UnifiedUploadService {
  
  /**
   * 🛡️ FUNCIÓN PARA LIMPIAR DATOS AL IMPORTAR
   * Heredada del servicio original con mejoras
   */
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
          value = value.replace(/\n{3,}/g, '\n\n');
        } else {
          value = value.replace(/\n/g, ' ');
        }
        
        // Limpiar espacios múltiples
        value = value.replace(/[ \t]+/g, ' ');
        value = value.trim();
        
        // IMPORTANTE: Normalizar respuestas correctas a mayúsculas
        if (key === 'correctAnswer') {
          value = value.toUpperCase();
          if (!['A', 'B', 'C'].includes(value)) {
            console.warn(`⚠️ Respuesta correcta inválida: "${value}". Se esperaba A, B o C.`);
            if (value === 'X' || value === '1') value = 'A';
            else if (value === '2') value = 'B';
            else if (value === '3') value = 'C';
            else value = null;
          }
        }
        
        // IMPORTANTE: Normalizar el campo block
        if (key === 'block') {
          value = String(value);
          if (!['1', '2', '3'].includes(value)) {
            console.warn(`⚠️ Bloque inválido: "${value}". Se esperaba 1, 2 o 3.`);
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
            value = topicNum;
          }
        }
        
        sanitized[key] = value || null;
      } else {
        sanitized[key] = data[key];
      }
    });
    
    return sanitized;
  }

  /**
   * 📋 TRANSFORMAR CSV A JSON
   * Heredada del servicio original
   */
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
        .on('end', () => {
          resolve(jsonData);
        })
        .on('error', (e) => {
          reject(e);
        });
    });
  }

  /**
   * 🔍 VALIDACIÓN DETALLADA DE DATOS
   * Mejorada con mejor reporte de errores
   */
  validateCsvData(csvData) {
    const validationErrors = [];
    const invalidRecords = [];
    
    csvData.forEach((record, index) => {
      const errors = [];
      const rowNum = index + 2;
      
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
    
    return { validationErrors, invalidRecords };
  }

  /**
   * 🎯 FUNCIÓN PRINCIPAL: SUBIDA UNIFICADA DE CSV
   * 
   * @param {string} filePath - Ruta del archivo CSV
   * @param {Object} uploadOptions - Opciones de subida flexible
   * @returns {Object} Resultado de la operación
   */
  async uploadCSV(filePath, uploadOptions = {}) {
    try {
      console.log(`📄 Procesando archivo CSV con tipo: ${uploadOptions.uploadType || 'direct'}`);
      
      // Procesar y validar CSV
      const csvData = await this.transformData(filePath);
      
      if (!csvData || csvData.length === 0) {
        throw new Error('El archivo CSV está vacío o no tiene el formato correcto');
      }
      
      console.log(`📊 Registros encontrados: ${csvData.length}`);
      
      // Validación detallada
      const { validationErrors } = this.validateCsvData(csvData);
      
      if (validationErrors.length > 0) {
        console.error('❌ Errores de validación encontrados:');
        validationErrors.slice(0, 5).forEach(error => {
          console.error(`   Fila ${error.row}: ${error.errors.join(', ')}`);
        });
        
        const errorMessage = `Se encontraron ${validationErrors.length} registros con errores.`;
        throw new Error(errorMessage);
      }
      
      // Determinar globally_available según el tipo de subida
      const globallyAvailable = this.determineGlobalAvailability(uploadOptions);
      
      // Añadir globally_available a cada pregunta
      const questionsToCreate = csvData.map(question => ({
        ...question,
        globally_available: globallyAvailable
      }));
      
      console.log(`✅ Validación completada. Insertando ${questionsToCreate.length} preguntas...`);
      console.log(`🌍 globally_available: ${globallyAvailable}`);
      
      // Insertar preguntas en la base de datos
      await Questions.bulkCreate(questionsToCreate);
      const questions = await questionsService.getLastQuestions(questionsToCreate.length);
      
      // Crear registro en historic
      const historicName = this.generateHistoricName(uploadOptions);
      const historicIdExam = await historicService.addRecord(
        historicName,
        questions,
        'Multiple',
        uploadOptions.uploadType || 'UPLOAD'
      );
      
      // Crear registro en specific_exams si es necesario
      let specificExam = null;
      if (this.needsSpecificExamRecord(uploadOptions)) {
        specificExam = await this.createSpecificExamRecord(
          historicIdExam,
          uploadOptions,
          questionsToCreate.length
        );
      }
      
      console.log(`✅ ${questionsToCreate.length} preguntas subidas exitosamente`);
      
      return {
        success: true,
        uploadType: uploadOptions.uploadType || 'direct',
        historicId: historicIdExam,
        specificExamId: specificExam ? specificExam.id : null,
        totalQuestions: questionsToCreate.length,
        globallyAvailable: globallyAvailable,
        message: this.generateSuccessMessage(uploadOptions, questionsToCreate.length),
        totalProcessed: csvData.length,
        totalInserted: questionsToCreate.length,
        duplicates: 0,
        errors: []
      };
      
    } catch (error) {
      console.error('❌ Error en uploadCSV:', error);
      throw error;
    }
  }

  /**
   * 🎯 HELPERS PARA DIFERENTES TIPOS DE SUBIDA
   */

  /**
   * Determina si las preguntas deben estar globally_available
   */
  determineGlobalAvailability(uploadOptions) {
    switch (uploadOptions.uploadType) {
      case 'direct':
        return true;
      case 'rf_exam':
      case 'future_questions':
      case 'custom_exam':
        return uploadOptions.immediatelyAvailable || false;
      default:
        return true; // Comportamiento por defecto (compatibilidad hacia atrás)
    }
  }

  /**
   * Genera el nombre para el registro historic
   */
  generateHistoricName(uploadOptions) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    
    switch (uploadOptions.uploadType) {
      case 'rf_exam':
        return uploadOptions.rfWindow?.examName || `RF_${timestamp}`;
      case 'future_questions':
        return `FUTURE_${timestamp}`;
      case 'custom_exam':
        return uploadOptions.customExam?.examName || `CUSTOM_${timestamp}`;
      case 'direct':
      default:
        return `UPLOAD_${timestamp}`;
    }
  }

  /**
   * Genera el mensaje de éxito
   */
  generateSuccessMessage(uploadOptions, totalQuestions) {
    switch (uploadOptions.uploadType) {
      case 'rf_exam':
        return `RF "${uploadOptions.rfWindow?.examName}" subido exitosamente con ${totalQuestions} preguntas`;
      case 'future_questions':
        return `${totalQuestions} preguntas futuras subidas exitosamente`;
      case 'custom_exam':
        return `Examen personalizado "${uploadOptions.customExam?.examName}" subido exitosamente con ${totalQuestions} preguntas`;
      case 'direct':
      default:
        return `${totalQuestions} preguntas subidas exitosamente`;
    }
  }

  /**
   * Determina si necesita crear registro en specific_exams
   */
  needsSpecificExamRecord(uploadOptions) {
    return ['rf_exam', 'future_questions', 'custom_exam'].includes(uploadOptions.uploadType);
  }

  /**
   * Crea registro en specific_exams
   */
  async createSpecificExamRecord(historicId, uploadOptions, totalQuestions) {
    const baseData = {
      historic_id: historicId,
      total_questions: totalQuestions,
      immediately_available: uploadOptions.immediatelyAvailable || false,
    };

    switch (uploadOptions.uploadType) {
      case 'rf_exam':
        return await SpecificExam.create({
          ...baseData,
          exam_name: uploadOptions.rfWindow?.examName || `RF_${Date.now()}`,
          exam_type: 'rf',
          status: 'active',
          window_start_date: uploadOptions.rfWindow?.startDate || null,
          window_end_date: uploadOptions.rfWindow?.endDate || null,
          global_release_date: uploadOptions.globalRelease?.releaseDate || null,
          auto_release: uploadOptions.globalRelease?.autoRelease || false,
        });

      case 'future_questions':
        return await SpecificExam.create({
          ...baseData,
          exam_name: `Preguntas Futuras ${new Date().toLocaleDateString()}`,
          exam_type: 'future',
          status: 'draft',
          global_release_date: uploadOptions.globalRelease?.releaseDate || null,
          auto_release: uploadOptions.globalRelease?.autoRelease || false,
        });

      case 'custom_exam':
        return await SpecificExam.create({
          ...baseData,
          exam_name: uploadOptions.customExam?.examName || `Examen Personalizado ${Date.now()}`,
          exam_type: uploadOptions.customExam?.examType || 'custom',
          status: uploadOptions.customExam?.availabilityType === 'permanent' ? 'active' : 'draft',
        });

      default:
        return null;
    }
  }

  /**
   * Genera mensaje de éxito personalizado
   */
  generateSuccessMessage(uploadOptions, totalQuestions) {
    switch (uploadOptions.uploadType) {
      case 'rf_exam':
        return `✅ RF ${uploadOptions.rfWindow?.examName} subido: ${totalQuestions} preguntas con ventana específica`;
      case 'future_questions':
        return `✅ Preguntas futuras subidas: ${totalQuestions} preguntas para liberación posterior`;
      case 'custom_exam':
        return `✅ Examen personalizado "${uploadOptions.customExam?.examName}" creado con ${totalQuestions} preguntas`;
      case 'direct':
      default:
        return `✅ Subida directa completada: ${totalQuestions} preguntas disponibles inmediatamente`;
    }
  }

  /**
   * 🎯 MÉTODOS HELPERS ESPECÍFICOS PARA CADA TIPO DE SUBIDA
   */

  /**
   * 1️⃣ SUBIDA DIRECTA (comportamiento actual)
   */
  async uploadDirect(filePath, options = {}) {
    return await this.uploadCSV(filePath, {
      uploadType: 'direct',
      immediatelyAvailable: true,
      ...options
    });
  }

  /**
   * 2️⃣ RF CON VENTANA ESPECÍFICA
   */
  async uploadRFExam(filePath, rfOptions) {
    if (!rfOptions.examName) {
      throw new Error('Se requiere examName para RF');
    }
    
    return await this.uploadCSV(filePath, {
      uploadType: 'rf_exam',
      immediatelyAvailable: false,
      rfWindow: {
        startDate: rfOptions.startDate,
        endDate: rfOptions.endDate,
        examName: rfOptions.examName
      },
      globalRelease: {
        releaseDate: rfOptions.globalReleaseDate,
        autoRelease: rfOptions.autoRelease || true
      }
    });
  }

  /**
   * 3️⃣ PREGUNTAS FUTURAS
   */
  async uploadFutureQuestions(filePath, futureOptions = {}) {
    return await this.uploadCSV(filePath, {
      uploadType: 'future_questions',
      immediatelyAvailable: false,
      globalRelease: {
        releaseDate: futureOptions.releaseDate,
        autoRelease: futureOptions.autoRelease || false
      }
    });
  }

  /**
   * 4️⃣ EXAMEN PERSONALIZADO
   */
  async uploadCustomExam(filePath, customOptions) {
    if (!customOptions.examName) {
      throw new Error('Se requiere examName para examen personalizado');
    }
    
    return await this.uploadCSV(filePath, {
      uploadType: 'custom_exam',
      immediatelyAvailable: customOptions.immediatelyAvailable || false,
      customExam: {
        examName: customOptions.examName,
        examType: customOptions.examType || 'custom',
        availabilityType: customOptions.availabilityType || 'permanent'
      }
    });
  }

  /**
   * 📊 MÉTODO DE DIAGNÓSTICO (heredado y mejorado)
   */
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

  /**
   * 🔄 MÉTODO PARA MANTENER COMPATIBILIDAD CON SERVICIO ORIGINAL
   * Este método permite que el código existente siga funcionando
   */
  async insertCSV(file) {
    // Convertir el objeto file al formato que espera uploadCSV
    return await this.uploadDirect(file.path, {
      fileName: file.originalFilename
    });
  }
}

export default UnifiedUploadService;
