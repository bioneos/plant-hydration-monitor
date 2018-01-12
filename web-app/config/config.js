var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'foos-tracker'
    },
    port: 3000
  },

  test: {
    root: rootPath,
    app: {
      name: 'foos-tracker'
    },
    port: 3030
  },

  production: {
    root: rootPath,
    app: {
      name: 'foos-tracker'
    },
    port: 3030
  }
};

module.exports = config[env];
