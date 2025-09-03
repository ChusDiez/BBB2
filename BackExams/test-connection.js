// Script para probar la conexión a la base de datos
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function testConnection(databaseUrl = null) {
  const connectionString = databaseUrl || process.env.DATABASE_URL;
  
  console.log('🔍 Probando conexión...');
  console.log('URL:', connectionString.replace(/:[^:@]*@/, ':***@'));
  
  const sequelize = new Sequelize(connectionString, {
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

  try {
    await sequelize.authenticate();
    console.log('✅ ¡Conexión exitosa a Supabase!');
    
    // Probar una query simple
    const [results] = await sequelize.query('SELECT COUNT(*) as count FROM questions;');
    console.log('📊 Preguntas en la base de datos:', results[0].count);
    
    await sequelize.close();
    return true;
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    
    if (error.original) {
      console.error('   Código de error:', error.original.code);
      console.error('   Detalle:', error.original.detail || 'Sin detalles adicionales');
    }
    
    await sequelize.close();
    return false;
  }
}

// Si se pasa una URL como argumento, usarla
const customUrl = process.argv[2];

if (customUrl) {
  console.log('🧪 Probando URL personalizada...');
  await testConnection(customUrl);
} else {
  console.log('🧪 Probando URL del archivo .env...');
  await testConnection();
  
  console.log('\n💡 Para probar una URL específica:');
  console.log('node test-connection.js "postgresql://postgres:PASSWORD@HOST:PORT/postgres"');
}

console.log('\n📋 GUÍA RÁPIDA PARA OBTENER LA URL CORRECTA:');
console.log('1. Ve a https://supabase.com/dashboard/project/hindymhwohevsqumekyv');
console.log('2. Settings > Database');
console.log('3. Connection string > URI');
console.log('4. Copia la cadena completa');
console.log('5. Actualiza DATABASE_URL en .env');
console.log('6. Ejecuta: npm start');
