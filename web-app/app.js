const express = require('express'),
  models = require('./app/models'),
  config = require('./config/config');

let app = express();

require('./config/express')(app, config);

console.log('Starting up on: ' + config.port);
app.listen(config.port);
