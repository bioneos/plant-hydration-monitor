'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Moisture extends Model {
    static associate(models) {
      Moisture.belongsTo(models.Plant, {
        foreignKey: "plantId",
        as: 'plant',
        onDelete: 'cascade',
        foreignKey: { allowNull: false },
        hooks: true,
      });
    }
  }
  Moisture.init({
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false},
    moisture: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    sequelize,
    modelName: 'Moisture',
  });
  return Moisture;
};