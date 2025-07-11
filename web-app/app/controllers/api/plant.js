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
router.get('/plants', async (req, res, next) => {
  // TODO: Handle a bad request more robustly
  const result = await db.Plant.findAll();

  let plants = [];
  result.forEach((obj) => {
    plants.push(obj.toJSON());
  });

  if (plants.length === 0) {
    return res.status(404).json({ error: 'No plants found in the database' });
  }

  res.json(plants);
});

/**
 * Create a new plant: name, location, MAC
 * @return
 *   Single Object with properties id, name, mac, location, created_at, updated_at
 */
router.post('/plants', async function (req, res, next) {
  try {
    const { name, location, MAC } = req.body;

    // validate required fields
    if (!name || !location || !MAC) {
      return res.status(400).json({
        error: 'Missing required fields: name, location, and MAC are required',
      });
    }

    // check if a plant with this MAC address already exists
    const existingPlant = await db.Plant.findOne({
      where: { MAC: MAC },
    });

    if (existingPlant) {
      return res.status(409).json({
        error: `A plant with MAC address ${MAC} already exists: "${existingPlant.name}" at ${existingPlant.location}`,
      });
    }

    const plant = await db.Plant.create({
      name,
      location,
      MAC,
    });

    res.status(201).json(plant.toJSON());
  } catch (error) {
    console.error('Error creating plant:', error);
    res.status(500).json({
      error: 'Failed to create plant: ' + error.message,
    });
  }
});

/**
 * Return a single plant by id.
 * @return
 *   Single Object with properties [id, name, mac, location, created_at, updated_at]
 */
router.get('/plant/:plant_id', async function (req, res, next) {
  // TODO: Handle a bad request more robustly
  const plant = await db.Plant.findOne({
    where: { id: req.params.plant_id },
    order: [['createdAt', 'DESC']],
  });
  if (!plant) {
    return res.status(404).json({ error: 'No plant found with the given ID' });
  }
  res.json(plant);
});

/**
 * Update a plant's details i.e.e name, location, MAC
 * @return
 *  Single Object with properties [id, name, mac, location, created_at, updated_at]
 */
router.put('/plant/:plant_id', async (req, res, next) => {
  const { name, location, MAC } = req.body;

  const [changedRowCount] = await db.Plant.update(
    { name, location, MAC },
    { where: { id: req.params.plant_id } }
  );
  if (changedRowCount === 0) {
    return res.status(404).json({ error: 'No plant found with the given ID' });
  }
  res.status(204).send();
});

/**
 * Delete a plant by id
 * @return
 * 204 Delete successful
 */
router.delete('/plant/:plant_id', async (req, res, next) => {
  const plant = await db.Plant.destroy({
    where: { id: req.params.plant_id },
  });
  if (!plant) {
    return res.status(404).json({ error: 'No plant found with the given ID' });
  }
  res.status(204).send();
});
