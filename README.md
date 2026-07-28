# Plant Hydration Monitor

Split up into three parts, the Plant Hydration Monitor Project has:
1. Data acquisition
2. A server
3. A database
4. A web app frontend user-interface

## Data Acquisition
Data is acquired through the ./hygrometer-esp8266-io-node/hygrometer-esp8266-iot-node.ino file. When this script is downloaded onto an esp8266, the esp will enter our configuration mode in which it waits to receive a String over serial with the following example format: SSID:Peter's iPhone|PASS:password|SERVER:192.168.1.100 Once the esp recieves this configuration String, the esp will do a very basic validation of the Wi-Fi SSID, Wi-Fi password, and server IP. If the esp recieved a valid configuration String, the esp will come out of configuration mode and connect to the network it was given in the configuration String. Once connected to the network, the esp will be put into a loop of making HTTP POST requests to the server that has the IP address the esp recieved in the configuration String. The POST requests' bodies will contain the following properties: sensorVal, humidityPercentVal, temperatureVal, and macAddress. The property sensorVal is the raw voltage on the analog output pin (determined by the capacitive moisture sensor) which is an integer ranging from 0-1024. The properties humidityPercentVal and temperatureVal are determined by the DHT11 arduino library which takes the raw information it recieves on Digital Pin 4 and turns it into a humidity percent and a temperature in celsius. The property macAddress is the MAC address of the esp. 

## The Server
The node script ./web-app/app.js starts up an express web application that listens on port 3000. Our app is configured in the file ./web-app/config/express.js such that all HTTP requests that we want to manually handle are routed to the ./web-app/app/controllers/api folder. Requests for frontend js and css files are automatically handled by express config files. The following HTTP requests are documented below.

### GET Request url= http://serverip:3000/ OR http://serverip:3000
* Handled in the file ./web-app/app/controllers/api/home.js  
* returns: the file ./web-app/public/index.html  

### GET Request url= http://serverip:3000/plant/:id
* Handled in the file ./web-app/app/controllers/api/home.js  
* returns: the file ./web-app/public/plant-details.html?id=${req.params.id}  
* NOTE: Used to navigate to plant details page

### GET Request url= http://serverip:3000/api/plants
* Handled in ./web-app/app/controllers/api/plants.js  
* returns: an array of objects with properties id, name, mac, location, created_at  
* NOTE: Used to get all the plants in the database

### GET Request url = http://serverip:3000/api/plant/:plant_id
* Handled in ./web-app/app/controllers/api/plants.js  
* returns: a single object with properties id, name, mac, location, created_at  

### GET Request url = http://serverip:3000/api/saturation/:plant_id
* Handled in ./web-app/app/controllers/api/saturation.js  
* returns: All data about the plant whose plantId property in the database matches plant_id.  
&ensp; Returns an object with key plantId and key data. The key data is an array of all data objects in the database without their plantId property. Looks like this:  
<pre><code>{
   plantId,
   data: [
      {
         createdAt,
         moisture,
         humidity,
         temperature
      },
      ... 
   ]
}</code></pre>  

### GET Request url = http://serverip:3000/api/saturation/:plant_id/last
* Handled in ./web-app/app/controllers/api/saturation.js  
* returns the last data object stored in the database whose plantId property matches plant_id.  
&ensp; Returns an object with properties plantId, createdAt, moisture, humidity, temperature. Looks like this:  
<pre><code>{       
   plantId,
   createdAt,
   moisture,
   humidity,
   temperature
}</code></pre> 

### GET Request url = http://serverip:3000/api/serial/ports
* Handled in ./web-app/app/controllers/api/serial.js
* returns a list of all devices and likely esp8266 devices connected through serial to the computer running the server.  
&ensp; Returns an object with port information. Looks like this:
<pre><code>{
   success: true,
   ports:
      { 
         path: 
         port.path,
         manufacturer: port.manufacturer,
         vendorId: port.vendorId,
         productId: port.productId,
         displayName: "port.path " + "port.manufacturer"
      },     
   allPorts:
      {
         path: port.path,
         manufacturer: port.manufacturer,
         vendorId: port.vendorId,
         productId: port.productId
      }
}</code></pre>

### POST Request url = http://serverip:3000/api/plants
* Handled in ./web-app/app/controllers/api/plant.js
* Params: an object with the properties name, location, and MAC.
* Creates a new plant row in the database with properties id, name, MAC, location, created_at, updated_at  
* returns: the sequelize object representation of the plant created in the database  
&ensp; Returns an object. Looks like this:<pre><code>{
&ensp;   id,
&ensp;   name,
&ensp;   MAC,
&ensp;   location,
&ensp;   created_at,
}</code></pre> 

