import Sequelize from 'sequelize';
import pool from '../libs/database.js';

// imp_question_attempts: Respuestas individuales por sesión IMP
const ImpQuestionAttempt = pool.define('imp_question_attempts', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  session_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: {
      model: 'imp_test_sessions',
      key: 'id',
    },
  },
  question_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: {
      model: 'questions',
      key: 'id',
    },
  },
  question_order: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  selected_answer: {
    type: Sequelize.ENUM('A', 'B', 'C'),
    allowNull: true,
  },
  correct_answer: {
    type: Sequelize.ENUM('A', 'B', 'C'),
    allowNull: false,
  },
  is_correct: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
  },
  marked_doubt: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  time_spent_seconds: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  topic: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  created_at: {
    type: Sequelize.DATE,
    allowNull: true,
    defaultValue: Sequelize.NOW,
  },
}, {
  tableName: 'imp_question_attempts',
  freezeTableName: true,
  timestamps: false,
});

export default ImpQuestionAttempt;
