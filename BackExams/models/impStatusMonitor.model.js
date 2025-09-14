import Sequelize from 'sequelize';
import pool from '../libs/database.js';

// imp_status_monitor: Métricas agregadas por tema IMP
const ImpStatusMonitor = pool.define('imp_status_monitor', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  theme_number: {
    type: Sequelize.INTEGER,
    allowNull: false,
    unique: true,
  },
  theme_name: {
    type: Sequelize.STRING(10),
    allowNull: false,
    unique: true,
  },
  total_attempts: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  total_users: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  total_completed: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  avg_score: {
    type: Sequelize.DECIMAL(5,2),
    defaultValue: 0,
    allowNull: false,
  },
  pass_rate_p80: {
    type: Sequelize.DECIMAL(5,2),
    defaultValue: 0,
    allowNull: false,
  },
  avg_time_minutes: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  total_correct_answers: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  total_wrong_answers: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  total_blank_answers: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  last_updated: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.NOW,
  },
}, {
  tableName: 'imp_status_monitor',
  freezeTableName: true,
  timestamps: false,
});

export default ImpStatusMonitor;
