var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    devtool: 'inline-source-map',
    entry: {
        app: [
            'webpack-hot-middleware/client',
            './src/index.jsx'
        ]
    },
    output: {
        path: path.join(__dirname, 'built'),
        filename: '[name].bundle.js',
        publicPath: 'http://localhost:8081/'
    },
    plugins: [
        new webpack.optimize.OccurenceOrderPlugin(),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoErrorsPlugin(),
        new webpack.DefinePlugin({
            "process.env": {
                NODE_ENV: JSON.stringify('development')
            }
        }),
        new HtmlWebpackPlugin({
            title: 'Boot React',
            template: path.join(__dirname, 'assets/index-template.html')
        })
    ],
    resolve: {
        extensions: ['', '.js', '.jsx'],
        root: path.join(__dirname, 'src'),
        alias: {
            'stompjs': path.join(__dirname, 'node_modules/stompjs/lib/stomp.js'),
            'when': path.join(__dirname, 'node_modules/rest/node_modules/when/when.js')
        }
    },
    module: {
        loaders: [
            {
                test: /\.css$/,
                loaders: ['style', 'css'],
                include: path.join(__dirname, 'src')
            },
            {
                test: /\.jsx?$/,
                loaders: ['babel'],
                include: path.join(__dirname, 'src')
            },
            {
                test: /\.json$/,
                loaders: ['json'],
                include: path.join(__dirname, 'src')
            }
        ]
    }
};