var http                   = require('http'),
    url                    = require('url'),
    fs                     = require('fs'),
    path                   = require('path'),
    config                 = require('./config'),
    templates              = require('./src/dashboard/templates'),
    api                    = require('./src/dashboard/api');

// Different way of doing routes :P
function routeApi(resource) {
    return function(req, res) {
        console.log('[HTTP] API request for ' + resource + '.');
        var queries = url.parse(req.url, true).query;
        res.writeHead(200, {
            "Content-Type":"application/json"
        });
        var json = api[resource];
        if (queries.platform) {
            json = json[queries.platform];
        }
        if (queries.sha) {
            json = json[queries.sha];
        }
        res.write(JSON.stringify(json), 'utf-8');
        res.end();
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

// cache local js content
var js_dir = path.join(__dirname, 'src', 'dashboard', 'templates', 'js');
fs.readdirSync(js_dir).forEach(function(js) {
    var contents = fs.readFileSync(path.join(js_dir, js));
    routes["js/" + js] = function(req, res) {
        res.writeHead(200);
        res.write(contents);
        res.end();
    }
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

console.log('[COUCH] Retrieving results...');
api.boot(function() {
    console.log('[HTTP] Server listening on port ' + config.dashboard.port);
});
