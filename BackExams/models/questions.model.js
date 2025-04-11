import Sequelize from 'sequelize';
import pool from '../libs/database.js';

const Questions = pool.define('questions', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  block: Sequelize.ENUM('1', '2', '3'),
  topic: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  question: Sequelize.TEXT,
  optionA: Sequelize.TEXT,
  optionB: Sequelize.TEXT,
  optionC: Sequelize.TEXT,
  correctAnswer: Sequelize.ENUM('A', 'B', 'C'),
  feedback: Sequelize.TEXT,
});

export default Questions;
