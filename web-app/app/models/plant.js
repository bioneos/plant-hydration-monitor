'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Plant extends Model {
    static associate(models) {
      Plant.hasMany(models.Moisture, { 
        foreignKey: "plantId",
        as: 'moisture',
      });
    }
  }
  Plant.init({
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false},
    name: { type: DataTypes.STRING, allowNull: false },
    location: { type: DataTypes.STRING, allowNull: false },
    MAC: { type: DataTypes.STRING, allowNull: false },
  }, {
    sequelize,
    modelName: 'Plant',
  });
  return Plant;
};