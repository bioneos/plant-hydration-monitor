const express = require('express'),
    router = express.Router(),
    findDevices = require('local-devices');

module.exports = function (app) {
  app.use('/api', router);
};

router.get('/devices', async (req, res, next) => {
    try {

        const devices = await findDevices();

        console.log(devices);

        if(devices.length == 0) {
            console.error("Zero devices found on network");
            return res
                .status(404)
                .json({error: "Zero devices found on network"});
        }

        const filteredDevices = devices.filter((device) => {
            // Find devices with Espressif Systems OUI
            const deviceMacAddress = device.mac; 
            //return deviceMacAddress.startsWith("18:FE:34"); 
            return device;
        });
        if(filteredDevices.length == 0) {
            console.error("Zero Espressif Systems devices found on network");
            return res
                .status(404)
                .json({error: "Zero Espressif Systems devices found on network"});
        }

        res
            .status(200)
            .json(filteredDevices);

    } catch (err) {
        console.error("Error finding devices on network:", err);
        res
            .status(404)
            .json({error: "Error finding devices on network"});
    }

}); 
