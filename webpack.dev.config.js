const baseWebpackConfig = require('./webpack.base.config');

let conf = baseWebpackConfig;
conf.watch = false;
conf.devtool = "source-map";
conf.mode = 'development';

module.exports = conf;