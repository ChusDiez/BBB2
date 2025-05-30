// BackExams/services/search.services.js
import { Op } from 'sequelize';
import Questions from '../models/questions.model.js';

class SearchService {
  async searchQuestionsByQuery(query, block, topic) {
    const whereClause = {};
    
    // Si hay query de texto, buscar en los campos de texto
    if (query && query.trim() !== '') {
      whereClause[Op.or] = [
        { question: { [Op.like]: `%${query}%` } },
        { optionA: { [Op.like]: `%${query}%` } },
        { optionB: { [Op.like]: `%${query}%` } },
        { optionC: { [Op.like]: `%${query}%` } },
        { feedback: { [Op.like]: `%${query}%` } }
      ];
    }
    
    // Si hay filtro de block
    if (block && block !== 0) {
      whereClause.block = block;
    }
    
    // Si hay filtro de topic
    if (topic && topic !== 0) {
      whereClause.topic = topic;
    }
    
    const results = await Questions.findAll({
      where: whereClause,
      order: [['id', 'DESC']], // Ordenar por ID descendente
    });
    
    return results;
  }

  async searchQuestionsByParams(block, topic) {
    const whereClause = {};
    
    if (block && block !== 0) {
      whereClause.block = block;
    }
    
    if (topic && topic !== 0) {
      whereClause.topic = topic;
    }
    
    const results = await Questions.findAll({
      where: whereClause,
      order: [['id', 'DESC']],
    });
    
    return results;
  }
}

export default SearchService;