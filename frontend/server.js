var path = require('path');
var express = require('express');
var webpack = require('webpack');
var request = require('request');
var config = require('./webpack.dev.config');
var http = require('http');
var httpProxy = require('http-proxy');

var app = express();
var proxy = httpProxy.createProxyServer({ ws: true, target: 'ws://localhost:8080' }).listen(8082);
var compiler = webpack(config);

app.use(require('webpack-dev-middleware')(compiler, {
    hot: true,
    historyApiFallback: true,
    noInfo: true,
    publicPath: config.output.publicPath
}));

app.use(require('webpack-hot-middleware')(compiler));

app.use('/api', (req, res) => {
    req.pipe(request('http://localhost:8080/api' + req.url)
        .on('error', (e) => { console.warn(e.message) }))
        .pipe(res);
});
app.use('*', (req, res) => {
    req.pipe(request('http://localhost:8081/index.html')).pipe(res);
});

// http://stackoverflow.com/questions/21629752/using-node-http-proxy-to-proxy-websocket-connections
var server = http.createServer(app);
server.on('upgrade', function (req, socket, head) {
    proxy.ws(req, socket, head);
});
server.listen(8081, 'localhost', (err) => {
    if (err) {
        console.log(err);
        return;
    }

    console.log('Listening at http://localhost:8081');
});