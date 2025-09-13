import express from 'express';
import CategoryService from '../services/category.services.js';
import { authenticateUser } from '../middlewares/auth.middleware.js';

const router = express.Router();
const categoryService = new CategoryService();

router.get('/', authenticateUser, async (req, res, next) => {
  try {
    const categories = await categoryService.getAll();
    res.json(categories);
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
});

router.get('/filter', authenticateUser, async (req, res, next) => {
  const { block, topic } = req.query;
  try {
    if (block) {
      res.json([
        ...await categoryService.getByBlock(block),
      ]);
    } else if (topic) {
      res.json([
        ...await categoryService.getByTopic(topic),
      ]);
    }
    res.json([]);
  } catch (error) {
    res.status(500).json({
      error,
    });
  }
});

export default router;
