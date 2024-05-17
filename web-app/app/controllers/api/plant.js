const express = require('express'),
  router = express.Router(),
  db = require('./../../models');

module.exports = function (app) {
  app.use('/api', router);
};

/**
 * Return all plants in the database.
 * @return 
 *   Array of objects with properties [id, name, mac, location, created_at, updated_at]
 */
router.get('/plants', async function(req, res, next) {
  // TODO: Handle a bad request more robustly
  const result = await db.Plant.findAll();

  let plants = [];
  result.forEach((obj) => { 
    plants.push(obj.toJSON());
  });
  res.json(plants);
});

/**
 * Return a single plant by id.
 * @return
 *   Single Object with properties [id, name, mac, location, created_at, updated_at]
 */
router.get('/plant/:plant_id', async function(req, res, next) {
  // TODO: Handle a bad request more robustly
  const plant = await db.Plant.findOne({
    where: { "id": req.params.plant_id },
    order: [[ "createdAt", "DESC" ]]
  });
  res.json(plant);
});