### POST Request url = http://serverip:3000/api/saturation
* Handled in ./web-app/app/controllers/api/saturation.js
* Params: sensorVal, macAddress, humidityPercentVal, temperatureVal
* Success condition: the sensorVal param is truthy
* Creates a new data row in the Data table.  
* returns: the plant whose macAddress property matches the one in the params
* NOTE: sensorVal, humidityPercentVal, and temperatureVal are all sent as strings in the request body. Every request fufills the success condition because the esp8266 always sends a non empty string for sensorVal. Someone should refactor this so the esp8266 doesn't always send truthy strings.

### POST Request url = http://serverip:3000/api/serial/configure
* Handled in ./web-app/controllers/api/serial.js
* Params: ssid, password, plantName, location, devicePath
* Tries to send configuration String over serial to the device connected to the COM at the path devicePath. 
* returns: Looks like this:
<pre><code>{
   success: true,
   message:
      'Device configured successfully - ESP8266 is attempting to connect to WiFi',
   deviceResponse: response,
   allResponses: allResponses,
   combinedResponse: combinedResponse,
   configSent: `SSID:${ssid}|PASS:***HIDDEN***|SERVER:${serverIP}`,
   detectedMacAddress: detectedMacAddress,
   plantInfo: {
      name: plantName,
      location: location,
      devicePath: devicePath,
   },
}</code></pre>

### POST Request url = http://serverip:3000/api/serial/clear-eeprom
* Handled in ./web-app/controllers/api/serial.js
* Params: devicePath
* Tries to clear the EEPROM of an any esp8266 that is in configuration mode at devicePath
* Success Condition: The esp8266 tells the machine serially that the EEPROM is cleared
* returns: Looks like this:
<pre><code>{
   success: true,
   message: 'Device EEPROM cleared successfully',
   deviceResponse: response,
   allResponses: allResponses,         
}</code></pre>

### PUT Request url = http://severip:3000/api/plant/:plant_id
* Handled in ./web-app/controllers/api/plant.js
* Params: name, location MAC
* Updates the plant in the database whose plantId property is plant_id to have the name property name, location property location, and MAC property MAC.
* returns: the new plant object in the database

### DELETE Request url = http://serverip:3000/api/plant/:plant_id
* Handled in ./web-app/controllers/api/plant.js
* Deletes the plant in the database whose plantId property is plant_id


## Testing the module
Testing the ESP8266 modules from hiletgo can be done through the serial monitor (BEFORE you flash them) using these instructions:
https://www.instructables.com/Get-Started-with-ESP8266-Using-AT-Commands-NodeMCU/

## Future Roadmap
1. Get rid of the interfacing layer altogether and have the sensor hooked up to an ESP8266 module or some variety and have it post the value directly to to the web application without having to be hooked up to a computer through a serial data connection.
   * Potential hardware:
   * https://electropeak.com/nodemcu-lua-esp8266-wifi-internet-development-board (NodeMCU based) / https://www.sparkfun.com/products/17146 (Might not work without supporting board for control)
   * https://www.sparkfun.com/products/13322

2. Build a more robust web application that can support more than one sensor.
3. Build a more in depth web application that stores values in database with more information than just the current saturation level but also maybe the last time the plant was watered, a line graph of the water level instead of just a single value, battery levels of the sensor, etc.
4. Implement better security for the IoT setup.
5. Have the plants get watered automatically with solenoid valves and pumps?


| Device State / Action          | Meaning to User                               | LED Behavior(BlinkPattern)             |
| :---------------------------- | :------------------------------------------- | :--------------------------------------- |
| Booting Up                 | Device just powered on                        | Solid ON for 3 seconds                    |
| Awaiting Configuration      | Waiting for Wi-Fi credentials via Serial     | LED ON 500ms, OFF 2500ms (slow blink)    |
| Connecting to Wi-Fi         | Trying to connect to saved Wi-Fi             | LED ON 100ms, OFF 400ms (fast blink)     |
| Data Sent Successfully      | Moisture level sent to server                 | 1 quick blink (LED ON 100ms, OFF 100ms)  |
| Send/Server Error           | Couldn’t connect or POST failed               | 3 quick blinks (LED ON/OFF 100ms)        |
| Wi-Fi Failing Repeatedly    | Connection failing repeatedly                  | 5 quick blinks every 5 seconds           |

