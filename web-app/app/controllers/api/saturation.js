const data = require('../../models/data');

const express = require('express'),
  router = express.Router(),
  db = require('./../../models');

module.exports = function (app) {
  app.use('/api', router);
};

/**
 * Return all saturation values for a single plant.
 * @return
 *    object with plantId and object array data.
 *      {
 *        plantId,
 *        data: [
 *          {
 *            createdAt,
 *            moisture,
 *            humidity,
 *            temperature
 *          },
 *          ... 
 *        ]
 *      }
 */
router.get('/saturation/:plant_id', async function (req, res, next) {
  // TODO: Handle a bad request more robustly
  const dbResult = await db.Data.findAll({
    where: { plantId: req.params.plant_id },
  });

  // TODO: should there be any logic for checking if the plant exists?
  // we are returning that there are no moisture values for this plant
  // but the plant might not exist at all

  let dbValues = [];
  dbResult.forEach((obj) => {
    dbValues.push(obj.toJSON());
  });

  if (dbValues.length === 0) {
    return res
      .status(404)
      .json({ error: 'No data found for this plant' });
  }
  
  /** dbValues looks like this:
   * [
   *    {
   *      plantId,
   *      createdAt,
   *      moisture,
   *      humidity,
   *      temperature
   *    },
   *    ...
   * ]
   * We don't need the plantId in every object so we return this:
   *       {
   *        plantId,
   *        data: [
   *          {
   *            createdAt,
   *            moisture,
   *            humidity,
   *            temperature
   *          },
   *          ... 
   *        ]
   *      }
   *  */  

  let dataValues = [];
  dbValues.forEach(obj => {
    dataValues.push({
      createdAt: obj.createdAt,
      moisture: obj.moisture,
      humidity: obj.humidity,
      temperature: obj.temperature
    });
  }); 

  const response = {
    plantId: req.params.plant_id, 
    data: dataValues
  }

  res.json(response);
});

/**
 * Return the most recent recorded saturation
 * @return
 *    object with properties plantId, createdAt, moisture, humidity, temperature 
 *      {
 *        plantId,
 *        createdAt,
 *        moisture,
 *        humidity,
 *        temperature
 *      }
 */
router.get('/saturation/:plant_id/last', async function (req, res, next) {
  // TODO: Handle a bad request more robustly
  const dataInstance = await db.Data.findOne({
    where: { plantId: req.params.plant_id },
    order: [['createdAt', 'DESC']],
  });

  // data instance is necessary
  if (!dataInstance) {
    return res
      .status(404)
      .json({ error: 'No data found for this plant' });
  }
  
  res.json(dataInstance);
});

/**
 * Create new moisture, humidity, and temperature values for a plant.
 */
router.post('/saturation', async function (req, res, next) {
  
  const macAddress = req.body.macAddress;

  const moistureValue = req.body.sensorVal;
  const humidityPercentValue = req.body.humidityPercentVal || null;
  const temperatureValue = req.body.temperatureVal || null;

  console.log('Received Saturation Value:', moistureValue);
  console.log('Received Humidity value: ', humidityPercentValue);
  console.log('Received temperature value: ', temperatureValue);
  console.log('From MAC Address:', macAddress);

  // Humidity and temperature are not required, those properties can be null.
  if (!moistureValue) {
    return res.status(400).json({ error: 'sensorVal is required' });
  }

  if (!macAddress) {
    return res.status(400).json({ error: 'macAddress is required' });
  }
  if(!temperatureValue) {
    console.log("No temperature value");
  }
  if(!humidityPercentValue) {
    console.log("No humidity value");
  }

  // Get our target plant (based on MAC address of POST request)
  const plant = await db.Plant.findOne({
    where: { MAC: macAddress },
  });

  if (!plant) {
    console.log(`No plant found with MAC address: ${macAddress}`);
    return res
      .status(404)
      .json({
        error: 'No plant found with the given MAC address',
        macAddress: macAddress,
      });
  }

  // Create data instance
  const dataInstance = await db.Data.create({
    plantId: plant.id,
    moisture: moistureValue,
    humidity: humidityPercentValue,
    temperature: temperatureValue  
  });
  console.log("Successfully created new data row with moisture:", dataInstance.moisture, "humidity:", dataInstance.humidity, "and temperature:", dataInstance.temperature, "from", dataInstance.createdAt.toLocaleString());

  res.json({
    message: 'SUCCESS',
    plant: plant.toJSON(),
    macAddress: macAddress,
  });
});
