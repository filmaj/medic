var http                   = require('http'),
    url                    = require('url'),
    path                   = require('path'),
    shell                  = require('shelljs'),
    config                 = require('./config'),
    builder                = require('./src/build/builder'),
    updater                = require('./src/build/updater');

// Clean out temp directory, where we keep our generated apps
var temp = path.join(__dirname, 'temp');
shell.rm('-rf', temp);
shell.mkdir(temp);

http.createServer(function (req, res) {
    var route = url.parse(req.url).pathname.substr(1);
    var method = req.method.toLowerCase();
    switch (method) {
        case 'post':
            console.log('[HTTP POST] /' + route);
            switch (route) {
                case 'commit':
                    var commitBody = '';
                    req.on('data', function(chunk) { commitBody += chunk; });
                    req.on('end', function() {
                        res.writeHead(200);
                        res.end();
                        var commits = JSON.parse(commitBody);

                        // Update relevant libraries
                        // TODO: what if multiple commits are new?
                        // TODO: build queuing system.
                        // TODO: on init run through and see which of the x recent commits have no results. queue those commits for builds. 
                        // TODO: should also have a queue/check system for devices
                        updater(commits);

                        // trigger builds only for relevant libraries
                        builder(commits);
                    });
                    break;
            }
    }
}).listen(8088);
