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
    
    const validQuestions = questions.filter(q => q && q.feedback);
    
    if (validQuestions.length === 0) {
      return res.status(400).json({ 
        error: 'Ninguna de las preguntas seleccionadas tiene feedback para enriquecer' 
      });
    }
    
    // Enriquecer los feedbacks
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
    const updatePromises = enrichmentResults
      .filter(result => result.status === 'success')
      .map(result => {
        const question = validQuestions.find(q => q.id === result.id);
        return questionService.updateQuestion({
          ...question.dataValues,
          feedback: result.enrichedFeedback
        });
      });
    
    await Promise.all(updatePromises);
    
    // Obtener las preguntas actualizadas
    const updatedQuestions = await questionService.getAllQuestions();
    
    res.json({
      success: true,
      totalProcessed: questionIds.length,
      successfullyEnriched: enrichmentResults.filter(r => r.status === 'success').length,
      results: enrichmentResults,
      questions: updatedQuestions
    });
    
  } catch (error) {
    console.error('Error en enriquecimiento por lotes:', error);
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

// Enriquecer TODAS las preguntas con feedback
router.post('/batch/all', async (req, res, next) => {
  try {
    const { provider = 'openai', limit = 200 } = req.body;
    
    // Verificar que el proveedor esté disponible
    const providers = aiService.getAvailableProviders();
    if (!providers[provider]) {
      return res.status(400).json({
        error: `El proveedor ${provider} no está configurado`
      });
    }
    
    console.log(`🚀 Iniciando enriquecimiento masivo con ${provider}...`);
    
    // Obtener TODAS las preguntas que tienen feedback
    const allQuestions = await questionService.getAllQuestions();
    const questionsWithFeedback = allQuestions.filter(q => 
      q.feedback && 
      q.feedback.trim().length > 0 &&
      !q.feedback.includes('<strong') && // No está ya enriquecida
      !q.feedback.includes('class=')     // No tiene clases CSS
    );
    
    // Limitar si es necesario
    const questionsToProcess = questionsWithFeedback.slice(0, limit);
    
    console.log(`📊 Procesando ${questionsToProcess.length} preguntas...`);
    
    if (questionsToProcess.length === 0) {
      return res.json({ 
        success: true,
        message: 'No hay preguntas con feedback para enriquecer',
        totalProcessed: 0
      });
    }
    
    // Procesar en lotes más pequeños para evitar timeouts
    const batchSize = 5;
    const allResults = [];
    let processedCount = 0;
    
    for (let i = 0; i < questionsToProcess.length; i += batchSize) {
      const batch = questionsToProcess.slice(i, i + batchSize);
      console.log(`📦 Procesando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(questionsToProcess.length/batchSize)}`);
      
      // Enriquecer este lote
      const enrichmentResults = await aiService.enrichMultipleFeedbacks(
        batch.map(q => ({
          id: q.id,
          question: q.question,
          correctAnswer: q.correctAnswer,
          feedback: q.feedback
        })),
        provider
      );
      
      // Actualizar las preguntas exitosas inmediatamente
      for (const result of enrichmentResults) {
        if (result.status === 'success') {
          const question = batch.find(q => q.id === result.id);
          await questionService.updateQuestion({
            ...question.dataValues || question,
            feedback: result.enrichedFeedback
          });
          processedCount++;
          console.log(`✅ Actualizada pregunta ID: ${result.id}`);
        }
      }
      
      allResults.push(...enrichmentResults);
      
      // Pequeña pausa entre lotes para no saturar
      if (i + batchSize < questionsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`✅ Proceso completado: ${processedCount} preguntas enriquecidas`);
    
    res.json({
      success: true,
      totalProcessed: questionsToProcess.length,
      successfullyEnriched: processedCount,
      results: allResults
    });
    
  } catch (error) {
    console.error('Error en enriquecimiento masivo:', error);
    res.status(500).json({ 
      error: 'Error al enriquecer los feedbacks',
      details: error.message 
    });
  }
});

// Endpoint para verificar el estado
router.get('/status', async (req, res, next) => {
  try {
    const allQuestions = await questionService.getAllQuestions();
    
    const withFeedback = allQuestions.filter(q => q.feedback && q.feedback.trim().length > 0);
    const enriched = withFeedback.filter(q => 
      q.feedback.includes('<strong') || 
      q.feedback.includes('class=')
    );
    const pending = withFeedback.length - enriched.length;
    
    res.json({
      total: allQuestions.length,
      withFeedback: withFeedback.length,
      enriched: enriched.length,
      pending: pending,
      percentComplete: withFeedback.length > 0 
        ? Math.round((enriched.length / withFeedback.length) * 100) 
        : 0
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener el estado',
      details: error.message 
    });
  }
});

export default router;