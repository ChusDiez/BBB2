import express from 'express';
import arrayShuffle from 'array-shuffle';
import QuestionService from '../services/questions.services.js';
import HistoricService from '../services/historic.services.js';
import ExcludeService from '../services/excludeExam.services.js';

const router = express.Router();

const questionsService = new QuestionService();
const historicService = new HistoricService();
const excludeService = new ExcludeService();

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
  } = req.query;
  try {
    let questions;
    if (excludedExams) {
      const excludedQuestions = await historicService.getQuestionsFromHistoric(excludedExams);
      await excludeService.addToTemporaryTable(excludedQuestions);
      questions = await questionsService.getQuestionsWithExcludedExams(
        amount,
        topic,
        null,
      );
      await excludeService.clearTemporaryTable();
    } else {
      questions = await questionsService.getQuestionsByTopic(amount, topic);
    }
    const resourceIndex = await historicService.addRecord(name, questions, 'Tema', topic);
    res.json({
      questions,
      resourceIndex,
    });
  } catch (error) {
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

export default router;
