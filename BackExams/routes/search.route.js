/* eslint-disable consistent-return */
import express from 'express';
import SearchService from '../services/search.services.js';

const router = express.Router();

const searchService = new SearchService();

router.get('/', async (req, res, next) => {
  const {
    query,
    block,
    topic,
  } = req.query;
  try {
    let data;
    if (block || topic) {
      data = await searchService.searchQuestionsByParams(block, topic);
    } else {
      data = await searchService.searchQuestionsByQuery(query);
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
