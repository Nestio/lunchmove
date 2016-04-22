var path = require('path')
var webpack = require('webpack')
var ExtractTextPlugin = require('extract-text-webpack-plugin');

var sassLoader = 'sass?sourceMap!';
var cssLoader = 'css?sourceMap&url=false!';

var plugins = [
    new ExtractTextPlugin("assets/css/styles.css"),
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/)
];

module.exports = {
  devtool: ['source-map'],
  entry: [
    './app/app.js'
  ],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'app.js'
  },
  plugins: plugins,
  module: {
    loaders: [
      {
        test: /\.js$/,
        loaders: [ 'babel' ],
        exclude: /node_modules/,
        include: __dirname
      },
      {
        test: /\.css?$/,
        loaders: [ 'style', 'raw' ],
        include: __dirname
    },
    {
        test: /\.scss$/,
        loader: ExtractTextPlugin.extract('style', cssLoader+sassLoader+'import-glob?root=.'),
        exclude: /(node_modules)/
    }
    ]
  },
  resolve: {
    root: path.resolve(__dirname),
    extensions: [ '', '.js' ],
    fallback: path.join(__dirname, "node_modules"),
    alias: {
      '': ''
    }
  }
}
