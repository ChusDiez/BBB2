// Script para generar la URL correcta del pooler de Supabase
console.log('🔧 GENERADOR DE URL CORRECTA PARA SUPABASE');
console.log('==========================================\n');

const projectRef = 'hindymhwohevsqumekyv';

console.log('📋 Tu proyecto Supabase:');
console.log('Project Reference:', projectRef);
console.log('Dashboard:', `https://supabase.com/dashboard/project/${projectRef}`);
console.log('\n');

console.log('🔍 PASOS PARA OBTENER LA URL CORRECTA:');
console.log('1. Ve a tu dashboard de Supabase');
console.log('2. Settings > Database');
console.log('3. Scroll down hasta "Connection string"');
console.log('4. Selecciona "URI" (no "psql")');
console.log('5. Asegúrate de que está configurado para "Session mode" (no Transaction)');
console.log('6. Copia la URL completa');
console.log('\n');

console.log('💡 La URL correcta debe verse así:');
console.log(`postgresql://postgres.${projectRef}:[TU_CONTRASEÑA]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`);
console.log('\n');

console.log('⚠️  PUNTOS IMPORTANTES:');
console.log('- Debe incluir ".pooler.supabase.com"');
console.log('- Debe usar puerto 6543');
console.log('- Debe incluir tu referencia del proyecto antes de la contraseña');
console.log('- Debe estar en modo "Session" no "Transaction"');
console.log('\n');

console.log('🧪 Una vez que tengas la URL correcta, pruébala con:');
console.log('node test-connection.js "TU_URL_AQUI"');
console.log('\n');

console.log('📝 Y luego actualiza tu .env con:');
console.log('DATABASE_URL=TU_URL_CORRECTA');
