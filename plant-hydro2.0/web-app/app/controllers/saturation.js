const express = require('express'),
  router = express.Router(),
  db = require('./../models');
const accountSid = 'AC6169854f38f868c970a8cf9cfc96de4a';
const authToken = '84199f153791f106e3758ef8be9fd6d0';
const TWILIO_PHONE_NUMBER = '+18667141792';
let testText = 0;

const client = require('twilio')(accountSid, authToken);
/*
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:');
const TheCurrentDate = sequelize.define('TheCurrentDate', {
  myDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW }
});

const TheLastDate = sequelize.define('TheLastDate', {
  previousDate: { type: DataTypes.DATEONLY}
});

(async () => {
  await sequelize.sync({ force: true });
  const lastSentDate = TheLastDate.build();
})();
*/




let saturation = 1023;
module.exports = function (app) {
  app.use('/saturation', router);
};

let messageFrequency = 'daily'; 

module.exports = function (app) {
  app.use('/saturation', router);
};

// Page templates:
/**
 * Render the main page
 */
router.get('/', function (req, res, next) {
  res.json({ value: saturation });
});

router.post('/', async function(req, res, next) {
  saturation = req.body.sensorVal;
  console.log('Received Saturation Value: ', saturation);

  const mac = "00:00:00:00:00:00";
  const plant = await db.Plant.findOne({
      where: { MAC: mac}
    });

  // Create a new Moisture Value
  const moisture = await db.Moisture.create({plantId: plant.id, moisture: saturation});
  await moisture.save();

  const newVals = await plant.getMoisture();
  for (let n = 0; n < newVals.length; n++)
  {
    console.log(`${n}: ${newVals[n].moisture} from ${newVals[n].createdAt}`);
  }

  const TheCurrentDate = await db.create({
    myDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW }
   });
  
  const TheLastDate = await db.create({
    previousDate: { type: DataTypes.DATEONLY}
   });
  
  const currentDate = TheCurrentDate.build();
  console.log("Our date: " , currentDate.myDate);
  const lastDate = TheLastDate.build();

  if (
    (messageFrequency === 'daily' && (lastSentDate === null || currentDate.getDate() !== lastSentDate.getDate()))
  ) {
    client.messages
      .create({
        from: '+18667141792',
        to: '+18777804236',
        body: 'low'
      })
      .then(message => {
        console.log(message.sid);
        lastDate = currentDate;
        lastDate.save();
      })
      .catch(error => console.error('Error sending SMS:', error))
      .done();
  }

  res.json({ message: 'SUCCESS' });
});
