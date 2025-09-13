/* eslint-disable consistent-return */
import express from 'express';
import DashboardService from '../services/dashboard.services.js';
import { authenticateUser } from '../middlewares/auth.middleware.js';

const router = express.Router();

const dashboardService = new DashboardService();

router.get('/questions', authenticateUser, async (req, res, next) => {
  try {
    const data = await dashboardService.getQuestionSummary();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get('/exams', authenticateUser, async (req, res, next) => {
  try {
    const data = await dashboardService.getExamSummary();
    res.json(data);
  } catch (error) {
    next(error);
  }
});
export default router;
