// Configurar SSL antes de cualquier otra cosa
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import startTables from './utils/initializeDatabase.js';
import { logError, errorMessage } from './middlewares/error.middleware.js';
import routerApi from './routes/index.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Configuración CORS más específica
const corsOptions = {
  origin: ['http://localhost:3006', 'http://localhost:3007', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ charset: 'utf-8' }));
app.use(express.urlencoded({ extended: true, charset: 'utf-8' }));
app.use(logError);
app.use(errorMessage);
routerApi(app);

app.get('/', (req, res) => {
  res.send('This works');
});

await startTables();
app.listen(PORT, async () => {
  // eslint-disable-next-line no-console
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log('📍 Accepting requests from:', corsOptions.origin);
  // eslint-disable-next-line no-console
  console.log('⚠️  Nota: SSL validation está deshabilitado para desarrollo');
});