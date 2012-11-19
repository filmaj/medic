var http                   = require('http'),
    url                    = require('url'),
    path                   = require('path'),
    request                = require('request'),
    config                 = require('./config'),
    templates              = require('./src/dashboard/templates'),
    init_from_couch        = require('./src/dashboard/templates/init_from_couch');

// query couchdb and build up templates, set up listeners on couch changes
init_from_couch(config);

http.createServer(function (req, res) {
    var route = url.parse(req.url).pathname.substr(1);
    var method = req.method.toLowerCase();
    switch (method) {
        case 'get':
            switch (route) {
                case '':
                    // Home
                    res.writeHead(200);
                    res.write(templates.html(), 'utf-8');
                    res.end();
                    break;
            }
    };
}).listen(config.dashboard.port);

console.log('[HTTP] Server listening on port ' + config.dashboard.port);
