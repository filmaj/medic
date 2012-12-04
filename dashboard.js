var http                   = require('http'),
    url                    = require('url'),
    config                 = require('./config'),
    templates              = require('./src/dashboard/templates');

console.log('[COUCH] Retrieving results...');
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
                    var html = templates.html();
                    res.write(html ? html : '<h1>not yet</h1>', 'utf-8');
                    res.end();
                    break;
            }
    };
}).listen(config.dashboard.port);
templates.boot(function() {
    console.log('[HTTP] Server listening on port ' + config.dashboard.port);
});
