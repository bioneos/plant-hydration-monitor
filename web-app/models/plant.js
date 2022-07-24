const { Sequelize } = require("sequelize");
const sequelize = require("../app.js");

Plant = sequelize.define("plant", {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  location: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  MAC: {
    type: Sequelize.STRING,
    allowNull: false,
  }
});

module.exports = Plant;