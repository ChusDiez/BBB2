import Sequelize from 'sequelize';
import pool from '../libs/database.js';

// imp_test_sessions: Sesiones de usuario para IMP
const ImpTestSession = pool.define('imp_test_sessions', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: Sequelize.UUID,
    allowNull: false,
  },
  theme_number: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  theme_name: {
    type: Sequelize.STRING(10),
    allowNull: false,
  },
  historic_id: {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: { model: 'historics', key: 'idExam' },
  },
  questions_count: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 40,
  },
  correct_answers: {
    type: Sequelize.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  wrong_answers: {
    type: Sequelize.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  blank_answers: {
    type: Sequelize.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  answered_count: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  score_percentage: {
    type: Sequelize.DECIMAL(5,2),
    allowNull: true,
  },
  passed_p80: {
    type: Sequelize.BOOLEAN,
    allowNull: true,
  },
  cutoff_p80: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 32,
  },
  cutoff_p72: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 29,
  },
  passed_p72: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  time_spent_seconds: {
    type: Sequelize.INTEGER,
    allowNull: true,
    },
  started_at: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.NOW,
  },
  completed_at: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  created_at: {
    type: Sequelize.DATE,
    allowNull: true,
    defaultValue: Sequelize.NOW,
  },
}, {
  tableName: 'imp_test_sessions',
  freezeTableName: true,
  timestamps: false,
});

export default ImpTestSession;
