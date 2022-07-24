const Sequelize = require("sequelize");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: '../../../database/plant.db'
});

module.exports = sequelize;
var express = require('express'),
  config = require('./config/config');

var app = express();

require('./config/express')(app, config);

console.log('Starting up on: ' + config.port);
app.listen(config.port);
