var express = require('express'),
  router = express.Router();

module.exports = function (app) {
  app.use('/', router);
};

// Page templates:
/**
 * Render the main page
 */
router.get('/', function(req, res, next) {
  // Just serve up our create UI
  res.sendfile('../public/index.html');
}) ;

