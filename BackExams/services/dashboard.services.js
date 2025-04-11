import { Op, Sequelize } from 'sequelize';
import Historic from '../models/historicExams.model.js';
import Questions from '../models/questions.model.js';

class DashboardService {
  async getQuestionSummary() {
    const countAll = await Questions.count();

    const countPerBlock = await Questions.count({
      attributes: ['block'],
      group: 'block',
    });

    // TODO: Review after
    const countPerTopic = await Questions.count({
      attributes: ['topic'],
      group: 'topic',
    });

    const countHasFeedback = await Questions.count({
      where: {
        feedback: {
          [Op.ne]: null,
        },
      },
    });

    return {
      countAll,
      countPerBlock,
      countPerTopic,
      countHasFeedback,
    };
  }

  async getExamSummary() {
    const countAllExams = await Historic.count();

    const lastGenerated = await Historic.findOne({
      order: [['createdAt', 'DESC']],
      limit: 1,
    });

    const examsByGroup = await Historic.findAll({
      attributes: ['category', [Sequelize.fn('COUNT', Sequelize.col('idExam')), 'total']],
      group: ['category'],
    });

    return {
      countAllExams,
      lastGenerated,
      examsByGroup,
    };
  }
}

export default DashboardService;
