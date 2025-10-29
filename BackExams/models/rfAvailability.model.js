import Sequelize from 'sequelize';
import pool from '../libs/database.js';

const RFAvailability = pool.define('rf_availability_control', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  historic_id: {
    type: Sequelize.INTEGER,
    allowNull: true,
    unique: true,
    references: {
      model: 'historics',
      key: 'idExam',
    },
  },
  rf_name: {
    type: Sequelize.TEXT,
    allowNull: false,
    comment: 'Nombre interno del RF (ej: RF1, RF30)',
  },
  status: {
    type: Sequelize.TEXT,
    defaultValue: 'draft',
    allowNull: true,
    validate: {
      isIn: [['draft', 'specific_only', 'globally_available', 'event_active']],
    },
  },
  promocion_id: {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: {
      model: 'promociones',
      key: 'id',
    },
    comment: 'ID de la promoción (4=Promo 42, 5=Promo 43, etc.)',
  },
  display_name: {
    type: Sequelize.TEXT,
    allowNull: true,
    comment: 'Nombre mostrado al usuario (ej: "RF 1", "43-01"). Se calcula automáticamente por trigger.',
  },
  specific_window_start: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  specific_window_end: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  global_release_date: {
    type: Sequelize.DATEONLY,
    allowNull: true,
  },
  event_active: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  },
  event_start: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  event_end: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  created_at: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW,
    allowNull: true,
    field: 'created_at',
  },
  updated_at: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW,
    allowNull: true,
    field: 'updated_at',
  },
}, {
  timestamps: false, // Manejamos created_at y updated_at manualmente
  tableName: 'rf_availability_control',
  schema: 'public',
});

export default RFAvailability;

