var http   = require('http'),
    url    = require('url'),
    config = require('./config');

// are we running a build?
var building = false;

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
            });
        }
    } else if (req.method.toLowerCase() == 'get') {
        if (route == 'go') {
            // TODO: trigger a build
            building = true;
        }
        res.writeHead(200);
        res.end();
    }
}).listen(config.port);
