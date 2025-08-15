import Sequelize from 'sequelize';
import pool from '../libs/database.js';

/**
 * Modelo para registrar logs de importación de CSV desde Evolcampus
 */
const ImportLogs = pool.define('import_logs', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  fileName: {
    type: Sequelize.STRING(255),
    allowNull: false,
    comment: 'Nombre del archivo CSV importado'
  },
  topic: {
    type: Sequelize.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 45
    },
    comment: 'Tema especificado durante la importación'
  },
  block: {
    type: Sequelize.ENUM('1', '2', '3'),
    allowNull: false,
    comment: 'Bloque calculado automáticamente según el tema'
  },
  totalQuestions: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Total de preguntas procesadas'
  },
  newQuestions: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Preguntas nuevas creadas'
  },
  updatedQuestions: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Preguntas existentes actualizadas'
  },
  skippedQuestions: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Preguntas omitidas por el usuario'
  },
  errorQuestions: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Preguntas con errores de validación'
  },
  userId: {
    type: Sequelize.STRING(100),
    allowNull: true,
    comment: 'ID del usuario que realizó la importación'
  },
  importedData: {
    type: Sequelize.JSON,
    allowNull: true,
    comment: 'Metadatos adicionales de la importación en formato JSON'
  },
  errors: {
    type: Sequelize.JSON,
    allowNull: true,
    comment: 'Lista de errores encontrados durante la importación'
  },
  status: {
    type: Sequelize.ENUM('pending', 'completed', 'failed', 'partial'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Estado de la importación'
  },
  processingTime: {
    type: Sequelize.INTEGER,
    allowNull: true,
    comment: 'Tiempo de procesamiento en milisegundos'
  }
}, {
  timestamps: true, // Añade createdAt y updatedAt automáticamente
  tableName: 'import_logs',
  indexes: [
    {
      fields: ['topic']
    },
    {
      fields: ['block']
    },
    {
      fields: ['status']
    },
    {
      fields: ['createdAt']
    }
  ]
});

export default ImportLogs;
