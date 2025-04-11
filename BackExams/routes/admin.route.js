/* eslint-disable max-len */
import express from 'express';
import QuestionService from '../services/questions.services.js';
import SearchService from '../services/search.services.js';

const router = express.Router();
const questionService = new QuestionService();
const searchService = new SearchService();

router.get('/', async (req, res, next) => {
  try {
    const { query, block, topic } = req.query;
    if (query || Number(block) || Number(topic)) {
      const result = await searchService.searchQuestionsByQuery(query, Number(block), Number(topic));
      res.json(result);
    } else {
      const allQuestions = await questionService.getAllQuestions();
      res.json(allQuestions);
    }
  } catch (error) {
    res.status(500).json(error);
  }
});

router.post('/add', async (req, res, next) => {
  const {
    topic,
    feedback,
    ...data
  } = req.body;
  const hasFeedback = feedback && feedback.trim().length;
  const result = await questionService.addQuestion({
    ...data,
    topic: Number(topic),
    feedback: hasFeedback ? feedback : null,
  });
  res.status(200).json(result);
});

router.put('/update', async (req, res, next) => {
  try {
    const { question } = req.body;
    const updated = await questionService.updateQuestion(question);
    const questions = await questionService.getAllQuestions();
    res.status(200).json({ updated, questions });
  } catch (error) {
    res.status(500).json(error);
  }
});

router.post('/delete', async (req, res, next) => {
  try {
    const { id } = req.body;
    const removed = await questionService.removeQuestion(id);
    const questions = await questionService.getAllQuestions();
    res.status(200).json({ removed, questions });
  } catch (error) {
    res.status(500).json(error);
  }
});

export default router;
