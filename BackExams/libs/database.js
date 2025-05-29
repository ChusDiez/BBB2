import { Sequelize } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(path.resolve(), '..', '.env') });

/**
 * One single Sequelize instance pointing to Supabase (PostgreSQL).
 * Uses DATABASE_URL from .env and enforces SSL, as required by Supabase.
 */
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
  },
  logging: false, // disable SQL logs; set to console.log to debug
});

try {
  await sequelize.authenticate();
  // console.log('✅ Connection to Supabase established successfully.');
} catch (error) {
  // console.error('❌ Unable to connect to Supabase:', error);
}

export default sequelize;
