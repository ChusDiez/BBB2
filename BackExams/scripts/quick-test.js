// BackExams/scripts/quick-test.js
import SearchService from '../services/search.services.js';
import startTables from '../utils/initializeDatabase.js';

async function quickTest() {
  console.log('🚀 Test rápido del servicio de búsqueda\n');
  
  try {
    await startTables();
    const searchService = new SearchService();
    
    // Test 1: Búsqueda por bloque 2
    console.log('Test 1: Búsqueda por bloque 2');
    const block2Results = await searchService.searchQuestionsByQuery('', '2', 0);
    console.log(`✅ Encontradas ${block2Results.length} preguntas en bloque 2`);
    if (block2Results.length > 0) {
      console.log(`   Primera pregunta: "${block2Results[0].question.substring(0, 60)}..."`);
    }
    
    // Test 2: Búsqueda por texto
    console.log('\nTest 2: Búsqueda de texto "ley"');
    const textResults = await searchService.searchQuestionsByQuery('ley', '0', 0);
    console.log(`✅ Encontradas ${textResults.length} preguntas con "ley"`);
    if (textResults.length > 0) {
      console.log(`   Primera pregunta: "${textResults[0].question.substring(0, 60)}..."`);
    }
    
    // Test 3: Búsqueda combinada
    console.log('\nTest 3: Búsqueda combinada - Bloque 1 + "derecho"');
    const comboResults = await searchService.searchQuestionsByQuery('derecho', '1', 0);
    console.log(`✅ Encontradas ${comboResults.length} preguntas`);
    
    console.log('\n✨ Todos los tests completados exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

quickTest();