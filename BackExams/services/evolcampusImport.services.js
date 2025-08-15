// BackExams/services/evolcampusImport.services.js
import csv from 'csv-parser';
import fs from 'fs';
import Questions from '../models/questions.model.js';
import ImportLogs from '../models/importLogs.model.js';
import { Op } from 'sequelize';

/**
 * Servicio especializado para importar CSV desde Evolcampus
 * Maneja la detección de respuestas marcadas con "x" y transformaciones específicas
 */
class EvolcampusImportService {
  
  /**
   * Calcula el bloque según el tema
   * @param {number} topic - Número del tema (1-45)
   * @returns {string} - Bloque ('1', '2', '3')
   */
  calculateBlock(topic) {
    const topicNum = parseInt(topic);
    if (topicNum >= 1 && topicNum <= 26) return '1';
    if (topicNum >= 27 && topicNum <= 37) return '2';
    if (topicNum >= 38 && topicNum <= 45) return '3';
    throw new Error(`Tema inválido: ${topic}. Debe estar entre 1 y 45.`);
  }

  /**
   * Detecta cuál opción tiene la "x" y devuelve la letra correspondiente
   * @param {object} row - Fila del CSV con las opciones
   * @returns {object} - {correctAnswer: 'A'|'B'|'C', cleanedOptions: {optionA, optionB, optionC}}
   */
  detectCorrectAnswer(row) {
    const options = {
      A: row['Opción A'] || row['OpcionA'] || row['OptionA'] || row['A'] || '',
      B: row['Opción B'] || row['OpcionB'] || row['OptionB'] || row['B'] || '',
      C: row['Opción C'] || row['OpcionC'] || row['OptionC'] || row['C'] || ''
    };

    let correctAnswer = null;
    const cleanedOptions = {};

    // Buscar la "x" en cada opción y limpiarla
    Object.entries(options).forEach(([letter, option]) => {
      const optionStr = String(option).trim();
      
      // Detectar si esta opción tiene la "x"
      const hasX = /^x\s+/i.test(optionStr) || /^\s*x\s+/i.test(optionStr);
      
      if (hasX) {
        if (correctAnswer) {
          throw new Error(`Múltiples respuestas marcadas con "x" encontradas. Ya había "${correctAnswer}" y ahora "${letter}".`);
        }
        correctAnswer = letter;
        // Limpiar la "x" del inicio
        cleanedOptions[`option${letter}`] = optionStr.replace(/^x\s+/i, '').replace(/^\s*x\s+/i, '').trim();
      } else {
        cleanedOptions[`option${letter}`] = optionStr;
      }
    });

    if (!correctAnswer) {
      throw new Error('No se encontró ninguna respuesta marcada con "x".');
    }

    return { correctAnswer, cleanedOptions };
  }

  /**
   * Valida que una pregunta tenga todos los campos requeridos
   * @param {object} question - Objeto pregunta a validar
   * @param {number} rowIndex - Índice de la fila para reportar errores
   * @returns {string[]} - Array de errores encontrados
   */
  validateQuestion(question, rowIndex) {
    const errors = [];
    const rowNum = rowIndex + 1;

    if (!question.question || question.question.trim() === '') {
      errors.push(`Fila ${rowNum}: Falta el texto de la pregunta`);
    }

    if (!question.optionA || question.optionA.trim() === '') {
      errors.push(`Fila ${rowNum}: Falta la opción A`);
    }

    if (!question.optionB || question.optionB.trim() === '') {
      errors.push(`Fila ${rowNum}: Falta la opción B`);
    }

    if (!question.optionC || question.optionC.trim() === '') {
      errors.push(`Fila ${rowNum}: Falta la opción C`);
    }

    if (!question.correctAnswer || !['A', 'B', 'C'].includes(question.correctAnswer)) {
      errors.push(`Fila ${rowNum}: Respuesta correcta inválida: "${question.correctAnswer}"`);
    }

    if (!question.topic || isNaN(parseInt(question.topic)) || parseInt(question.topic) < 1 || parseInt(question.topic) > 45) {
      errors.push(`Fila ${rowNum}: Tema inválido: "${question.topic}"`);
    }

    return errors;
  }

