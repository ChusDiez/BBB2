import Sequelize from 'sequelize';
import pool from '../libs/database.js';

// imp_availability_control: Control temporal y disponibilidad para IMP
const ImpAvailability = pool.define('imp_availability_control', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  theme_number: {
    type: Sequelize.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 45 },
  },
  theme_name: {
    type: Sequelize.STRING(10),
    allowNull: false,
    comment: 'Formato X_IMP1 o X_IMP2',
    validate: { is: /^\d+_IMP[12]$/ },
  },
  imp_variant: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      isIn: [[1, 2]],
    },
    comment: 'Variante del IMP: 1 (40 preguntas) o 2 (20 preguntas)',
  },
  historic_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    references: {
      model: 'historics',
      key: 'idExam',
    },
  },
  status: {
    type: Sequelize.STRING(50),
    allowNull: false,
    defaultValue: 'active',
  },
  window_start_date: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  window_end_date: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  global_release_date: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  released_to_global: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  immediately_available: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  auto_release: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  total_questions: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 40,
  },
  created_at: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.NOW,
  },
  updated_at: {
    type: Sequelize.DATE,
    allowNull: false,
    defaultValue: Sequelize.NOW,
  },
}, {
  tableName: 'imp_availability_control',
  freezeTableName: true,
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['theme_number', 'imp_variant'],
      name: 'imp_availability_control_theme_variant_unique',
    },
  ],
});

export default ImpAvailability;
