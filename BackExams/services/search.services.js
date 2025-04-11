import { Op } from 'sequelize';
import Questions from '../models/questions.model.js';

class SearchService {
  async searchQuestionsByQuery(
    query,
    block,
    topic,
  ) {
    const results = await Questions.findAll({
      where: {
        [Op.and]: [{
          [Op.or]: [
            { question: { [Op.like]: `%${query}%` } },
            { optionA: { [Op.like]: `%${query}%` } },
            { optionB: { [Op.like]: `%${query}%` } },
            { optionC: { [Op.like]: `%${query}%` } },
          ],
        },
        block && { block },
        topic && { topic },
        ],
      },
    });
    return results;
  }

  async searchQuestionsByParams(
    block,
    topic,
  ) {
    const results = await Questions.findAll({
      where: {
        [Op.and]: [
          topic && { topic },
          block && { topic },
        ],
      },
    });
    return results;
  }
}

export default SearchService;
