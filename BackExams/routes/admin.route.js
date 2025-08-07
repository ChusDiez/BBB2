// BackExams/routes/admin.route.js
/* eslint-disable max-len */
import express from 'express';
import QuestionService from '../services/questions.services.js';
import SearchService from '../services/search.services.js';

const router = express.Router();
const questionService = new QuestionService();
const searchService = new SearchService();

router.get('/', async (req, res, next) => {
  try {
    const { query, block, topic, hasHtml } = req.query; // Añadir hasHtml
    
    // Convertir a números si existen
    const blockNum = block ? Number(block) : 0;
    const topicNum = topic ? Number(topic) : 0;
    
    // Si hay algún parámetro de búsqueda, usar el servicio de búsqueda
    if (query || blockNum || topicNum || hasHtml !== undefined) {
      const result = await searchService.searchQuestionsByQuery(
        query || '', 
        blockNum, 
        topicNum,
        hasHtml // Pasar el nuevo parámetro
      );
      res.json(result);
    } else {
      // Si no hay parámetros, devolver todas las preguntas
      const allQuestions = await questionService.getAllQuestions();
      res.json(allQuestions);
    }
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({ 
      error: 'Error al buscar preguntas',
      details: error.message 
    });
  }
});

router.post('/add', async (req, res, next) => {
  try {
    const {
      topic,
      block,
      feedback,
      ...data
    } = req.body;
    
    // ✅ AÑADIDO: Validaciones adicionales
    const blockStr = String(block);
    const topicNum = Number(topic);
    
    if (!['1', '2', '3'].includes(blockStr)) {
      return res.status(400).json({ 
        error: 'Block debe ser 1, 2 o 3',
        details: `Valor recibido: ${block}` 
      });
    }
    
    if (!topicNum || topicNum < 1 || topicNum > 45) {
      return res.status(400).json({ 
        error: 'Topic debe ser un número entre 1 y 45',
        details: `Valor recibido: ${topic}` 
      });
    }
    
    const hasFeedback = feedback && feedback.trim().length;
    const result = await questionService.addQuestion({
      ...data,
      block: blockStr,                 // ✅ CORREGIDO: Usar string para block
      topic: topicNum,                 // ✅ CORREGIDO: Usar número validado para topic
      feedback: hasFeedback ? feedback : null,
    });
    res.status(200).json(result);
  } catch (error) {
    console.error('Error al añadir pregunta:', error);
    res.status(500).json({ 
      error: 'Error al añadir pregunta',
      details: error.message 
    });
  }
});

router.put('/update', async (req, res, next) => {
  try {
    const { question } = req.body;
    const updated = await questionService.updateQuestion(question);
    const questions = await questionService.getAllQuestions();
    res.status(200).json({ updated, questions });
  } catch (error) {
    console.error('Error al actualizar pregunta:', error);
    res.status(500).json({ 
      error: 'Error al actualizar pregunta',
      details: error.message 
    });
  }
});

router.post('/delete', async (req, res, next) => {
  try {
    const { id } = req.body;
    const removed = await questionService.removeQuestion(id);
    const questions = await questionService.getAllQuestions();
    res.status(200).json({ removed, questions });
  } catch (error) {
    console.error('Error al eliminar pregunta:', error);
    res.status(500).json({ 
      error: 'Error al eliminar pregunta',
      details: error.message 
    });
  }
});

export default router;