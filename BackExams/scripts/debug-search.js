// BackExams/scripts/debug-search.js
import Questions from '../models/questions.model.js';
import startTables from '../utils/initializeDatabase.js';

async function debugSearch() {
  console.log('🔍 Iniciando depuración de búsqueda...\n');
  
  try {
    // Inicializar conexión
    await startTables();
    
    // Contar preguntas por bloque
    console.log('📊 Conteo de preguntas por bloque:');
    const blockCounts = await Questions.findAll({
      attributes: ['block', [Questions.sequelize.fn('COUNT', '*'), 'count']],
      group: ['block'],
      raw: true
    });
    
    blockCounts.forEach(({ block, count }) => {
      console.log(`   Bloque ${block}: ${count} preguntas`);
    });
    
    // Verificar tipos de datos
    console.log('\n🔎 Verificando tipos de datos en block:');
    const sampleQuestions = await Questions.findAll({
      limit: 5,
      attributes: ['id', 'block', 'topic'],
      raw: true
    });
    
    sampleQuestions.forEach(q => {
      console.log(`   ID: ${q.id}, Block: ${q.block} (tipo: ${typeof q.block}), Topic: ${q.topic} (tipo: ${typeof q.topic})`);
    });
    
    // Probar búsqueda específica de bloque 2
    console.log('\n🔍 Probando búsqueda de Bloque 2:');
    const block2Questions = await Questions.findAll({
      where: { block: '2' },
      limit: 5,
      raw: true
    });
    
    console.log(`   Encontradas: ${block2Questions.length} preguntas`);
    if (block2Questions.length > 0) {
      console.log(`   Ejemplo: "${block2Questions[0].question.substring(0, 50)}..."`);
    }
    
    // Probar búsqueda de texto
    console.log('\n🔍 Probando búsqueda de texto "Constitución":');
    const textSearch = await Questions.findAll({
      where: {
        [Questions.sequelize.Op.or]: [
          { question: { [Questions.sequelize.Op.like]: '%Constitución%' } },
          { optionA: { [Questions.sequelize.Op.like]: '%Constitución%' } },
          { optionB: { [Questions.sequelize.Op.like]: '%Constitución%' } },
          { optionC: { [Questions.sequelize.Op.like]: '%Constitución%' } },
          { feedback: { [Questions.sequelize.Op.like]: '%Constitución%' } }
        ]
      },
      limit: 5,
      raw: true
    });
    
    console.log(`   Encontradas: ${textSearch.length} preguntas con "Constitución"`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar depuración
debugSearch();

// Para ejecutar este script, añade a package.json:
// "debug:search": "node --es-module-specifier-resolution=node scripts/debug-search.js"