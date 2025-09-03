import { Op, Sequelize } from 'sequelize';
import Questions from '../models/questions.model.js';
import pool from '../libs/database.js';

/**
 * Servicio para manejar consultas por nivel de dificultad
 * Basado en estadísticas reales de game_questions
 */
class DifficultyService {
  /**
   * Obtiene preguntas por tema y nivel de dificultad con sistema de cascada
   * @param {number} amount - Cantidad de preguntas
   * @param {number} topic - Número del tema
   * @param {string} difficulty - Nivel de dificultad (MUY_FACIL, FACIL, MEDIO, DIFICIL, MUY_DIFICIL)
   * @returns {Promise<Object>} Array de preguntas con breakdown de dificultades
   */
  async getQuestionsByTopicAndDifficulty(amount, topic, difficulty) {
    // Si no se especifica dificultad, obtener preguntas aleatorias
    if (!difficulty) {
      const questions = await this.getRandomQuestions(amount, topic);
      return {
        questions,
        difficultyBreakdown: {
          MUY_FACIL: 0,
          FACIL: 0,
          MEDIO: 0,
          DIFICIL: 0,
          MUY_DIFICIL: 0,
          ALEATORIO: questions.length
        },
        totalRequested: amount,
        totalObtained: questions.length
      };
    }

    // Mapear niveles de dificultad a rangos de porcentaje de acierto
    const difficultyRanges = {
      'MUY_FACIL': { min: 0.8, max: 1.0, order: 1 },    // 80-100%
      'FACIL': { min: 0.6, max: 0.79, order: 2 },       // 60-79%
      'MEDIO': { min: 0.4, max: 0.59, order: 3 },       // 40-59%
      'DIFICIL': { min: 0.2, max: 0.39, order: 4 },     // 20-39%
      'MUY_DIFICIL': { min: 0.0, max: 0.19, order: 5 }  // 0-19%
    };

    if (!difficultyRanges[difficulty]) {
      throw new Error(`Nivel de dificultad no válido: ${difficulty}`);
    }

    try {
      // Sistema de cascada: empezar por el nivel solicitado y ir bajando
      const orderedDifficulties = this.getOrderedDifficultiesFromRequested(difficulty);
      let allQuestions = [];
      let difficultyBreakdown = {
        MUY_FACIL: 0,
        FACIL: 0,
        MEDIO: 0,
        DIFICIL: 0,
        MUY_DIFICIL: 0,
        ALEATORIO: 0
      };
      let remainingAmount = amount;

      console.log(`🎯 Iniciando búsqueda cascada para ${amount} preguntas, empezando por ${difficulty}`);

      // Intentar obtener preguntas de cada nivel en orden
      for (const diffLevel of orderedDifficulties) {
        if (remainingAmount <= 0) break;

        const range = difficultyRanges[diffLevel];
        const questionsFromLevel = await this.getQuestionsFromDifficultyRange(
          remainingAmount, 
          topic, 
          range.min, 
          range.max,
          allQuestions.map(q => q.id) // Excluir preguntas ya obtenidas
        );

        if (questionsFromLevel.length > 0) {
          console.log(`✅ ${questionsFromLevel.length} preguntas obtenidas de nivel ${diffLevel}`);
          allQuestions.push(...questionsFromLevel);
          difficultyBreakdown[diffLevel] = questionsFromLevel.length;
          remainingAmount -= questionsFromLevel.length;
        } else {
          console.log(`❌ 0 preguntas disponibles en nivel ${diffLevel}`);
        }
      }

      // Si aún faltan preguntas, completar con aleatorias (sin estadísticas)
      if (remainingAmount > 0) {
        const randomQuestions = await this.getRandomQuestions(
          remainingAmount, 
          topic, 
          allQuestions.map(q => q.id)
        );
        if (randomQuestions.length > 0) {
          console.log(`🎲 ${randomQuestions.length} preguntas aleatorias para completar`);
          allQuestions.push(...randomQuestions);
          difficultyBreakdown.ALEATORIO = randomQuestions.length;
        }
      }

      return {
        questions: allQuestions.slice(0, amount),
        difficultyBreakdown,
        totalRequested: amount,
        totalObtained: allQuestions.length,
        requestedDifficulty: difficulty
      };

    } catch (error) {
      console.error('Error obteniendo preguntas por dificultad:', error);
      // Fallback a preguntas aleatorias en caso de error
      const questions = await this.getRandomQuestions(amount, topic);
      return {
        questions,
        difficultyBreakdown: {
          MUY_FACIL: 0,
          FACIL: 0,
          MEDIO: 0,
          DIFICIL: 0,
          MUY_DIFICIL: 0,
          ALEATORIO: questions.length
        },
        totalRequested: amount,
        totalObtained: questions.length
      };
    }
  }

