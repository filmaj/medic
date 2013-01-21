var http                   = require('http'),
    url                    = require('url'),
    fs                     = require('fs'),
    path                   = require('path'),
    mime                   = require('mime'),
    config                 = require('./config'),
    templates              = require('./src/dashboard/templates'),
    api                    = require('./src/dashboard/api'),
    bootstrap              = require('./bootstrap');

var boot_start = new Date().getTime();

// Different way of doing routes :P
function not_found(res, msg) {
    res.writeHead(404, {
        "Content-Type":"application/json"
    });
    var json = {
        error:true,
        message:msg
    };
    res.write(JSON.stringify(json), 'utf-8');
    res.end();
}
function routeApi(resource) {
    return function(req, res) {
        try {
            console.log('[HTTP] API request for ' + resource + '.');
            var queries = url.parse(req.url, true).query;
            var json = api[resource];
            if (queries.platform) {
                json = json[queries.platform];
                if (!json) {
                    not_found(res, 'platform "' + queries.platform + '" not found.');
                    return;
                }
            }
            if (queries.sha) {
                json = json[queries.sha];
                if (!json) {
                    not_found(res, 'sha "' + queries.sha + '" on platform "' + queries.platform + '" not found.');
                    return;
                }
            }
            res.writeHead(200, {
                "Content-Type":"application/json"
            });
            res.write(JSON.stringify(json), 'utf-8');
            res.end();
        } catch(e) {
            res.writeHead(500, {
                "Content-Type":"application/json"
            });
            var json = {
                error:true,
                message:e.message
            };
            res.write(JSON.stringify(json), 'utf-8');
            res.end();
        }
    };
}

var routes = {
    "":function(req, res) {
        // Homepage
        res.writeHead(200);
        var html = templates.html();
        res.write(html ? html : '<h1>not yet</h1>', 'utf-8');
        res.end();
    },
    "api/results":routeApi('results'),
    "api/errors":routeApi('errors'),
    "api/commits/recent":routeApi('commits'),
    "api/commits/tested":routeApi('tested_shas')
};

// cache local static content in memory (in memory? k)
['js', 'img', 'css'].forEach(function(media) {
    var dir = path.join(__dirname, 'src', 'dashboard', 'templates', media);
    fs.readdirSync(dir).forEach(function(m) {
        var file_path = path.join(dir, m);
        var contents = fs.readFileSync(file_path);
        var type = mime.lookup(file_path);
        routes[media + "/" + m] = function(req, res) {
            res.setHeader('Content-Type', type);
            res.writeHead(200);
            res.write(contents);
            res.end();
        }
    });
});

http.createServer(function (req, res) {
    var method = req.method.toLowerCase();

    // Get rid of leading and trailing / if exists
    var route = url.parse(req.url).pathname.substr(1);
    if (route[route.length-1] == '/') route = route.substr(0, route.length-1);

    if (method == 'get' && route in routes) {
        routes[route](req,res);
    } else {
        res.writeHead(404);
        res.write('<h1>not found!</h1>', 'utf-8');
        res.end();
    }
}).listen(config.dashboard.port);

setTimeout(function() {
    console.log('[BOOT] Cloning necessary git repos (bootstrap).');
    bootstrap.go(function() {
        console.log('[BOOT] Retrieving results from couch...');
        api.boot(function() {
            var boot_end = new Date().getTime();
            var diff = (boot_end - boot_start)/1000;
            console.log('[BOOT] Finished in ' + diff + ' seconds. READY TO ROCK!');
        });
    });
}, 3000);
