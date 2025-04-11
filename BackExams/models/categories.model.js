import Sequelize from 'sequelize';
import pool from '../libs/database.js';

const Categories = pool.define('categories', {
  topic: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    allowNull: false,
    unique: true,
  },
  name: Sequelize.STRING,
  block: Sequelize.ENUM('Juridicas', 'Ciencias Sociales', 'Tecnico Cientificas'),
  slug: Sequelize.STRING,
}, {
  timestamps: false,
});

export default Categories;
