import startTables from '../utils/initializeDatabase.js';
import ImpAvailability from '../models/impAvailability.model.js';
import ImpStatusMonitor from '../models/impStatusMonitor.model.js';
import ImpTestSession from '../models/impTestSessions.model.js';
import ImpQuestionAttempt from '../models/impQuestionAttempts.model.js';

async function run() {
  try {
    await startTables();
    const a = await ImpAvailability.count();
    const s = await ImpStatusMonitor.count();
    const ts = await ImpTestSession.count();
    const qa = await ImpQuestionAttempt.count();
    console.log('IMP tables counts -> availability:', a, 'status:', s, 'sessions:', ts, 'attempts:', qa);
  } catch (e) {
    console.error('Error checking IMP tables:', e);
  } finally {
    process.exit(0);
  }
}

run();

