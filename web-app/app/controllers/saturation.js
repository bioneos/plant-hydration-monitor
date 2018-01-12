var express = require('express'),
  router = express.Router();

var saturation = 1023;
module.exports = function (app) {
  app.use('/saturation', router);
};

// Page templates:
/**
 * Render the main page
 */
router.get('/', function(req, res, next) {
  // Just serve up our create UI
  res.send(saturation.toString());
}) ;

router.post('/', function(req, res, next) {
  // Just serve up our create UI
  saturation = req.body.sensorVal;
  console.log('Saturation Value: ', saturation);
  res.send('SUCCESS');
}) ;
