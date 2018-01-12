var config = require('./config/config');

var SerialPort = require("serialport");
var request = require('request');

var port = new SerialPort(config.serialport);
port.on('open', function(){
  console.log('Serial Port Opened');
  port.on('data', function(data){
    var sensorReading = 0;
    if (typeof data[1] != 'undefined')
    {
      sensorReading = data[1] * 256 + data[0];
    }
    else
    {
      sensorReading = data[0];
      return;
    }
    console.log(sensorReading);
    request.post(
      'http://localhost:3000/saturation',
      { json: { sensorVal: sensorReading } },
      function (error, response, body) 
      {
        if (!error && response.statusCode == 200) 
        {
          console.log('Successful communication');
        }
      }
    );
  });
});
