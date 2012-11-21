var http                   = require('http'),
    url                    = require('url'),
    path                   = require('path'),
    request                = require('request'),
    config                 = require('./config'),
    templates              = require('./src/dashboard/templates');

console.log('[COUCH] Retrieving results...');
templates.boot(function() {
    http.createServer(function (req, res) {
        var route = url.parse(req.url).pathname.substr(1);
        var method = req.method.toLowerCase();
        switch (method) {
            case 'get':
                switch (route) {
                    case '':
                        // Home
                        console.log('[' + new Date() + '] GET /');
                        res.writeHead(200);
                        res.write(templates.html(), 'utf-8');
                        res.end();
                        break;
                }
        };
    }).listen(config.dashboard.port);
    console.log('[HTTP] Server listening on port ' + config.dashboard.port);
});
