import express from 'express';
import categoriesRouter from './categories.route.js';
import questionsRouter from './questions.route.js';
import historyRouter from './history.route.js';
import uploadRouter from './upload.route.js';
import dashboardRouter from './dashboard.route.js';
import searchRouter from './search.route.js';
import adminRouter from './admin.route.js';
import enrichmentRouter from './enrichment.route.js';

function routerApi(app) {
  const router = express.Router();
  app.use('/api/v1', router);

  router.use('/questions', questionsRouter);
  router.use('/categories', categoriesRouter);
  router.use('/upload', uploadRouter);
  router.use('/dashboard', dashboardRouter);
  router.use('/historic', historyRouter);
  router.use('/search', searchRouter);
  router.use('/admin', adminRouter);
  router.use('/enrichment', enrichmentRouter);
}

export default routerApi;