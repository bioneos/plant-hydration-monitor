const { Sequelize } = require("sequelize");
const sequelize = require("../app.js");
const Moisture = require('./moisture.js');

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
//Define 1-Many relationship
Plant.hasMany(Moisture, {
  foreignKey: 'plantId',
  as: "moisture",
  onDelete: 'cascade',
  hooks: true,
});
Moisture.belongsTo(Plant, {
  foreignKey: "plantId",
  as: "plant",
});

module.exports = Plant;