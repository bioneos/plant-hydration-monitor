var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'plant-saturation-interface'
    },
    serialport: '/dev/cu.usbmodemFA131'
  },

  test: {
    root: rootPath,
    app: {
      name: 'plant-saturation-interface'
    },
    serialport: '/dev/cu.usbmodemFA131'
  },

  production: {
    root: rootPath,
    app: {
      name: 'plant-saturation-interface'
    },
    serialport: '/dev/cu.usbmodemFA131'
  }
};

module.exports = config[env];