  /**
   * Obtiene preguntas por tema y nivel de dificultad con sistema de cascada EXCLUYENDO preguntas específicas
   * @param {number} amount - Cantidad de preguntas
   * @param {number} topic - Número del tema
   * @param {string} difficulty - Nivel de dificultad (MUY_FACIL, FACIL, MEDIO, DIFICIL, MUY_DIFICIL) o null para aleatorio
   * @param {Array} excludedQuestions - Array de IDs de preguntas a excluir
   * @returns {Promise<Object>} Array de preguntas con breakdown de dificultades
   */
  async getQuestionsByTopicAndDifficultyWithExclusions(amount, topic, difficulty, excludedQuestions = []) {
    // excludedQuestions viene como array de strings (IDs), no como objetos
    const excludedIds = excludedQuestions.map(id => parseInt(id)).filter(id => !isNaN(id));
    console.log(`🚫 Excluyendo ${excludedIds.length} preguntas: [${excludedIds.slice(0, 5).join(', ')}${excludedIds.length > 5 ? '...' : ''}]`);

    // Si no se especifica dificultad, obtener preguntas aleatorias
    if (!difficulty) {
      const questions = await this.getRandomQuestions(amount, topic, excludedIds);
      return {
        questions,
        difficultyBreakdown: {
          MUY_FACIL: 0,
          FACIL: 0,
          MEDIO: 0,
          DIFICIL: 0,
          MUY_DIFICIL: 0,
          ALEATORIO: questions.length
        },
        totalRequested: amount,
        totalObtained: questions.length
      };
    }

    // Mapear niveles de dificultad a rangos de porcentaje de acierto
    const difficultyRanges = {
      'MUY_FACIL': { min: 0.8, max: 1.0, order: 1 },    // 80-100%
      'FACIL': { min: 0.6, max: 0.79, order: 2 },       // 60-79%
      'MEDIO': { min: 0.4, max: 0.59, order: 3 },       // 40-59%
      'DIFICIL': { min: 0.2, max: 0.39, order: 4 },     // 20-39%
      'MUY_DIFICIL': { min: 0.0, max: 0.19, order: 5 }  // 0-19%
    };

    if (!difficultyRanges[difficulty]) {
      throw new Error(`Nivel de dificultad no válido: ${difficulty}`);
    }

    try {
      // Sistema de cascada: empezar por el nivel solicitado y ir bajando
      const orderedDifficulties = this.getOrderedDifficultiesFromRequested(difficulty);
      let allQuestions = [];
      let difficultyBreakdown = {
        MUY_FACIL: 0,
        FACIL: 0,
        MEDIO: 0,
        DIFICIL: 0,
        MUY_DIFICIL: 0,
        ALEATORIO: 0
      };
      let remainingAmount = amount;

      console.log(`🎯 Iniciando búsqueda cascada CON EXCLUSIONES para ${amount} preguntas, empezando por ${difficulty}`);

      // Intentar obtener preguntas de cada nivel en orden
      for (const diffLevel of orderedDifficulties) {
        if (remainingAmount <= 0) break;

        const range = difficultyRanges[diffLevel];
        const questionsFromLevel = await this.getQuestionsFromDifficultyRange(
          remainingAmount, 
          topic, 
          range.min, 
          range.max,
          [...excludedIds, ...allQuestions.map(q => q.id)] // Excluir tanto las preguntas excluidas como las ya obtenidas
        );

        if (questionsFromLevel.length > 0) {
          console.log(`✅ ${questionsFromLevel.length} preguntas obtenidas de nivel ${diffLevel} (con exclusiones)`);
          allQuestions.push(...questionsFromLevel);
          difficultyBreakdown[diffLevel] = questionsFromLevel.length;
          remainingAmount -= questionsFromLevel.length;
        } else {
          console.log(`❌ 0 preguntas disponibles en nivel ${diffLevel} (con exclusiones)`);
        }
      }

      // Si aún faltan preguntas, completar con aleatorias (sin estadísticas)
      if (remainingAmount > 0) {
        const randomQuestions = await this.getRandomQuestions(
          remainingAmount, 
          topic, 
          [...excludedIds, ...allQuestions.map(q => q.id)]
        );
        if (randomQuestions.length > 0) {
          console.log(`🎲 ${randomQuestions.length} preguntas aleatorias para completar (con exclusiones)`);
          allQuestions.push(...randomQuestions);
          difficultyBreakdown.ALEATORIO = randomQuestions.length;
        }
      }

      return {
        questions: allQuestions.slice(0, amount),
        difficultyBreakdown,
        totalRequested: amount,
        totalObtained: allQuestions.length,
        requestedDifficulty: difficulty
      };

    } catch (error) {
      console.error('Error obteniendo preguntas por dificultad con exclusiones:', error);
      // Fallback a preguntas aleatorias en caso de error
      const questions = await this.getRandomQuestions(amount, topic, excludedIds);
      return {
        questions,
        difficultyBreakdown: {
          MUY_FACIL: 0,
          FACIL: 0,
          MEDIO: 0,
          DIFICIL: 0,
          MUY_DIFICIL: 0,
          ALEATORIO: questions.length
        },
        totalRequested: amount,
        totalObtained: questions.length
      };
    }
  }

