// BackExams/services/search.services.js
import { Op } from 'sequelize';
import Questions from '../models/questions.model.js';

class SearchService {
  async searchQuestionsByQuery(query, block, topic) {
    const whereConditions = [];
        
    // Si hay query de texto, crear condición OR para buscar en todos los campos
    if (query && query.trim() !== '') {
      whereConditions.push({
        [Op.or]: [
          { question: { [Op.like]: `%${query}%` } },
          { optionA: { [Op.like]: `%${query}%` } },
          { optionB: { [Op.like]: `%${query}%` } },
          { optionC: { [Op.like]: `%${query}%` } },
          { feedback: { [Op.like]: `%${query}%` } }
        ]
      });
    }
    
    // Si hay filtro de block válido
    if (block && block !== '0') {
      whereConditions.push({ block: String(block) });
    }
    
    // Si hay filtro de topic válido
    if (topic && topic !== 0 && topic !== '0') {
      whereConditions.push({ topic: Number(topic) });
    }
      // Nuevo filtro para HTML en feedback
    if (hasHtml !== undefined && hasHtml !== null) {
      if (hasHtml === 'false' || hasHtml === false) {
        // Buscar feedbacks SIN HTML
        whereConditions.push({
          [Op.or]: [
            { feedback: null },
            { feedback: { [Op.notLike]: '%<%' } }
          ]
        });
      } else if (hasHtml === 'true' || hasHtml === true) {
        // Buscar feedbacks CON HTML
        whereConditions.push({
          feedback: {
            [Op.and]: [
              { [Op.ne]: null },
              { [Op.like]: '%<%' }
            ]
          }
        });
      }
    }
    // Construir el objeto where final
    const whereClause = whereConditions.length > 0 
      ? { [Op.and]: whereConditions }
      : {};
    
    console.log('SearchService - Condiciones de búsqueda:', JSON.stringify(whereClause, null, 2));
    
    const results = await Questions.findAll({
      where: whereClause,
      order: [['id', 'DESC']],
      limit: 500
    });
    
    console.log(`SearchService - Encontradas ${results.length} preguntas`);
    
    return results;
  }

  async searchQuestionsByParams(block, topic) {
    const whereConditions = [];
    
    // Filtro de block si existe y no es '0'
    if (block && block !== '0') {
      whereConditions.push({ block: String(block) });
    }
    
    // Filtro de topic si existe y no es 0
    if (topic && topic !== 0 && topic !== '0') {
      whereConditions.push({ topic: Number(topic) });
    }
    
    // Construir el objeto where
    const whereClause = whereConditions.length > 0 
      ? { [Op.and]: whereConditions }
      : {};
    
    const results = await Questions.findAll({
      where: whereClause,
      order: [['id', 'DESC']],
      limit: 500
    });
    
    return results;
  }
}

export default SearchService;