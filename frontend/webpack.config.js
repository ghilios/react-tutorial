var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var merge = require('webpack-merge');

module.exports = {
    entry: {
        app: './src/index.jsx'
    },
    output: {
        path: path.join(__dirname, 'built'),
        filename: '[name].bundle.js'
    },
    plugins: [
        new webpack.optimize.OccurenceOrderPlugin(),
        new HtmlWebpackPlugin({
            title: 'Boot React',
            template: path.join(__dirname, 'assets/index-template.html')
        }),
        new webpack.DefinePlugin({
            "process.env": {
                NODE_ENV: JSON.stringify('production')
            }
        }),
        new webpack.optimize.UglifyJsPlugin({
            compressor: {
                warnings: false
            }
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