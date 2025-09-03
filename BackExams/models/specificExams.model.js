import Sequelize from 'sequelize';
import pool from '../libs/database.js';

const SpecificExam = pool.define('specific_exams', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  exam_name: {
    type: Sequelize.STRING(200),
    allowNull: false,
  },
  exam_type: {
    type: Sequelize.STRING(50),
    allowNull: false,
    comment: 'rf, constitutional, administrative, etc.',
  },
  historic_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: {
      model: 'historics',
      key: 'idExam',
    },
  },
  
  // Estados y disponibilidad
  status: {
    type: Sequelize.STRING(50),
    defaultValue: 'draft',
    allowNull: false,
  },
  immediately_available: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  
  // Ventana de disponibilidad específica
  window_start_date: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  window_end_date: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  
  // Liberación al pool global
  global_release_date: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  auto_release: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  released_to_global: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  
  // Metadatos
  total_questions: {
    type: Sequelize.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  created_at: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW,
    allowNull: false,
  },
});

export default SpecificExam;
