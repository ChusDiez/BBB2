// BackExams/routes/enrichment.route.js
import express from 'express';
import AIEnrichmentService from '../services/aiEnrichment.services.js';
import QuestionService from '../services/questions.services.js';

const router = express.Router();
const aiService = new AIEnrichmentService();
const questionService = new QuestionService();

// Verificar disponibilidad de proveedores
router.get('/providers', (req, res) => {
  const providers = aiService.getAvailableProviders();
  res.json(providers);
});

// Enriquecer feedback de una sola pregunta
router.post('/single', async (req, res, next) => {
  try {
    const { questionId, provider = 'openai' } = req.body;
    
    // Verificar que el proveedor esté disponible
    const providers = aiService.getAvailableProviders();
    if (!providers[provider]) {
      return res.status(400).json({
        error: `El proveedor ${provider} no está configurado`
      });
    }
    
    // Obtener la pregunta
    const question = await questionService.getQuestionById(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }
    
    if (!question.feedback) {
      return res.status(400).json({ 
        error: 'La pregunta no tiene feedback para enriquecer' 
      });
    }
    
    // Enriquecer el feedback
    const enrichedFeedback = await aiService.enrichFeedback(
      question.feedback,
      question.question,
      question.correctAnswer,
      provider
    );
    
    // Actualizar la pregunta con el feedback enriquecido
    await questionService.updateQuestion({
      ...question.dataValues,
      feedback: enrichedFeedback
    });
    
    res.json({
      success: true,
      questionId,
      originalFeedback: question.feedback,
      enrichedFeedback
    });
    
  } catch (error) {
    console.error('Error en enriquecimiento individual:', error);
    res.status(500).json({ 
      error: 'Error al enriquecer el feedback',
      details: error.message 
    });
  }
});

// Enriquecer feedback de múltiples preguntas
router.post('/batch', async (req, res, next) => {
  try {
    const { questionIds, provider = 'openai' } = req.body;
    
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ 
        error: 'Debe proporcionar un array de IDs de preguntas' 
      });
    }
    
    console.log(`\n🚀 Iniciando enriquecimiento por lotes: ${questionIds.length} preguntas con ${provider}`);
    
    // Verificar que el proveedor esté disponible
    const providers = aiService.getAvailableProviders();
    if (!providers[provider]) {
      return res.status(400).json({
        error: `El proveedor ${provider} no está configurado`
      });
    }
    
    // Obtener las preguntas
    const questions = await Promise.all(
      questionIds.map(id => questionService.getQuestionById(id))
    );
    
    // Filtrar preguntas válidas (que existen y tienen feedback)
    const validQuestions = questions.filter(q => q && q.feedback);
    const questionsWithoutFeedback = questions.filter(q => q && !q.feedback).length;
    const notFoundQuestions = questionIds.length - questions.filter(q => q).length;
    
    console.log(`📊 Estado de las preguntas:`);
    console.log(`   - Con feedback: ${validQuestions.length}`);
    console.log(`   - Sin feedback: ${questionsWithoutFeedback}`);
    console.log(`   - No encontradas: ${notFoundQuestions}`);
    
    if (validQuestions.length === 0) {
      return res.status(400).json({ 
        error: 'Ninguna de las preguntas seleccionadas tiene feedback para enriquecer',
        details: {
          total: questionIds.length,
          sinFeedback: questionsWithoutFeedback,
          noEncontradas: notFoundQuestions
        }
      });
    }
    
    // Enriquecer los feedbacks
    console.log(`\n🔄 Procesando ${validQuestions.length} preguntas...`);
    const enrichmentResults = await aiService.enrichMultipleFeedbacks(
      validQuestions.map(q => ({
        id: q.id,
        question: q.question,
        correctAnswer: q.correctAnswer,
        feedback: q.feedback
      })),
      provider
    );
    
    // Actualizar las preguntas con los feedbacks enriquecidos
    console.log('\n💾 Guardando feedbacks enriquecidos en la base de datos...');
    let savedCount = 0;
    const updatePromises = enrichmentResults
      .filter(result => result.status === 'success')
      .map(async result => {
        const question = validQuestions.find(q => q.id === result.id);
        if (question) {
          await questionService.updateQuestion({
            ...question.dataValues,
            feedback: result.enrichedFeedback
          });
          savedCount++;
        }
      });
    
    await Promise.all(updatePromises);
    
    console.log(`✅ ${savedCount} feedbacks guardados exitosamente`);
    
    // Obtener las preguntas actualizadas
    const updatedQuestions = await questionService.getAllQuestions();
    
    // Preparar respuesta detallada
    const response = {
      success: true,
      totalProcessed: questionIds.length,
      successfullyEnriched: enrichmentResults.filter(r => r.status === 'success').length,
      summary: {
        conFeedback: validQuestions.length,
        sinFeedback: questionsWithoutFeedback,
        noEncontradas: notFoundQuestions,
        enriquecidas: enrichmentResults.filter(r => r.status === 'success').length,
        omitidas: enrichmentResults.filter(r => r.status === 'skipped').length,
        errores: enrichmentResults.filter(r => r.status === 'error').length
      },
      results: enrichmentResults,
      questions: updatedQuestions
    };
    
    console.log('\n✅ Proceso completado:', response.summary);
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error en enriquecimiento por lotes:', error);
    res.status(500).json({ 
      error: 'Error al enriquecer los feedbacks',
      details: error.message 
    });
  }
});

// Vista previa del enriquecimiento sin guardar
router.post('/preview', async (req, res, next) => {
  try {
    const { feedback, question, correctAnswer, provider = 'openai' } = req.body;
    
    if (!feedback) {
      return res.status(400).json({ 
        error: 'Debe proporcionar el feedback a enriquecer' 
      });
    }
    
    // Verificar que el proveedor esté disponible
    const providers = aiService.getAvailableProviders();
    if (!providers[provider]) {
      return res.status(400).json({
        error: `El proveedor ${provider} no está configurado`
      });
    }
    
    // Enriquecer el feedback
    const enrichedFeedback = await aiService.enrichFeedback(
      feedback,
      question || '',
      correctAnswer || '',
      provider
    );
    
    res.json({
      success: true,
      originalFeedback: feedback,
      enrichedFeedback
    });
    
  } catch (error) {
    console.error('Error en vista previa:', error);
    res.status(500).json({ 
      error: 'Error al generar la vista previa',
      details: error.message 
    });
  }
});

export default router;