'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Data extends Model {
    static associate(models) {
      Data.belongsTo(models.Plant, {
        foreignKey: "plantId",
        as: 'plant',
        onDelete: 'cascade',
        foreignKey: { allowNull: false },
        hooks: true,
      });
    }
  }
  Data.init({
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false},
    moisture: { type: DataTypes.INTEGER, allowNull: false },
    humidity: { type: DataTypes.INTEGER, allowNull: true },
    temperature: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    sequelize,
    modelName: 'Data',
    createdAt: true,
    updatedAt: false
  });
  return Data;
};