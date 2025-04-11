import Sequelize from 'sequelize';
import pool from '../libs/database.js';

const Temporary = pool.define('temporaryJoin', {
  questionId: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
}, {
  timestamps: false,
});

export default Temporary;
