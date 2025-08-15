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
   * Maneja múltiples formatos de CSV de Evolcampus
   * @param {object} row - Fila del CSV con las opciones
   * @param {array} allRows - Todas las filas para contexto
   * @param {number} currentIndex - Índice actual para agrupación
   * @returns {object} - {correctAnswer: 'A'|'B'|'C', cleanedOptions: {optionA, optionB, optionC}}
   */
  detectCorrectAnswer(row, allRows, currentIndex) {
    // Formato 1: Estándar (x al inicio de la opción)
    const standardOptions = {
      A: row['Opción A'] || row['OpcionA'] || row['OptionA'] || row['A'] || '',
      B: row['Opción B'] || row['OpcionB'] || row['OptionB'] || row['B'] || '',
      C: row['Opción C'] || row['OpcionC'] || row['OptionC'] || row['C'] || ''
    };

    // Intentar formato estándar primero
    let correctAnswer = null;
    let cleanedOptions = {};
    let foundStandardFormat = false;

    Object.entries(standardOptions).forEach(([letter, option]) => {
      const optionStr = String(option).trim();
      const hasX = /^x\s+/i.test(optionStr) || /^\s*x\s+/i.test(optionStr);
      
      if (hasX) {
        foundStandardFormat = true;
        if (correctAnswer) {
          throw new Error(`Múltiples respuestas marcadas con "x" encontradas. Ya había "${correctAnswer}" y ahora "${letter}".`);
        }
        correctAnswer = letter;
        cleanedOptions[`option${letter}`] = optionStr.replace(/^x\s+/i, '').replace(/^\s*x\s+/i, '').trim();
      } else {
        cleanedOptions[`option${letter}`] = optionStr;
      }
    });

    if (foundStandardFormat && correctAnswer) {
      return { correctAnswer, cleanedOptions };
    }

    // Formato 2: CSV con estructura específica (pregunta, opciones, explicación)
    // Buscar patrón: fila con "*", seguida de opciones, una con "x" en columna 3
    
    // Obtener headers para trabajar con índices de columna
    const headers = Object.keys(row);
    
    // Verificar si es una "x" standalone en alguna columna
    for (let i = 0; i < headers.length; i++) {
      const cellValue = String(row[headers[i]] || '').trim();
      if (cellValue === 'x') {
        // Encontramos la "x", ahora necesitamos reconstruir las opciones
        return this.reconstructOptionsFromStructuredFormat(allRows, currentIndex, i);
      }
    }

    // Formato 3: Buscar "x" en cualquier parte de las celdas
    const allCells = Object.values(row);
    for (let i = 0; i < allCells.length; i++) {
      const cellValue = String(allCells[i] || '').trim();
      if (cellValue === 'x') {
        // La columna i tiene la "x"
        return this.reconstructOptionsFromStructuredFormat(allRows, currentIndex, i);
      }
    }

    throw new Error('No se encontró ninguna respuesta marcada con "x".');
  }

  /**
   * Reconstruye las opciones desde un formato estructurado
   * @param {array} allRows - Todas las filas
   * @param {number} questionIndex - Índice de la pregunta
   * @param {number} correctColumn - Columna que contiene la "x"
   * @returns {object} - Opciones reconstruidas
   */
  reconstructOptionsFromStructuredFormat(allRows, questionIndex, correctColumn) {
    const options = [];
    const question = this.findQuestionInStructuredFormat(allRows, questionIndex);
    
    // Buscar las opciones relacionadas con esta pregunta
    let i = questionIndex;
    while (i < allRows.length) {
      const row = allRows[i];
      const firstCell = String(Object.values(row)[0] || '').trim();
      const secondCell = String(Object.values(row)[1] || '').trim();
      
      // Si encontramos otra pregunta (*) o explicación (@), paramos
      if ((firstCell === '*' || firstCell === '@') && i > questionIndex) {
        break;
      }
      
      // Si la primera columna está vacía y la segunda tiene contenido, es una opción
      if (!firstCell && secondCell) {
        options.push({
          text: secondCell,
          columnIndex: i,
          hasX: Object.values(row).some((cell, cellIndex) => 
            String(cell || '').trim() === 'x' && cellIndex === correctColumn
          )
        });
      }
      
      i++;
    }

    if (options.length === 0) {
      throw new Error('No se encontraron opciones para la pregunta.');
    }

    // Asignar letras A, B, C a las opciones encontradas
    const cleanedOptions = {};
    let correctAnswer = null;
    
    options.forEach((option, index) => {
      const letter = String.fromCharCode(65 + index); // A, B, C
      cleanedOptions[`option${letter}`] = option.text;
      
      if (option.hasX) {
        if (correctAnswer) {
          throw new Error(`Múltiples respuestas marcadas encontradas.`);
        }
        correctAnswer = letter;
      }
    });

    if (!correctAnswer) {
      throw new Error('No se encontró respuesta correcta marcada en las opciones.');
    }

    return { correctAnswer, cleanedOptions };
  }

  /**
   * Encuentra el texto de la pregunta en formato estructurado
   * @param {array} allRows - Todas las filas
   * @param {number} startIndex - Índice donde empezar a buscar
   * @returns {string} - Texto de la pregunta
   */
  findQuestionInStructuredFormat(allRows, startIndex) {
    // Buscar hacia atrás la fila que empiece con "*"
    for (let i = startIndex; i >= 0; i--) {
      const row = allRows[i];
      const firstCell = String(Object.values(row)[0] || '').trim();
      const secondCell = String(Object.values(row)[1] || '').trim();
      
      if (firstCell === '*') {
        return secondCell || 'Pregunta sin texto';
      }
    }
    
    return 'Pregunta no encontrada';
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
          headers: false, // Cambiado a false para manejar el formato estructurado
          skipEmptyLines: false, // Mantenemos líneas vacías para el contexto
          bom: true
        }))
        .on('data', (row) => {
          results.push(row);
        })
        .on('end', () => {
          console.log(`📄 Procesando ${results.length} filas del CSV`);
          
          // Procesar formato estructurado: buscar preguntas (*)
          const processedQuestions = this.parseStructuredFormat(results, topic, block);
          
          processedQuestions.forEach((result) => {
            if (result.success) {
              questions.push(result.question);
            } else {
              errors.push(result.error);
            }
          });
          
          console.log(`✅ Preguntas procesadas: ${questions.length}, Errores: ${errors.length}`);
          resolve({ questions, errors });
        })
        .on('error', (error) => {
          reject(new Error(`Error al leer el CSV: ${error.message}`));
        });
    });
  }

  /**
   * Procesa CSV con formato estructurado (*, opciones, @)
   * @param {array} rows - Todas las filas del CSV
   * @param {number} topic - Tema asignado
   * @param {string} block - Bloque calculado
   * @returns {array} - Array de resultados procesados
   */
  parseStructuredFormat(rows, topic, block) {
    const results = [];
    let currentQuestionIndex = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const firstCol = String(Object.values(row)[0] || '').trim();
      const secondCol = String(Object.values(row)[1] || '').trim();
      
      // Buscar inicio de pregunta (*)
      if (firstCol === '*' && secondCol) {
        currentQuestionIndex++;
        
        try {
          // Extraer pregunta
          const questionText = secondCol;
          
          // Buscar opciones siguientes
          const options = [];
          let correctAnswer = null;
          let j = i + 1;
          
          while (j < rows.length) {
            const optionRow = rows[j];
            const optFirstCol = String(Object.values(optionRow)[0] || '').trim();
            const optSecondCol = String(Object.values(optionRow)[1] || '').trim();
            
            // Si encontramos otra pregunta (*) o explicación (@), paramos
            if (optFirstCol === '*' || optFirstCol === '@') {
              break;
            }
            
            // Si primera columna vacía y segunda con contenido = opción
            if (!optFirstCol && optSecondCol) {
              const optionLetter = String.fromCharCode(65 + options.length); // A, B, C
              options.push({
                letter: optionLetter,
                text: optSecondCol
              });
              
              // Verificar si esta fila tiene "x" en alguna columna
              const optionValues = Object.values(optionRow);
              for (let k = 0; k < optionValues.length; k++) {
                if (String(optionValues[k] || '').trim() === 'x') {
                  if (correctAnswer) {
                    throw new Error(`Múltiples respuestas marcadas en la pregunta ${currentQuestionIndex}`);
                  }
                  correctAnswer = optionLetter;
                }
              }
            }
            
            j++;
          }
          
          // Validar que tenemos todo lo necesario
          if (options.length < 3) {
            throw new Error(`La pregunta ${currentQuestionIndex} no tiene suficientes opciones (encontradas: ${options.length})`);
          }
          
          if (!correctAnswer) {
            throw new Error(`No se encontró respuesta correcta marcada en la pregunta ${currentQuestionIndex}`);
          }
          
          // Buscar feedback (@)
          let feedback = null;
          if (j < rows.length) {
            const feedbackRow = rows[j];
            const feedbackFirstCol = String(Object.values(feedbackRow)[0] || '').trim();
            const feedbackSecondCol = String(Object.values(feedbackRow)[1] || '').trim();
            
            if (feedbackFirstCol === '@' && feedbackSecondCol) {
              feedback = feedbackSecondCol;
            }
          }
          
          // Crear objeto pregunta
          const question = {
            question: questionText.trim(),
            optionA: options[0]?.text || '',
            optionB: options[1]?.text || '',
            optionC: options[2]?.text || '',
            correctAnswer,
            topic: parseInt(topic),
            block,
            feedback: feedback
          };
          
          // Validar pregunta
          const validationErrors = this.validateQuestion(question, currentQuestionIndex);
          
          if (validationErrors.length > 0) {
            results.push({
              success: false,
              error: `Pregunta ${currentQuestionIndex}: ${validationErrors.join(', ')}`
            });
          } else {
            results.push({
              success: true,
              question
            });
          }
          
        } catch (error) {
          results.push({
            success: false,
            error: `Pregunta ${currentQuestionIndex}: ${error.message}`
          });
        }
      }
    }
    
    return results;
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
