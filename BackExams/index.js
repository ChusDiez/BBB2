import express from 'express';
import cors from 'cors';
import startTables from './utils/initializeDatabase.js';
import { logError, errorMessage } from './middlewares/error.middleware.js';

import routerApi from './routes/index.js';

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(cors());
app.use(logError);
app.use(errorMessage);

routerApi(app);

app.get('/', (req, res) => {
  res.send('This works');
});

await startTables();
app.listen(PORT, async () => {
  console.log(`Running on http://localhost:${PORT}`);
});
