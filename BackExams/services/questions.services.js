/* eslint-disable default-param-last */
/* eslint-disable max-len */
import { Op, Sequelize } from 'sequelize';
import Questions from '../models/questions.model.js';

class QuestionService {
  async getQuestionsWithExcludedExams(
    limit,
    topic,
    block,
    hasFeedback = false,
  ) {
    const questions = await Questions.findAll({
      where: {
        [Op.and]: [
          topic && { topic },
          block && { block },
          hasFeedback && {
            feedback: {
              [Op.ne]: null,
            },
          },
          {
            id: {
              [Op.notIn]: Sequelize.literal('(SELECT questionId from temporaryJoins)'),
            },
          },
        ],
      },
      order: Sequelize.literal('rand()'),
      limit: Number(limit),
    });
    return questions;
  }

  // Single getters

  async getQuestionById(id) {
    const question = await Questions.findOne({
      where: {
        id,
      },
    });
    return question;
  }

  async getQuestionsByTopic(limit, topic, hasFeedback = false) {
    const questionsByTopic = await Questions.findAll({
      where: {
        [Op.and]: [
          { topic },
          hasFeedback && {
            feedback: {
              [Op.ne]: null,
            },
          },
        ],
      },
      order: Sequelize.literal('rand()'),
      limit: Number(limit),
    });
    return questionsByTopic;
  }

  async getQuestionsMultiple(limit, topic, hasFeedback = false) {
    const questionsMultiple = await Questions.findAll({
      where: {
        [Op.and]: [
          { topic },
          hasFeedback && {
            feedback: {
              [Op.ne]: null,
            },
          },
        ],
      },
      order: Sequelize.literal('rand()'),
      limit: Number(limit),
    });
    return questionsMultiple;
  }

  async getQuestionsByBlock(limit, block, hasFeedback = false) {
    const questionsByBlock = await Questions.findAll({
      where: {
        [Op.and]: [
          { block },
          hasFeedback && {
            feedback: {
              [Op.ne]: null,
            },
          },
        ],
      },
      order: Sequelize.literal('rand()'),
      limit: Number(limit),
    });
    return questionsByBlock;
  }

  async getLastQuestions(limit) {
    const latestQuestions = await Questions.findAll({
      limit,
      order: [['createdAt', 'DESC']],
    });
    return latestQuestions.reverse();
  }

  async recreateExamQuestions(questionIds) {
    const promises = await Promise.allSettled(
      questionIds.map(
        (id) => this.getQuestionById(id),
      ),
    );
    const questions = [];
    promises.forEach(({ value }) => value && questions.push(value));
    return questions;
  }

  async getAllQuestions() {
    const result = await Questions.findAll();
    return result;
  }

  async addQuestion(question) {
    const result = await Questions.create(question);
    return result;
  }

  async updateQuestion(question) {
    const result = await Questions.update(question, {
      where: {
        id: question.id,
      },
    });
    return result;
  }

  async removeQuestion(id) {
    const rowsRemoved = await Questions.destroy({
      where: {
        id,
      },
    });
    return rowsRemoved > 0;
  }
}

export default QuestionService;
