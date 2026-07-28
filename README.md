# Plant Hydration Monitor

Split up into three parts, the Plant Hydration Monitor Project has:
1. Data acquisition
2. A server
3. A database
4. A web app frontend user-interface

## Data Acquisition
Data is acquired through the ./hygrometer-esp8266-io-node/hygrometer-esp8266-iot-node.ino file. When this script is downloaded onto an esp8266, the esp will enter our configuration mode in which it waits to receive a String over serial with the following example format: SSID:Peter's iPhone|PASS:password|SERVER:192.168.1.100 Once the esp recieves this configuration String, the esp will do a very basic validation of the Wi-Fi SSID, Wi-Fi password, and server IP. If the esp recieved a valid configuration String, the esp will come out of configuration mode and connect to the network it was given in the configuration String. Once connected to the network, the esp will be put into a loop of making HTTP POST requests to the server that has the IP address the esp recieved in the configuration String. The POST requests' bodies will contain the following properties: sensorVal, humidityPercentVal, temperatureVal, and macAddress. The property sensorVal is the raw voltage on the analog output pin (determined by the capacitive moisture sensor) which is an integer ranging from 0-1024. The properties humidityPercentVal and temperatureVal are determined by the DHT11 arduino library which takes the raw information it recieves on Digital Pin 4 and turns it into a humidity percent and a temperature in celsius. The property macAddress is the MAC address of the esp. 


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

