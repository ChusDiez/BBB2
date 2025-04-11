import Sequelize from 'sequelize';
import pool from '../libs/database.js';

const Historic = pool.define('historics', {
  idExam: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: Sequelize.STRING(255),
  questions: {
    type: Sequelize.TEXT,
    allowNull: false,
    get() {
      return this.getDataValue('questions').split(',');
    },
    set(val) {
      this.setDataValue('questions', val.join(','));
    },
  },
  amount: Sequelize.INTEGER,
  category: Sequelize.ENUM('Tema', 'Bloque', 'Multiple'),
  type: Sequelize.STRING(20),
});

export default Historic;
