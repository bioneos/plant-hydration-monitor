const express = require('express'),
  router = express.Router(),
  db = require('./../models');

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

router.post('/', async function(req, res, next) {
  saturation = req.body.sensorVal;
  console.log('Received Saturation Value: ', saturation);

  // TODO: Note that this will need to include a MAC address, hardcoding for now
  // Get our target plant (based on MAC address of POST request)
  const mac = "00:00:00:00:00:00";
  const plant = await db.Plant.findOne({
      where: { MAC: mac}
    });

  // Create a new Moisture Value
  const moisture = await db.Moisture.create({plantId: plant.id, moisture: saturation});
  await moisture.save();

  const newVals = await plant.getMoisture();
  console.log(newVals);
  for (let n = 0; n < newVals.length; n++)
  {
    console.log(`${n}: ${newVals[n].moisture} from ${newVals[n].createdAt}`);
  }

  res.json({ message: 'SUCCESS', plant: plant.toJSON()});
}) ;
