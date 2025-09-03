// Script temporal para obtener la cadena de conexión correcta de Supabase
import dotenv from 'dotenv';

// Cargar variables de entorno actuales
dotenv.config();

console.log('🔍 DIAGNÓSTICO DE CONEXIÓN A SUPABASE');
console.log('=====================================\n');

console.log('📋 Configuración actual en .env:');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('PROJECT_REF: hindymhwohevsqumekyv');
console.log('\n');

console.log('🔧 PASOS PARA SOLUCIONAR:');
console.log('1. Ve a tu proyecto Supabase: https://supabase.com/dashboard/project/hindymhwohevsqumekyv');
console.log('2. Ve a Settings > Database');  
console.log('3. En "Connection String" selecciona "URI" y copia la cadena');
console.log('4. Actualiza DATABASE_URL en tu archivo .env');
console.log('\n');

console.log('💡 La cadena de conexión debe verse así:');
console.log('DATABASE_URL=postgresql://postgres.[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres');
console.log('\n');

console.log('⚠️  NOTAS IMPORTANTES:');
console.log('- Asegúrate de usar el puerto 6543 (no 5432)');
console.log('- Usa la contraseña correcta del proyecto');
console.log('- La URL debe incluir el pooler de Supabase');
console.log('\n');

// Intentar parsear la URL actual para mostrar detalles
try {
  const dbUrl = new URL(process.env.DATABASE_URL);
  console.log('🔍 ANÁLISIS DE LA URL ACTUAL:');
  console.log('Host:', dbUrl.hostname);
  console.log('Puerto:', dbUrl.port);
  console.log('Usuario:', dbUrl.username);
  console.log('Base de datos:', dbUrl.pathname.slice(1));
  console.log('Contraseña:', dbUrl.password ? '***' + dbUrl.password.slice(-4) : 'NO CONFIGURADA');
} catch (error) {
  console.log('❌ Error parseando DATABASE_URL:', error.message);
}