  /**
   * Obtiene el orden de dificultades a partir del nivel solicitado
   * @param {string} requestedDifficulty - Nivel solicitado
   * @returns {Array<string>} Array ordenado de niveles de dificultad
   */
  getOrderedDifficultiesFromRequested(requestedDifficulty) {
    const allDifficulties = ['MUY_FACIL', 'FACIL', 'MEDIO', 'DIFICIL', 'MUY_DIFICIL'];
    const startIndex = allDifficulties.indexOf(requestedDifficulty);
    
    if (startIndex === -1) {
      return allDifficulties;
    }

    // Crear el orden: empezar por el solicitado, luego los siguientes
    const ordered = [];
    for (let i = startIndex; i < allDifficulties.length; i++) {
      ordered.push(allDifficulties[i]);
    }
    
    return ordered;
  }

  /**
   * Obtiene preguntas de un rango específico de dificultad
   * @param {number} amount - Cantidad de preguntas
   * @param {number} topic - Número del tema
   * @param {number} minRate - Tasa mínima de acierto
   * @param {number} maxRate - Tasa máxima de acierto
   * @param {Array} excludeIds - IDs de preguntas a excluir
   * @returns {Promise<Array>} Array de preguntas
   */
  async getQuestionsFromDifficultyRange(amount, topic, minRate, maxRate, excludeIds = []) {
    try {
      const excludeClause = excludeIds.length > 0 ? 'AND q.id NOT IN (:excludeIds)' : '';
      
      const query = `
        WITH question_difficulty AS (
          SELECT 
            q.id,
            q.block,
            q.topic,
            q.question,
            q."optionA",
            q."optionB", 
            q."optionC",
            q."correctAnswer",
            q.feedback,
            q."createdAt",
            q."updatedAt",
            q.globally_available,
            CASE 
              WHEN COUNT(gq.id) > 0 THEN 
                (SUM(CASE WHEN gq.player1_is_correct = true THEN 1 ELSE 0 END + 
                     CASE WHEN gq.player2_is_correct = true THEN 1 ELSE 0 END)::float / 
                 (COUNT(gq.id) * 2))
              ELSE 0.5 -- Para preguntas sin estadísticas, asumir dificultad media
            END as success_rate,
            COUNT(gq.id) as times_played
          FROM questions q
          LEFT JOIN game_questions gq ON q.id = gq.question_id
          WHERE q.topic = :topic 
            AND q.globally_available = true
            ${excludeClause}
          GROUP BY q.id, q.block, q.topic, q.question, q."optionA", q."optionB", q."optionC", 
                   q."correctAnswer", q.feedback, q."createdAt", q."updatedAt", q.globally_available
        )
        SELECT 
          id, block, topic, question, "optionA", "optionB", "optionC", 
          "correctAnswer", feedback, "createdAt", "updatedAt", globally_available
        FROM question_difficulty
        WHERE success_rate >= :minRate AND success_rate <= :maxRate
          AND times_played > 0  -- Solo preguntas con estadísticas
        ORDER BY RANDOM()
        LIMIT :amount;
      `;

      const replacements = {
        topic: topic,
        minRate: minRate,
        maxRate: maxRate,
        amount: amount
      };

      if (excludeIds.length > 0) {
        replacements.excludeIds = excludeIds;
      }

      const results = await pool.query(query, {
        replacements,
        type: Sequelize.QueryTypes.SELECT
      });

      return results;

    } catch (error) {
      console.error('Error obteniendo preguntas de rango de dificultad:', error);
      return [];
    }
  }

