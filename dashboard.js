var http                   = require('http'),
    url                    = require('url'),
    path                   = require('path'),
    git_hooks              = require('apache-git-commit-hooks'),
    request                = require('request'),
    config                 = require('./config'),
    templates              = require('./src/dashboard/templates'),
    init_from_couch        = require('./src/dashboard/templates/process_results');

// get latest commits (and set up interval for pinging for that)
git_hooks({period:1000 * 60 * 15}, function(libraries) {
    if (libraries) {
        console.log('[GIT] New commits!');
        // POST to build server
        request.post({
            url:config.build.host + '/commit',
            body:JSON.stringify(libraries)
        }, function(err, response, body) {
            if (err) console.error('[REQUEST ERROR] !!!', err);
            if (response.statusCode == 200) {
            } else {
                console.error('[REQUEST ERROR] Received HTTP ' + response.statusCode + ' from build server; commit notification probably failed.');
            }
        });
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
}).listen(config.dashboard.port);

console.log('[HTTP] Server listening on port ' + config.dashboard.port);
