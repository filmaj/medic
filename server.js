var http   = require('http'),
    url    = require('url'),
    path   = require('path'),
    config = require('./config'),
    shell  = require('shelljs'),
    create_mobile_spec_app = require('./src/create_mobile_spec_app'),
    updater= require('./src/updater');

// are we running a build?
var building = false;
// where we store modified versions of mobile-spec
var mobile_spec_build_path = path.join(__dirname, 'temp', 'mobspecapp');
shell.mkdir('-p', mobile_spec_build_path);

http.createServer(function (req, res) {
    var route = url.parse(req.url).pathname.substr(1);
    if (req.method.toLowerCase() == 'post') {
        if (building) {
            var body = '';
            req.on('data', function(chunk) { body += chunk; });
            req.on('end', function() {
                // TODO: do something with body
                res.writeHead(200);
                res.end();
                console.log('Got a POST with some content in it.');
            });
        }
    } else if (req.method.toLowerCase() == 'get') {
        if (route == 'go') {
            console.log('Triggering a build.');
            // Update our libraries
            updater();
            // Put together mobile-spec app
            create_mobile_spec_app(mobile_spec_build_path);
            // TODO: trigger a build
            building = true;
        }
        res.writeHead(200);
        res.end();
    }
}).listen(config.port);
