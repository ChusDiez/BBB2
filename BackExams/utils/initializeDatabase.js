import categories from '../config/categories.js';
import Categories from '../models/categories.model.js';
import Questions from '../models/questions.model.js';
import pool from '../libs/database.js';
// Importar modelos IMP para asegurar su sincronización
import '../models/impAvailability.model.js';
import '../models/impStatusMonitor.model.js';
import '../models/impTestSessions.model.js';
import '../models/impQuestionAttempts.model.js';

async function startTables() {
  Questions.belongsTo(Categories, { foreignKey: 'topic' });

  await pool.sync();

  const categoryHasRecords = await Categories.count();
  if (!categoryHasRecords) {
    await Categories.bulkCreate(categories);
  }
}

export default startTables;
