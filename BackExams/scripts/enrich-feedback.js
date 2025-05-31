// BackExams/scripts/enrich-feedback.js
import Questions from '../models/questions.model.js';
import AIEnrichmentService from '../services/aiEnrichment.services.js';
import startTables from '../utils/initializeDatabase.js';
import { Op } from 'sequelize';

async function enrichFeedbacks() {
  console.log('🚀 Iniciando enriquecimiento masivo de feedbacks...\n');
  
  const provider = process.argv[2] || 'openai'; // node script.js openai/anthropic
  const limit = parseInt(process.argv[3]) || 10; // node script.js openai 50
  
  try {
    // Inicializar conexión
    await startTables();
    
    // Inicializar servicio de IA
    const aiService = new AIEnrichmentService();
    const providers = aiService.getAvailableProviders();
    
    if (!providers[provider]) {
      console.error(`❌ El proveedor ${provider} no está configurado`);
      console.log('Proveedores disponibles:', providers);
      process.exit(1);
    }
    
    // Obtener preguntas con feedback sin enriquecer
    const questions = await Questions.findAll({
      where: {
        feedback: {
          [Op.ne]: null,
          [Op.notLike]: '%<strong%', // No tienen HTML aún
          [Op.notLike]: '%class=%'   // No tienen clases CSS
        }
      },
      limit,
      order: [['id', 'ASC']]
    });
    
    console.log(`📊 Encontradas ${questions.length} preguntas para enriquecer\n`);
    
    if (questions.length === 0) {
      console.log('✅ No hay preguntas pendientes de enriquecer');
      process.exit(0);
    }
    
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 3; // Procesar de a 3 para no saturar
    
    // Procesar en lotes
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(questions.length / batchSize);
      
      console.log(`\n📦 Procesando lote ${batchNumber}/${totalBatches}`);
      
      // Procesar lote en paralelo
      const promises = batch.map(async (question) => {
        try {
          console.log(`   🔄 Procesando pregunta ID ${question.id}...`);
          
          const enrichedFeedback = await aiService.enrichFeedback(
            question.feedback,
            question.question,
            question.correctAnswer,
            provider
          );
          
          // Verificar que realmente se enriqueció
          if (enrichedFeedback && enrichedFeedback !== question.feedback) {
            // Guardar directamente en la BD
            await question.update({ feedback: enrichedFeedback });
            
            console.log(`   ✅ Pregunta ID ${question.id} enriquecida y guardada`);
            successCount++;
            
            // Mostrar preview del cambio
            if (successCount === 1) {
              console.log('\n📝 Ejemplo de enriquecimiento:');
              console.log('   Original:', question.feedback.substring(0, 100) + '...');
              console.log('   Enriquecido:', enrichedFeedback.substring(0, 100) + '...\n');
            }
          } else {
            console.log(`   ⚠️  Pregunta ID ${question.id} - Sin cambios`);
          }
          
          return true;
        } catch (error) {
          console.error(`   ❌ Error en pregunta ID ${question.id}:`, error.message);
          errorCount++;
          return false;
        }
      });
      
      // Esperar a que termine el lote
      await Promise.all(promises);
      
      // Pausa entre lotes (excepto el último)
      if (i + batchSize < questions.length) {
        console.log(`   ⏳ Pausa de 2 segundos antes del siguiente lote...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Resumen final
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN FINAL:');
    console.log('='.repeat(50));
    console.log(`✅ Exitosas: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📝 Total procesadas: ${successCount + errorCount}`);
    
    // Verificar cuántas quedan pendientes
    const pendingCount = await Questions.count({
      where: {
        feedback: {
          [Op.ne]: null,
          [Op.notLike]: '%<strong%',
          [Op.notLike]: '%class=%'
        }
      }
    });
    
    console.log(`\n📌 Quedan ${pendingCount} preguntas pendientes de enriquecer`);
    
  } catch (error) {
    console.error('\n❌ Error general:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar
console.log('='.repeat(50));
console.log('🤖 ENRIQUECIMIENTO DE FEEDBACK CON IA');
console.log('='.repeat(50));
console.log('Uso: node scripts/enrich-feedback.js [provider] [limit]');
console.log('Ejemplo: node scripts/enrich-feedback.js openai 50\n');

enrichFeedbacks();