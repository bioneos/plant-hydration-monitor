const express = require('express'),
  router = express.Router(),
  db = require('./../../models');

module.exports = function (app) {
  app.use('/api', router);
};

/**
 * Return all saturation values for a single plant.
 * @return
 *   Array of objects with properties [plant_id, moisture, created_at, updated_at]
 */
router.get('/saturation/:plant_id', async function (req, res, next) {
  console.log('here');
  // TODO: Handle a bad request more robustly
  const result = await db.Moisture.findAll({
    where: { plantId: req.params.plant_id },
  });

  // TODO: should there be any logic for checking if the plant exists?
  // we are returning that there are no moisture values for this plant
  // but the plant might not exist at all

  let moistureValues = [];
  result.forEach((obj) => {
    moistureValues.push(obj.toJSON());
  });

  if (moistureValues.length === 0) {
    return res
      .status(404)
      .json({ error: 'No moisture values found for this plant' });
  }

  console.log(moistureValues);
  res.json(moistureValues);
});

/**
 * Return the most recent recorded saturation
 * @return
 *   Single Object with properties [plant_id, moisture, created_at, updated_at]
 */
router.get('/saturation/:plant_id/last', async function (req, res, next) {
  // TODO: Handle a bad request more robustly
  const moistureValues = await db.Moisture.findOne({
    where: { plantId: req.params.plant_id },
    order: [['createdAt', 'DESC']],
  });

  if (!moistureValues) {
    return res
      .status(404)
      .json({ error: 'No moisture values found for this plant' });
  }

  res.json(moistureValues);
});

/**
 * Create a new saturation value for a plant.
 */
router.post('/saturation', async function (req, res, next) {
  saturation = req.body.sensorVal;
  console.log('Received Saturation Value: ', saturation);

  // TODO: Note that this will need to include a MAC address, hardcoding for now
  // Get our target plant (based on MAC address of POST request)
  const mac = '00:00:00:00:00:00';
  const plant = await db.Plant.findOne({
    where: { MAC: mac },
  });

  if (!plant) {
    return res
      .status(404)
      .json({ error: 'No plant found with the given MAC address' });
  }

  // Create a new Moisture Value
  const moisture = await db.Moisture.create({
    plantId: plant.id,
    moisture: saturation,
  });
  await moisture.save();

  const newVals = await plant.getMoisture();
  for (let n = 0; n < newVals.length; n++) {
    console.log(`${n}: ${newVals[n].moisture} from ${newVals[n].createdAt}`);
  }

  res.json({ message: 'SUCCESS', plant: plant.toJSON() });
});
