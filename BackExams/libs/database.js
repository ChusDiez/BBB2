import { Sequelize } from 'sequelize';

import config from '../config/config.js';

const pool = new Sequelize(
  config.dbName,
  encodeURIComponent(config.dbUser),
  encodeURIComponent(config.dbPassword),
  {
    pool: {
      max: 5,
      min: 0,
    },
    host: config.dbHost,
    port: config.dbPort,
    dialect: 'mysql',
  },
);

try {
  await pool.authenticate();
} catch (error) {
  console.error('Unable to connect to the database:', error);
}

export default pool;
