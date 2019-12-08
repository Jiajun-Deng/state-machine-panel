const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const PackageInfo = require('./package.json');
const ZipPlugin = require('zip-webpack-plugin');

module.exports = {
  node: {
    fs: 'empty',
  },
  context: __dirname + "/src",
  entry: './module.js',
  output: {
    filename: "module.js",
    path: path.resolve(__dirname, './build/grafana/data/plugins/aftmi-grafanaplugin-statemachinepanel'),
    libraryTarget: "amd"
  },
  externals: [
    'lodash',
    'moment',
    'jquery',
    function (context, request, callback) {
      var prefix = 'grafana/';
      if (request.indexOf(prefix) === 0) {
        return callback(null, request.substr(prefix.length));
      }
      callback();
    },
  ],
  plugins: [
    new CleanWebpackPlugin({ dry: true, verbose: true, cleanStaleWebpackAssets: false }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new CopyWebpackPlugin([
      { from: 'plugin.json' },
      { from: 'partials/*' },
      { from: '../README.md' },
      { from: 'img/*' }
    ]),
    new ZipPlugin({
      path: path.resolve(__dirname, 'build'),
      filename: PackageInfo.name + '-' + PackageInfo.version,
      pathPrefix: PackageInfo.name + '-' + PackageInfo.version
    })
  ],
  resolve: {
    extensions: ['.wasm', '.mjs', '.js', '.json'],
    modules: [
      'node_modules'
    ]
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loaders: [
          {
            loader: "babel-loader",
            options: {
              presets: [
                require.resolve('@babel/preset-env')
              ]
            }
          }
        ],
        exclude: /node_modules/,
        include: path.resolve(__dirname, 'src')
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              sourceMap: true,
            },
          }
        ],
      },
    ]
  }
}
