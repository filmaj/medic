var http                   = require('http'),
    url                    = require('url'),
    path                   = require('path'),
    config                 = require('./config'),
    shell                  = require('shelljs'),
    fs                     = require('fs'),
    et                     = require('elementtree'),
    templates              = require('./src/templates'),
    builder                = require('./src/builder'),
    updater                = require('./src/updater');

// where we keep test results
var posts = path.join(__dirname, 'posts');

// map of platform names for sanity sake
var platformMap = {
    'ipod touch':'ios',
    'ipad':'ios',
    'iphone':'ios'
};

http.createServer(function (req, res) {
    var route = url.parse(req.url).pathname.substr(1);
    var method = req.method.toLowerCase();
    switch (method) {
        case 'post':
            switch (route) {
                case 'commit':
                    var commitBody = '';
                    req.on('data', function(chunk) { commitBody += chunk; });
                    req.on('end', function() {
                        res.writeHead(200);
                        res.end();
                        console.log('Received a commit notification!');
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
                case 'results':
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

console.log('Listening on port ' + config.port);

// where we store mobile-spec results
var posts = path.join(__dirname, 'posts');

// run through the file system and process results + errors
require('./src/templates/process_results')(posts);
