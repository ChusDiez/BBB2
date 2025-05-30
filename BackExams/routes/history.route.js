// BackExams/routes/history.route.js
/* eslint-disable consistent-return */
import express from 'express';
import HistoricService from '../services/historic.services.js';
import QuestionService from '../services/questions.services.js';
import ExamService from '../services/exam.services.js';

const router = express.Router();

const questionService = new QuestionService();
const historicService = new HistoricService();
const examService = new ExamService();

router.get('/', async (req, res, next) => {
  try {
    const data = await historicService.getAllRecords();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/download', async (req, res, next) => {
  const { id: historicId, type, feedback } = req.query;
  try {
    const { name, questions: questionIds } = await historicService.getRecordById(historicId);
    const questions = await questionService.recreateExamQuestions(questionIds);
    
    if (type === 'csv') {
      const path = await examService.createCsvExam(questions);
      res
        .setHeader('Content-Type', 'text/csv; charset=utf-8')
        .setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(name)}.csv"`)
        .status(200)
        .download(path, `${name}.csv`, () => {
          examService.removeExam(path);
        });
    }
    if (type === 'doc') {
      const hasFeedback = feedback === 'true';
      const path = await examService.createDocExam(questions, hasFeedback);
      res
        .setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        .setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(name)}.docx"`)
        .status(200)
        .download(path, `${name}.docx`, () => {
          examService.removeExam(path);
        });
    }
  } catch (error) {
    next(error);
  }
});

router.post('/delete', async (req, res, next) => {
  const { id: historicId } = req.body;
  try {
    const removed = await historicService.removeRecord(historicId);
    const historic = await historicService.getAllRecords();
    res.status(200).json({ removed, historic });
  } catch (error) {
    next(error);
  }
});

export default router;