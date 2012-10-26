var http   = require('http'),
    url    = require('url'),
    path   = require('path'),
    config = require('./config'),
    shell  = require('shelljs'),
    create_mobile_spec_app = require('./src/create_mobile_spec_app'),
    android_build= require('./src/makers/android'),
    updater= require('./src/updater');

// are we running a build?
var building = false;
// where we store modified versions of mobile-spec
var mobile_spec_build_path = path.join(__dirname, 'temp', 'mobspecapp');
// where we store generated android app
var android_path = path.join(__dirname, 'temp', 'android');

http.createServer(function (req, res) {
    var route = url.parse(req.url).pathname.substr(1);
    if (req.method.toLowerCase() == 'post') {
        if (building) {
            var body = '';
            req.on('data', function(chunk) { body += chunk; });
            req.on('end', function() {
                res.writeHead(200);
                res.end();
                console.log('Got a POST (size: ' + body.length + ') in it, snippet to follow.');
                console.log('*************************');
                console.log(body);
                console.log('*************************');
                // TODO: parse content and report results in a nice way that is useful to us lazy fkers
            });
        }
    } else if (req.method.toLowerCase() == 'get') {
        if (route == 'go') {
            console.log('Triggering a build.');
            // Update our libraries
            updater();
            // Put together mobile-spec app
            create_mobile_spec_app(mobile_spec_build_path);
            // TODO: trigger builds
            android_build(android_path);
            building = true;
        }
        res.writeHead(200);
        res.end();
    }
}).listen(config.port);
