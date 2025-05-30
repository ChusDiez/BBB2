import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Verificar que DATABASE_URL existe
if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.error('❌ DATABASE_URL no está definida en las variables de entorno');
  // eslint-disable-next-line no-console
  console.error('Asegúrate de tener un archivo .env en el directorio BackExams con DATABASE_URL definida');
  process.exit(1);
}

/**
 * Configuración de Sequelize para Supabase
 */
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// Probar la conexión
try {
  await sequelize.authenticate();
  // eslint-disable-next-line no-console
  console.log('✅ Connection to Supabase established successfully.');
} catch (error) {
  // eslint-disable-next-line no-console
  console.error('❌ Unable to connect to Supabase:', error);
  // Si es un error de certificado, dar instrucciones adicionales
  if (error.original && error.original.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
    // eslint-disable-next-line no-console
    console.error('\n💡 Intenta ejecutar con: NODE_TLS_REJECT_UNAUTHORIZED=0 npm start');
  }
}

export default sequelize;