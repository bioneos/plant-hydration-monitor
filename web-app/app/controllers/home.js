const express = require('express'),
  router = express.Router();

module.exports = function (app) {
  app.use('/', router);
};

// Page templates:
/**
 * Render the main page
 */
router.get('/', function (req, res, next) {
  // Just serve up our create UI
  res.sendFile('../public/index.html');
});

/**
 * Render individual plant detail page
 */
router.get('/plant/:id', function (req, res, next) {
  // when clicking on a plant card, the user is taken to a detailed view of the plant
  // the plant id is passed in the URL as a query parameter
  console.log(`Redirecting to plant detail for ID: ${req.params.id}`);
  res.redirect(`/plant-detail.html?id=${req.params.id}`);
});

