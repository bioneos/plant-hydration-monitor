# Plant Hydration Monitor

Split up into three parts, the Plant Hydration Monitor has:
1. Data Acquisition
2. An interfacing layer
3. A webapp

## Data Acquisition
Located in ./hygrometer-reading/hygrometer-reading.ino, the data acquisition layer is written for an arduino with a hygrometer connected to get the moisture level of the soil. The Arduino reads in the value and sends the data over the serial port to the computer that is powering the Arduino and running the Interfacing Layer.  The easiest way to get this flashed onto an Arduino is to use the Arduino IDE.  More details regarding the schematics and hardware information to come soon.

## Interfacing Layer
This Node application, located in ./plant-hydration-interface, reads in the serial data coming in from the Data Acquisition script over a configurable serialport and sends the data with an http post request to the web application portion.  Right now it assumes the web app is running at localhost:3000.  This should be updated so that the url and port are configurable.

## Web Application
The web application portion, located in ./web-app is a very simple application at this point.  It stores one value that is posted to the correct url from the interfacing layer and displays that to the web page.  Obviously this setup will only work for one sensor.


## Future Roadmap
1. Get rid of the interfacing layer altogether and have the sensor hooked up to an ESP8266 module or some variety and have it post the value directly to to the web application without having to be hooked up to a computer through a serial data connection.
   * Potential hardware:
   * https://electropeak.com/nodemcu-lua-esp8266-wifi-internet-development-board (NodeMCU based) / https://www.sparkfun.com/products/17146 (Might not work without supporting board for control)
   * https://www.sparkfun.com/products/13322

2. Build a more robust web application that can support more than one sensor.
3. Build a more in depth web application that stores values in database with more information than just the current saturation level but also maybe the last time the plant was watered, a line graph of the water level instead of just a single value, battery levels of the sensor, etc.
4. Implement better security for the IoT setup.
5. Have the plants get watered automatically with solenoid valves and pumps?

