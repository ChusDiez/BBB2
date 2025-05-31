// BackExams/scripts/enrich-all-feedbacks.js
import { Op } from 'sequelize';
import Questions from '../models/questions.model.js';
import AIEnrichmentService from '../services/aiEnrichment.services.js';
import startTables from '../utils/initializeDatabase.js';

async function enrichAllFeedbacks() {
  // Obtener argumentos de línea de comandos
  const args = process.argv.slice(2);
  const provider = args[0] || 'openai';
  const limit = args[1] ? parseInt(args[1]) : null;
  
  console.log('🚀 Iniciando enriquecimiento masivo de feedbacks\n');
  console.log(`   Proveedor: ${provider.toUpperCase()}`);
  console.log(`   Límite: ${limit || 'Todas las preguntas'}\n`);
  
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
    
    // Obtener preguntas con feedback que no tengan HTML
    const whereClause = {
      feedback: {
        [Op.and]: [
          { [Op.ne]: null },
          { [Op.notLike]: '%<%' } // No contiene '<', indica que no tiene HTML
        ]
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
      console.log('✅ No hay preguntas con feedback sin enriquecer');
      process.exit(0);
    }
    
    console.log(`📊 Encontradas ${questions.length} preguntas con feedback sin HTML\n`);
    
    // Confirmar antes de proceder
    if (!limit || limit > 10) {
      console.log('⚠️  ATENCIÓN: Este proceso puede tomar varios minutos.\n');
      console.log('Presiona Ctrl+C para cancelar o espera 5 segundos para continuar...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Preparar preguntas para enriquecimiento
    const questionsData = questions.map(q => ({
      id: q.id,
      question: q.question,
      correctAnswer: q.correctAnswer,
      feedback: q.feedback
    }));
    
    // Enriquecer feedbacks
    console.log('🔄 Iniciando proceso de enriquecimiento...\n');
    const results = await aiService.enrichMultipleFeedbacks(questionsData, provider);
    
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
    console.log(`   • Total procesadas: ${questions.length}`);
    console.log(`   • Enriquecidas exitosamente: ${results.filter(r => r.status === 'success').length}`);
    console.log(`   • Omitidas: ${results.filter(r => r.status === 'skipped').length}`);
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
enrichAllFeedbacks();