const express = require('express'),
  router = express.Router();

let saturation = 1023;
module.exports = function (app) {
  app.use('/saturation', router);
};

// Page templates:
/**
 * Render the main page
 */
router.get('/', function(req, res, next) {
  res.json({ value: saturation });
}) ;

router.post('/', function(req, res, next) {
  saturation = req.body.sensorVal;
  console.log('Saturation Value: ', saturation);
  res.json({ message: 'SUCCESS'});
}) ;
