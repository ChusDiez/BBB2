import express from 'express';
import arrayShuffle from 'array-shuffle';
import QuestionService from '../services/questions.services.js';
import HistoricService from '../services/historic.services.js';
import ExcludeService from '../services/excludeExam.services.js';
import DifficultyService from '../services/difficulty.services.js';

const router = express.Router();

const questionsService = new QuestionService();
const historicService = new HistoricService();
const excludeService = new ExcludeService();
const difficultyService = new DifficultyService();

router.get('/', async (req, res) => {
  res.json({
    text: 'This works - Question',
  });
});

router.get('/topic', async (req, res, next) => {
  const {
    amount,
    topic,
    name,
    excludedExams,
    difficulty,
  } = req.query;
  try {
    let questions;
    
    // Si se especifica dificultad, usar el servicio de dificultad
    if (difficulty && !excludedExams) {
      console.log(`🎯 Generando ${amount} preguntas del tema ${topic} con dificultad ${difficulty}`);
      const difficultyResult = await difficultyService.getQuestionsByTopicAndDifficulty(
        parseInt(amount),
        parseInt(topic),
        difficulty
      );
      questions = difficultyResult.questions;
      
      // Añadir información del breakdown de dificultades a la respuesta
      const resourceIndex = await historicService.addRecord(
        name, 
        questions, 
        'Tema', 
        difficulty ? `${topic} (${difficulty})` : topic
      );
      
      return res.json({
        questions,
        resourceIndex,
        metadata: {
          requestedDifficulty: difficulty,
          actualCount: questions.length,
          topic: parseInt(topic),
          difficultyBreakdown: difficultyResult.difficultyBreakdown,
          totalRequested: difficultyResult.totalRequested,
          totalObtained: difficultyResult.totalObtained
        }
      });
    } else if (excludedExams && difficulty) {
      // NUEVO: Usar sistema de dificultad CON exámenes excluidos
      const excludedQuestions = await historicService.getQuestionsFromHistoric(excludedExams);
      console.log(`🎯 Generando ${amount} preguntas del tema ${topic} con dificultad ${difficulty} EXCLUYENDO ${excludedQuestions.length} preguntas`);
      
      const difficultyResult = await difficultyService.getQuestionsByTopicAndDifficultyWithExclusions(
        parseInt(amount),
        parseInt(topic),
        difficulty,
        excludedQuestions
      );
      questions = difficultyResult.questions;
      
      const resourceIndex = await historicService.addRecord(
        name, 
        questions, 
        'Tema', 
        difficulty ? `${topic} (${difficulty})` : topic
      );
      
      return res.json({
        questions,
        resourceIndex,
        metadata: {
          requestedDifficulty: difficulty,
          actualCount: questions.length,
          topic: parseInt(topic),
          difficultyBreakdown: difficultyResult.difficultyBreakdown,
          totalRequested: difficultyResult.totalRequested,
          totalObtained: difficultyResult.totalObtained,
          excludedCount: excludedQuestions.length
        }
      });
    } else if (excludedExams) {
      // Lógica para exámenes excluidos SIN dificultad específica (aleatorio)
      const excludedQuestions = await historicService.getQuestionsFromHistoric(excludedExams);
      console.log(`🎲 Generando ${amount} preguntas ALEATORIAS del tema ${topic} EXCLUYENDO ${excludedQuestions.length} preguntas`);
      
      const difficultyResult = await difficultyService.getQuestionsByTopicAndDifficultyWithExclusions(
        parseInt(amount),
        parseInt(topic),
        null, // Sin dificultad específica
        excludedQuestions
      );
      questions = difficultyResult.questions;
      
      const resourceIndex = await historicService.addRecord(
        name, 
        questions, 
        'Tema', 
        topic
      );
      
      return res.json({
        questions,
        resourceIndex,
        metadata: {
          requestedDifficulty: 'RANDOM',
          actualCount: questions.length,
          topic: parseInt(topic),
          difficultyBreakdown: difficultyResult.difficultyBreakdown,
          totalRequested: difficultyResult.totalRequested,
          totalObtained: difficultyResult.totalObtained,
          excludedCount: excludedQuestions.length
        }
      });
    } else {
      // Lógica existente para preguntas aleatorias
      questions = await questionsService.getQuestionsByTopic(amount, topic);
    }
    
    const resourceIndex = await historicService.addRecord(
      name, 
      questions, 
      'Tema', 
      difficulty ? `${topic} (${difficulty})` : topic
    );
    
    res.json({
      questions,
      resourceIndex,
      metadata: {
        requestedDifficulty: difficulty || 'RANDOM',
        actualCount: questions.length,
        topic: parseInt(topic)
      }
    });
  } catch (error) {
    console.error('Error en endpoint /topic:', error);
    next(error);
  }
});

router.get('/multiple', async (req, res, next) => {
  const {
    amount,
    topics,
    name,
    excludedExams,
    withFeedback,
    randomized,
  } = req.query;

  const isRandom = randomized === 'true';
  const hasFeedback = withFeedback === 'true';
  const limit = Math.ceil(amount / topics.length);

  try {
    let questions;
    if (excludedExams) {
      const excludedQuestions = await historicService.getQuestionsFromHistoric(excludedExams);
      await excludeService.addToTemporaryTable(excludedQuestions);
      questions = await Promise.all(topics.map(
        (topic) => questionsService.getQuestionsWithExcludedExams(
          limit,
          topic,
          null,
          hasFeedback,
        ),
      ));
      await excludeService.clearTemporaryTable();
    } else {
      questions = await Promise.all(topics.map(
        (topic) => questionsService.getQuestionsByTopic(
          limit,
          topic,
          hasFeedback,
        ),
      ));
    }
    questions = questions.flat().slice(0, amount);
    if (isRandom) {
      questions = arrayShuffle(questions);
    }
    let resourceIndex;
    if (questions.length === amount) {
      resourceIndex = await historicService.addRecord(name, questions, 'Multiple', '');
    }
    res.json({
      questions,
      resourceIndex: resourceIndex ?? -1,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/block', async (req, res, next) => {
  const {
    block,
    amount,
    name,
    excludedExams,
  } = req.query;
  try {
    let questions;
    if (excludedExams) {
      const excludedQuestions = await historicService.getQuestionsFromHistoric(excludedExams);
      await excludeService.addToTemporaryTable(excludedQuestions);
      questions = await questionsService.getQuestionsWithExcludedExams(
        amount,
        null,
        block,
      );
      await excludeService.clearTemporaryTable();
    } else {
      questions = await questionsService.getQuestionsByBlock(amount, block);
    }
    const resourceIndex = await historicService.addRecord(name, questions, 'Bloque', block);
    res.json({
      questions,
      resourceIndex,
    });
  } catch (error) {
    next(error);
  }
});

// Nuevo endpoint para obtener estadísticas de dificultad de un tema
router.get('/topic/:topicId/difficulty-stats', async (req, res, next) => {
  const { topicId } = req.params;
  try {
    const stats = await difficultyService.getTopicDifficultyStats(parseInt(topicId));
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de dificultad:', error);
    next(error);
  }
});

export default router;
