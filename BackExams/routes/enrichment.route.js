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

export default router;