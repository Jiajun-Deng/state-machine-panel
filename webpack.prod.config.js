const baseWebpackConfig = require('./webpack.base.config');
const path = require('path')
var conf = baseWebpackConfig;
conf.mode = 'production';

function resolve(dir) {
  return path.join(__dirname, dir)
}

module.exports = baseWebpackConfig;