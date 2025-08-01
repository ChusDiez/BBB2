import Questions from '../models/questions.model.js';
import AIEnrichmentService from '../services/aiEnrichment.services.js';
import startTables from '../utils/initializeDatabase.js';
import { Op } from 'sequelize';

async function migrateToSonnet4() {
  console.log('🚀 Migrando feedbacks a Claude Sonnet 4...\n');
  
  try {
    await startTables();
    const aiService = new AIEnrichmentService();
    
    // Obtener todas las preguntas con feedback enriquecido
    const questions = await Questions.findAll({
      where: {
        feedback: {
          [Op.ne]: null,
          [Op.like]: '%<div style=%' // Ya tienen contenedor
        }
      },
      order: [['topic', 'ASC'], ['id', 'ASC']]
    });
    
    console.log(`📊 Encontradas ${questions.length} preguntas para migrar\n`);
    
    let processed = 0;
    const batchSize = 3;
    
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      
      const promises = batch.map(async (question) => {
        try {
          // Limpiar HTML antiguo para re-enriquecer
          const cleanFeedback = question.feedback
            .replace(/<[^>]*>/g, '') // Quitar todo HTML
            .trim();
          
          const enrichedFeedback = await aiService.enrichFeedback(
            cleanFeedback,
            question.question,
            question.correctAnswer,
            'anthropic', // Usar Anthropic
            question.topic
          );
          
          await Questions.update(
            { feedback: enrichedFeedback },
            { where: { id: question.id } }
          );
          
          processed++;
          console.log(`✅ [${processed}/${questions.length}] Pregunta ${question.id} (Tema ${question.topic})`);
          
        } catch (error) {
          console.error(`❌ Error en pregunta ${question.id}:`, error.message);
        }
      });
      
      await Promise.all(promises);
      
      // Pausa entre lotes
      if (i + batchSize < questions.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    console.log(`\n✨ Migración completada: ${processed} preguntas actualizadas`);
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    process.exit();
  }
}

migrateToSonnet4();