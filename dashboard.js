var http                   = require('http'),
    url                    = require('url'),
    path                   = require('path'),
    git_hooks              = require('apache-git-commit-hooks'),
    config                 = require('./config'),
    templates              = require('./src/dashboard/templates'),
    init_from_couch        = require('./src/dashboard/templates/process_results');

// get latest commits
var firstrun = true;
git_hooks({period:1000 * 60 * 15}, function(libraries) {
    if (firstrun) {
        firstrun = false;
    }
});
// query couchdb and build up templates
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
}).listen(config.port);

console.log('[HTTP] Server listening on port ' + config.port);
