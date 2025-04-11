/* eslint-disable consistent-return */
import express from 'express';
import DashboardService from '../services/dashboard.services.js';

const router = express.Router();

const dashboardService = new DashboardService();

router.get('/questions', async (req, res, next) => {
  try {
    const data = await dashboardService.getQuestionSummary();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/exams', async (req, res, next) => {
  try {
    const data = await dashboardService.getExamSummary();
    res.json(data);
  } catch (error) {
    next(error);
  }
});
export default router;