  /**
   * Transforma los datos del CSV de Evolcampus al formato requerido
   * @param {string} filePath - Ruta del archivo CSV
   * @param {number} topic - Tema a asignar a todas las preguntas
   * @returns {Promise<object>} - {questions: Array, errors: Array}
   */
  async transformCSV(filePath, topic) {
    const questions = [];
    const errors = [];
    const block = this.calculateBlock(topic);
    
    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(filePath, { encoding: 'utf8' })
        .pipe(csv({
          separator: ';',
          headers: true,
          skipEmptyLines: true,
          bom: true
        }))
        .on('data', (row) => {
          results.push(row);
        })
        .on('end', () => {
          console.log(`📄 Procesando ${results.length} filas del CSV`);
          
          results.forEach((row, index) => {
            try {
              // Detectar respuesta correcta y limpiar opciones
              const { correctAnswer, cleanedOptions } = this.detectCorrectAnswer(row);
              
              // Obtener el texto de la pregunta
              const questionText = row['Pregunta'] || row['Question'] || row['Enunciado'] || '';
              
              // Crear objeto pregunta
              const question = {
                question: questionText.trim(),
                optionA: cleanedOptions.optionA,
                optionB: cleanedOptions.optionB,
                optionC: cleanedOptions.optionC,
                correctAnswer,
                topic: parseInt(topic),
                block,
                feedback: row['Feedback'] || row['Explicación'] || null
              };

              // Validar la pregunta
              const validationErrors = this.validateQuestion(question, index);
              
              if (validationErrors.length > 0) {
                errors.push(...validationErrors);
              } else {
                questions.push(question);
              }
              
            } catch (error) {
              errors.push(`Fila ${index + 1}: ${error.message}`);
            }
          });
          
          resolve({ questions, errors });
        })
        .on('error', (error) => {
          reject(new Error(`Error al leer el CSV: ${error.message}`));
        });
    });
  }

  /**
   * Busca preguntas duplicadas en la base de datos
   * @param {Array} questions - Array de preguntas a verificar
   * @returns {Promise<Array>} - Array de preguntas con información de duplicados
   */
  async checkDuplicates(questions) {
    const questionsWithDuplicateInfo = [];
    
    for (const question of questions) {
      // Buscar pregunta duplicada por texto similar (primeras 100 caracteres)
      const existingQuestion = await Questions.findOne({
        where: {
          question: {
            [Op.like]: `${question.question.substring(0, 100)}%`
          }
        }
      });
      
      questionsWithDuplicateInfo.push({
        ...question,
        isDuplicate: !!existingQuestion,
        existingId: existingQuestion?.id || null,
        status: existingQuestion ? 'update' : 'new'
      });
    }
    
    return questionsWithDuplicateInfo;
  }

  /**
   * Genera preview de las preguntas sin guardar en base de datos
   * @param {string} filePath - Ruta del archivo CSV
   * @param {number} topic - Tema asignado
   * @returns {Promise<object>} - Preview con preguntas y estadísticas
   */
  async generatePreview(filePath, topic) {
    const startTime = Date.now();
    
    try {
      // Validar tema
      if (!topic || isNaN(parseInt(topic)) || parseInt(topic) < 1 || parseInt(topic) > 45) {
        throw new Error(`Tema inválido: ${topic}. Debe ser un número entre 1 y 45.`);
      }

      // Transformar CSV
      const { questions, errors } = await this.transformCSV(filePath, topic);
      
      if (questions.length === 0 && errors.length > 0) {
        throw new Error(`No se pudieron procesar preguntas válidas. Errores: ${errors.slice(0, 3).join('; ')}`);
      }

      // Verificar duplicados
      const questionsWithDuplicateInfo = await this.checkDuplicates(questions);
      
      // Calcular estadísticas
      const stats = {
        total: questionsWithDuplicateInfo.length,
        new: questionsWithDuplicateInfo.filter(q => q.status === 'new').length,
        duplicates: questionsWithDuplicateInfo.filter(q => q.isDuplicate).length,
        errors: errors.length,
        topic: parseInt(topic),
        block: this.calculateBlock(topic),
        processingTime: Date.now() - startTime
      };

      return {
        success: true,
        questions: questionsWithDuplicateInfo,
        stats,
        errors: errors.slice(0, 10), // Limitar errores mostrados
        hasMoreErrors: errors.length > 10
      };
      
    } catch (error) {
      console.error('❌ Error generando preview:', error);
      throw error;
    }
  }

  /**
   * Confirma e importa las preguntas seleccionadas
   * @param {Array} selectedQuestions - Preguntas seleccionadas para importar
   * @param {string} fileName - Nombre del archivo original
   * @param {string} userId - ID del usuario (opcional)
   * @returns {Promise<object>} - Resultado de la importación
   */
  async confirmImport(selectedQuestions, fileName, userId = null) {
    const startTime = Date.now();
    let importLog = null;
    
    try {
      if (!selectedQuestions || selectedQuestions.length === 0) {
        throw new Error('No hay preguntas seleccionadas para importar');
      }

      // Crear log de importación inicial
      const topic = selectedQuestions[0].topic;
      const block = selectedQuestions[0].block;
      
      importLog = await ImportLogs.create({
        fileName,
        topic,
        block,
        totalQuestions: selectedQuestions.length,
        userId,
        status: 'pending'
      });

      let newQuestions = 0;
      let updatedQuestions = 0;
      const results = [];

      // Procesar cada pregunta
      for (const questionData of selectedQuestions) {
        try {
          // Remover campos de control antes de guardar
          const cleanQuestion = {
            question: questionData.question,
            optionA: questionData.optionA,
            optionB: questionData.optionB,
            optionC: questionData.optionC,
            correctAnswer: questionData.correctAnswer,
            topic: questionData.topic,
            block: questionData.block,
            feedback: questionData.feedback
          };

          if (questionData.status === 'update' && questionData.existingId) {
            // Actualizar pregunta existente
            await Questions.update(cleanQuestion, {
              where: { id: questionData.existingId }
            });
            updatedQuestions++;
            results.push({ action: 'updated', id: questionData.existingId });
          } else {
            // Crear nueva pregunta
            const newQuestion = await Questions.create(cleanQuestion);
            newQuestions++;
            results.push({ action: 'created', id: newQuestion.id });
          }
        } catch (error) {
          console.error(`Error procesando pregunta: ${error.message}`);
          results.push({ action: 'error', error: error.message });
        }
      }

      // Actualizar log de importación
      const processingTime = Date.now() - startTime;
      await importLog.update({
        newQuestions,
        updatedQuestions,
        status: 'completed',
        processingTime,
        importedData: {
          results: results.slice(0, 10), // Guardar solo una muestra
          totalResults: results.length
        }
      });

      console.log(`✅ Importación completada: ${newQuestions} nuevas, ${updatedQuestions} actualizadas`);

      return {
        success: true,
        summary: {
          total: selectedQuestions.length,
          newQuestions,
          updatedQuestions,
          errors: results.filter(r => r.action === 'error').length,
          processingTime
        },
        logId: importLog.id
      };

    } catch (error) {
      console.error('❌ Error en confirmImport:', error);
      
      // Actualizar log como fallido si existe
      if (importLog) {
        await importLog.update({
          status: 'failed',
          errors: [error.message],
          processingTime: Date.now() - startTime
        });
      }
      
      throw error;
    }
  }

  /**
   * Obtiene el historial de importaciones
   * @param {number} limit - Número máximo de registros a devolver
   * @returns {Promise<Array>} - Array de logs de importación
   */
  async getImportHistory(limit = 50) {
    return await ImportLogs.findAll({
      order: [['createdAt', 'DESC']],
      limit,
      attributes: [
        'id', 'fileName', 'topic', 'block', 'totalQuestions', 
        'newQuestions', 'updatedQuestions', 'status', 
        'processingTime', 'createdAt'
      ]
    });
  }

  /**
   * Obtiene detalles de una importación específica
   * @param {number} logId - ID del log de importación
   * @returns {Promise<object>} - Detalles completos del log
   */
  async getImportDetails(logId) {
    const log = await ImportLogs.findByPk(logId);
    if (!log) {
      throw new Error(`Log de importación ${logId} no encontrado`);
    }
    return log;
  }
}

export default EvolcampusImportService;
