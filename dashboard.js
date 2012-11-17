var http                   = require('http'),
    url                    = require('url'),
    path                   = require('path'),
    config                 = require('./config'),
    templates              = require('./src/templates'),

// map of platform names for sanity sake
var platformMap = {
    'ipod touch':'ios',
    'ipad':'ios',
    'iphone':'ios',
    'playbook':'blackberry'
};

http.createServer(function (req, res) {
    var route = url.parse(req.url).pathname.substr(1);
    var method = req.method.toLowerCase();
    switch (method) {
        case 'post':
            switch (route) {
                case 'results':
                    // TODO: move this to the couchdb map function

                    /*
                    var body = '';
                    req.on('data', function(chunk) { body += chunk; });
                    req.on('end', function() {
                        res.writeHead(200);
                        res.end();

                        // Get device info from the post
                        var doc = new et.ElementTree(et.XML(body));
                        var deviceEl = doc.find('device');
                        var platform = deviceEl.attrib.platform.toLowerCase();
                        if (platformMap.hasOwnProperty(platform)) platform = platformMap[platform];
                        var version = deviceEl.attrib.version;
                        var uuid = deviceEl.attrib.uuid;
                        var name = deviceEl.text;
                        console.log('[RESULT] mobile-spec for ' + name + ' (' + platform + ' ' + version + ')');

                        // xml output location
                        var lib_sha = doc.find('library').text;
                        var xmlDir = path.join(posts, platform, lib_sha, version);
                        var xmlOutput = path.join(xmlDir, name + '_' + uuid + '.xml');

                        // if we already have a result for a similar device for same lib commit, don't write it out
                        if (!fs.existsSync(xmlOutput)) {
                            shell.mkdir('-p', xmlDir);
                            fs.writeFileSync(xmlOutput, body, 'utf-8');
                            // update a specific part of the templates
                            templates.add_mobile_spec_result(platform, lib_sha, version, name, body);
                        }
                    });
                        */
                    break;
            };
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

// TODO: query couchdb and build up templates
require('./src/templates/process_results')(config);

console.log('[HTTP] Server listening on port ' + config.port);
