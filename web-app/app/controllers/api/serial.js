const express = require('express'),
  router = express.Router(),
  { SerialPort } = require('serialport');

module.exports = function (app) {
  app.use('/api', router);
};

router.post('/serial/configure', async (req, res) => {
  try {
    const { ssid, password, plantName, location, macAddress, devicePath } =
      req.body;

    // NOTE: this impl has several security considerations...
    // - password is sent over HTTP
    // - password is sent to device in plain text over serial
    // - consider encryption or secure key exchange for production???
    // - this works fine for local network development but not for production use

    if (
      !ssid ||
      !password ||
      !plantName ||
      !location ||
      !macAddress ||
      !devicePath
    ) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    // get server IP dynamically - avoid localhost
    let serverIP = '192.168.1.100'; // default fallback
    if (req.headers.host) {
      const hostIP = req.headers.host.split(':')[0];
      // only use if it's a valid IP address, not localhost or hostname
      // b/c we don't want to fail the validation happening on the esp
      if (/^\d+\.\d+\.\d+\.\d+$/.test(hostIP)) {
        serverIP = hostIP;
      } else {
        console.log(
          `Host ${hostIP} is not a valid IP, using default ${serverIP}`
        );
      }
    }

    // Format the configuration string exactly as the device expects
    // ex: "SSID:My iPhone|PASS:password|SERVER:192.168.1.100"
    const configStr = `SSID:${ssid}|PASS:${password}|SERVER:${serverIP}\n`;

    console.log(`Attempting to configure device at ${devicePath}`);
    console.log(`Using server IP: ${serverIP}`);
    console.log(
      `Configuration string: SSID:${ssid}|PASS:***HIDDEN***|SERVER:${serverIP}`
    );
    console.log(`Raw config string length: ${configStr.length} bytes`);
    console.log(
      `Raw config string (with escapes): ${JSON.stringify(configStr)}`
    );

    console.log(devicePath);
    // create serial connection
    const port = new SerialPort({
      path: devicePath,
      baudRate: 115200,
      autoOpen: false, // we'll open it manually
    });

    // wrapper for serial operations
    return new Promise((resolve, reject) => {
      let responseReceived = false;
      let allResponses = []; // collect all responses for debugging

      const timeout = setTimeout(() => {
        if (!responseReceived) {
          console.log(
            'Configuration timeout - no valid response received from device'
          );
          console.log(
            'All responses received during timeout period:',
            allResponses
          );
          if (port.isOpen) {
            port.close();
          }
          reject(
            new Error(
              'Configuration timeout - no response from device. Make sure the ESP8266 is in configuration mode and listening for serial data.'
            )
          );
        }
      }, 30000);

      port.on('error', (err) => {
        clearTimeout(timeout);
        responseReceived = true;
        console.error('Serial port error:', err.message);
        if (port.isOpen) {
          try {
            port.close();
          } catch (closeErr) {
            console.error('Error closing port:', closeErr.message);
          }
        }
        reject(
          new Error(
            `Serial port error: ${err.message}. Make sure the device is connected and not in use by another application.`
          )
        );
      });

      port.on('open', () => {
        console.log('Serial port opened successfully');
        console.log(`Sending configuration: ${configStr.trim()}`);
        console.log(`Bytes to send: ${Buffer.from(configStr).length}`);

        // add a small delay before writing to ensure port is ready
        setTimeout(() => {
          console.log('Writing data to serial port...');
          port.write(configStr, (err) => {
            if (err) {
              clearTimeout(timeout);
              responseReceived = true;
              console.error('Failed to write to serial port:', err);
              if (port.isOpen) {
                port.close();
              }
              reject(err);
            } else {
              console.log(
                'Configuration data written to serial port successfully'
              );
              console.log('Bytes written:', Buffer.from(configStr).length);
              console.log(
                'Sent to device: SSID:' +
                  ssid +
                  '|PASS:***HIDDEN***|SERVER:' +
                  serverIP
              );
              console.log('Waiting for device response...');
            }
          });
        }, 500); // wait 500ms before sending data
      });

      port.on('data', (data) => {
        const response = data.toString().trim();
        allResponses.push(response); // Track all responses
        console.log('Raw device response received:', JSON.stringify(response));
        console.log('Device response length:', response.length);
        console.log('Device response (trimmed):', response);
        console.log('Total responses so far:', allResponses.length);

        // Join all responses to check for success indicators across chunks
        const combinedResponse = allResponses.join('');
        console.log(
          'Combined response so far:',
          JSON.stringify(combinedResponse)
        );

        // Check for ESP8266 config success indicators (in hygrometer-esp8266-iot-node.ino)
        if (
          combinedResponse &&
          (combinedResponse.includes('Configuration saved to EEPROM') ||
            combinedResponse.includes('saved to EEPROM') ||
            combinedResponse.includes('CONFIG_SAVED') ||
            combinedResponse.includes('EEPROM commit') ||
            combinedResponse.includes('Parsed IP:') ||
            combinedResponse.includes('✅') ||
            combinedResponse.includes('valid: true') ||
            combinedResponse.includes('Pass valid: true') ||
            combinedResponse.includes('Server valid: true') ||
            combinedResponse.includes('Port valid: true') ||
            combinedResponse.includes('Connecting to:') ||
            combinedResponse === 'OK' ||
            combinedResponse === 'SUCCESS')
        ) {
          console.log(
            'Valid device response detected - configuration successful'
          );
          console.log('Success found in combined response:', combinedResponse);
          clearTimeout(timeout);
          responseReceived = true;

          // close port after a short delay to ensure all data is received
          setTimeout(() => {
            if (port.isOpen) {
              console.log('Closing serial port');
              port.close();
            }
          }, 1000);

          resolve({
            success: true,
            message:
              'Device configured successfully - ESP8266 is attempting to connect to WiFi',
            deviceResponse: response,
            allResponses: allResponses, // Include all responses for debugging
            combinedResponse: combinedResponse, // Include combined response for debugging
            configSent: `SSID:${ssid}|PASS:***HIDDEN***|SERVER:${serverIP}`,
            plantInfo: {
              name: plantName,
              location: location,
              macAddress: macAddress,
              devicePath: devicePath,
            },
          });
        } else {
          console.log(
            `Ignoring response chunk (no success indicator yet): "${response}"`
          );
          // don't resolve or reject here, keep waiting for real response
        }
      });

      port.on('close', () => {
        console.log('Serial port closed');
      });

      // open the port
      console.log(`Opening serial port: ${devicePath}`);
      port.open((err) => {
        if (err) {
          console.error('Failed to open serial port:', err.message);
          clearTimeout(timeout);
          responseReceived = true;
          reject(
            new Error(
              `Failed to open serial port: ${err.message}. Make sure the device is connected and not in use.`
            )
          );
        }
      });
    })
      .then((result) => {
        res.json(result);
      })
      .catch((error) => {
        console.error('Serial configuration error:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to configure device',
          error: error.toString(),
        });
      });
  } catch (error) {
    console.error('Serial configure error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

router.post('/serial/clear-eeprom', async (req, res) => {
  try {
    const { devicePath } = req.body;

    if (!devicePath) {
      return res.status(400).json({
        success: false,
        message: 'Device path is required',
      });
    }

    console.log(`Attempting to clear EEPROM on device at ${devicePath}`);

    // create serial connection
    const port = new SerialPort({
      path: devicePath,
      baudRate: 115200,
      autoOpen: false,
    });

    // wrapper for serial operations
    return new Promise((resolve, reject) => {
      let responseReceived = false;
      let allResponses = [];

      const timeout = setTimeout(() => {
        if (!responseReceived) {
          console.log(
            'EEPROM clear timeout - no valid response received from device'
          );
          console.log(
            'All responses received during timeout period:',
            allResponses
          );
          if (port.isOpen) {
            port.close();
          }
          reject(
            new Error(
              'EEPROM clear timeout - no response from device. Make sure the ESP8266 is connected and in startup mode (restart the device).'
            )
          );
        }
      }, 10000); // 10 second timeout for CLEAR command

      port.on('error', (err) => {
        clearTimeout(timeout);
        responseReceived = true;
        console.error('Serial port error:', err.message);
        if (port.isOpen) {
          try {
            port.close();
          } catch (closeErr) {
            console.error('Error closing port:', closeErr.message);
          }
        }
        reject(
          new Error(
            `Serial port error: ${err.message}. Make sure the device is connected and not in use by another application.`
          )
        );
      });

      port.on('open', () => {
        console.log('Serial port opened successfully for EEPROM clear');

        // ESP8266 expects CLEAR command during startup (first 5 seconds)
        setTimeout(() => {
          console.log('Sending CLEAR command to device...');
          port.write('CLEAR\n', (err) => {
            if (err) {
              clearTimeout(timeout);
              responseReceived = true;
              console.error('Failed to write CLEAR command:', err);
              if (port.isOpen) {
                port.close();
              }
              reject(err);
            } else {
              console.log('CLEAR command sent successfully');
            }
          });
        }, 500);
      });

      port.on('data', (data) => {
        const response = data.toString().trim();
        allResponses.push(response);
        console.log('Raw device response received:', JSON.stringify(response));

        // join all responses to check for success indicators
        const combinedResponse = allResponses.join('');

        // check for EEPROM clear success indicators
        if (
          combinedResponse &&
          (combinedResponse.includes('EEPROM cleared') ||
            combinedResponse.includes('Wiping EEPROM') ||
            combinedResponse.includes('Entering configuration mode') ||
            combinedResponse.includes('Received CLEAR'))
        ) {
          console.log('EEPROM clear successful');
          clearTimeout(timeout);
          responseReceived = true;

          setTimeout(() => {
            if (port.isOpen) {
              console.log('Closing serial port');
              port.close();
            }
          }, 1000);

          resolve({
            success: true,
            message: 'Device EEPROM cleared successfully',
            deviceResponse: response,
            allResponses: allResponses,
          });
        } else {
          console.log(`Waiting for EEPROM clear confirmation: "${response}"`);
        }
      });

      port.on('close', () => {
        console.log('Serial port closed');
      });

      // open the port
      console.log(`Opening serial port for EEPROM clear: ${devicePath}`);
      port.open((err) => {
        if (err) {
          console.error('Failed to open serial port:', err.message);
          clearTimeout(timeout);
          responseReceived = true;
          reject(
            new Error(
              `Failed to open serial port: ${err.message}. Make sure the device is connected and not in use.`
            )
          );
        }
      });
    })
      .then((result) => {
        res.json(result);
      })
      .catch((error) => {
        console.error('EEPROM clear error:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to clear device EEPROM',
          error: error.toString(),
        });
      });
  } catch (error) {
    console.error('EEPROM clear error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

router.get('/serial/ports', async (req, res) => {
  try {
    const ports = await SerialPort.list();
    console.log('Available ports:', ports);

    // Filter for likely Arduino/ESP8266 devices
    const filteredPorts = ports.filter((port) => {
      const path = port.path.toLowerCase();
      const manufacturer = (port.manufacturer || '').toLowerCase();
      //   const vendorId = port.vendorId;

      return (
        path.includes('tty.usbserial') ||
        path.includes('cu.usbserial') ||
        manufacturer.includes('arduino') ||
        manufacturer.includes('silicon labs')
      );
    });

    res.json({
      success: true,
      ports: filteredPorts.map((port) => ({
        path: port.path,
        manufacturer: port.manufacturer || 'Unknown',
        vendorId: port.vendorId,
        productId: port.productId,
        displayName: `${port.path} (${
          port.manufacturer || 'Unknown Manufacturer'
        })`,
      })),
      allPorts: ports.map((port) => ({
        path: port.path,
        manufacturer: port.manufacturer || 'Unknown',
        vendorId: port.vendorId,
        productId: port.productId,
      })),
    });
  } catch (error) {
    console.error('List ports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list serial ports',
      error: error.message,
    });
  }
});
