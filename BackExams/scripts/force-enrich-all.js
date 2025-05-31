// BackExams/scripts/force-enrich-all.js
import { Op } from 'sequelize';
import Questions from '../models/questions.model.js';
import AIEnrichmentService from '../services/aiEnrichment.services.js';
import startTables from '../utils/initializeDatabase.js';

async function forceEnrichAllFeedbacks() {
  // Obtener argumentos de línea de comandos
  const args = process.argv.slice(2);
  const provider = args[0] || 'openai';
  const limit = args[1] ? parseInt(args[1]) : null;
  
  console.log('🚀 Iniciando re-enriquecimiento FORZADO de feedbacks\n');
  console.log(`   Proveedor: ${provider.toUpperCase()}`);
  console.log(`   Límite: ${limit || 'Todas las preguntas'}\n`);
  console.log('⚠️  NOTA: Este script procesará TODOS los feedbacks, incluso los que ya tienen HTML\n');
  
  try {
    // Inicializar conexión
    await startTables();
    
    // Inicializar servicio de IA
    const aiService = new AIEnrichmentService();
    
    // Verificar disponibilidad del proveedor
    const providers = aiService.getAvailableProviders();
    if (!providers[provider]) {
      console.error(`❌ El proveedor ${provider} no está configurado`);
      console.log('   Proveedores disponibles:', Object.keys(providers).filter(p => providers[p]).join(', '));
      process.exit(1);
    }
    
    // Obtener TODAS las preguntas con feedback (sin filtrar por HTML)
    const whereClause = {
      feedback: {
        [Op.ne]: null
      }
    };
    
    const queryOptions = {
      where: whereClause,
      order: [['id', 'ASC']]
    };
    
    if (limit) {
      queryOptions.limit = limit;
    }
    
    const questions = await Questions.findAll(queryOptions);
    
    if (questions.length === 0) {
      console.log('✅ No hay preguntas con feedback');
      process.exit(0);
    }
    
    console.log(`📊 Encontradas ${questions.length} preguntas con feedback\n`);
    
    // Confirmar antes de proceder
    console.log('⚠️  ATENCIÓN: Este proceso sobrescribirá TODOS los feedbacks.');
    console.log('   Se recomienda hacer un backup de la base de datos primero.\n');
    console.log('Presiona Ctrl+C para cancelar o espera 10 segundos para continuar...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Preparar preguntas para enriquecimiento
    const questionsData = questions.map(q => ({
      id: q.id,
      question: q.question,
      correctAnswer: q.correctAnswer,
      feedback: q.feedback.replace(/<[^>]*>/g, '') // Eliminar HTML existente
    }));
    
    // Modificar temporalmente el servicio para no verificar HTML
    console.log('🔄 Iniciando proceso de re-enriquecimiento FORZADO...\n');
    
    const results = [];
    const batchSize = 3;
    
    // Procesar en lotes manualmente para mejor control
    for (let i = 0; i < questionsData.length; i += batchSize) {
      const batch = questionsData.slice(i, i + batchSize);
      console.log(`   Procesando lote ${Math.floor(i/batchSize) + 1} de ${Math.ceil(questionsData.length/batchSize)}`);
      
      const batchPromises = batch.map(async (q) => {
        try {
          const enrichedFeedback = await aiService.enrichFeedback(
            q.feedback,
            q.question,
            q.correctAnswer,
            provider
          );
          
          console.log(`      ✅ Pregunta ID ${q.id} re-enriquecida`);
          
          return {
            id: q.id,
            enrichedFeedback,
            status: 'success'
          };
        } catch (error) {
          console.error(`      ❌ Error en pregunta ID ${q.id}:`, error.message);
          return {
            id: q.id,
            enrichedFeedback: q.feedback,
            status: 'error',
            error: error.message
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Pausa entre lotes
      if (i + batchSize < questionsData.length) {
        const delay = provider === 'openai' ? 2000 : 1000;
        console.log(`   ⏸️  Pausando ${delay/1000}s antes del siguiente lote...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Actualizar base de datos con feedbacks enriquecidos
    console.log('\n💾 Actualizando base de datos...');
    let updatedCount = 0;
    
    for (const result of results) {
      if (result.status === 'success') {
        const question = questions.find(q => q.id === result.id);
        if (question) {
          await question.update({ feedback: result.enrichedFeedback });
          updatedCount++;
        }
      }
    }
    
    // Mostrar resumen final
    console.log('\n✅ Proceso completado!\n');
    console.log('📊 Resumen final:');
    console.log(`   • Total procesadas: ${questionsData.length}`);
    console.log(`   • Re-enriquecidas exitosamente: ${results.filter(r => r.status === 'success').length}`);
    console.log(`   • Errores: ${results.filter(r => r.status === 'error').length}`);
    console.log(`   • Actualizadas en BD: ${updatedCount}`);
    
    // Mostrar errores si los hay
    const errors = results.filter(r => r.status === 'error');
    if (errors.length > 0) {
      console.log('\n⚠️  Preguntas con errores:');
      errors.forEach(e => {
        console.log(`   • ID ${e.id}: ${e.error}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error general:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar el script
forceEnrichAllFeedbacks();