  /**
   * Obtiene preguntas aleatorias cuando no se especifica dificultad o como fallback
   * @param {number} amount - Cantidad de preguntas
   * @param {number} topic - Número del tema
   * @param {Array} excludeIds - IDs de preguntas a excluir
   * @returns {Promise<Array>} Array de preguntas
   */
  async getRandomQuestions(amount, topic, excludeIds = []) {
    const whereCondition = {
      topic: topic,
      globally_available: true
    };

    if (excludeIds.length > 0) {
      whereCondition.id = {
        [Op.notIn]: excludeIds
      };
    }

    return await Questions.findAll({
      where: whereCondition,
      order: Sequelize.literal('RANDOM()'),
      limit: amount
    });
  }

  /**
   * Obtiene estadísticas de dificultad para un tema específico
   * @param {number} topic - Número del tema
   * @returns {Promise<Object>} Estadísticas del tema
   */
  async getTopicDifficultyStats(topic) {
    try {
      // Usar subconsulta para evitar funciones agregadas anidadas
      const query = `
        WITH question_stats AS (
          SELECT 
            q.id,
            COUNT(gq.id) as times_played,
            CASE 
              WHEN COUNT(gq.id) > 0 THEN 
                (SUM(CASE WHEN gq.player1_is_correct = true THEN 1 ELSE 0 END + 
                     CASE WHEN gq.player2_is_correct = true THEN 1 ELSE 0 END)::float / 
                 (COUNT(gq.id) * 2))
              ELSE NULL 
            END as success_rate
          FROM questions q
          LEFT JOIN game_questions gq ON q.id = gq.question_id
          WHERE q.topic = :topic AND q.globally_available = true
          GROUP BY q.id
        )
        SELECT 
          COUNT(*) as total_questions,
          COUNT(CASE WHEN times_played > 0 THEN 1 END) as questions_with_stats,
          AVG(success_rate) as avg_success_rate,
          
          -- Conteo por nivel de dificultad
          COUNT(CASE WHEN success_rate >= 0.8 THEN 1 END) as muy_facil_count,
          COUNT(CASE WHEN success_rate >= 0.6 AND success_rate < 0.8 THEN 1 END) as facil_count,
          COUNT(CASE WHEN success_rate >= 0.4 AND success_rate < 0.6 THEN 1 END) as medio_count,
          COUNT(CASE WHEN success_rate >= 0.2 AND success_rate < 0.4 THEN 1 END) as dificil_count,
          COUNT(CASE WHEN success_rate < 0.2 THEN 1 END) as muy_dificil_count
          
        FROM question_stats
      `;

      const results = await pool.query(query, {
        replacements: { topic },
        type: Sequelize.QueryTypes.SELECT
      });

      const result = results[0] || {};
      
      return {
        topic,
        totalQuestions: parseInt(result.total_questions) || 0,
        questionsWithStats: parseInt(result.questions_with_stats) || 0,
        avgSuccessRate: result.avg_success_rate ? parseFloat(result.avg_success_rate) : null,
        difficultyBreakdown: {
          MUY_FACIL: parseInt(result.muy_facil_count) || 0,
          FACIL: parseInt(result.facil_count) || 0,
          MEDIO: parseInt(result.medio_count) || 0,
          DIFICIL: parseInt(result.dificil_count) || 0,
          MUY_DIFICIL: parseInt(result.muy_dificil_count) || 0
        }
      };

    } catch (error) {
      console.error('Error obteniendo estadísticas de dificultad:', error);
      return {
        topic,
        totalQuestions: 0,
        questionsWithStats: 0,
        avgSuccessRate: null,
        difficultyBreakdown: {
          MUY_FACIL: 0,
          FACIL: 0,
          MEDIO: 0,
          DIFICIL: 0,
          MUY_DIFICIL: 0
        }
      };
    }
  }
}

export default DifficultyService;
