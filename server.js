var http   = require('http'),
    url    = require('url'),
    path   = require('path'),
    config = require('./config'),
    shell  = require('shelljs'),
    fs     = require('fs'),
    et     = require('elementtree'),
    create_mobile_spec_app = require('./src/create_mobile_spec_app'),
    android_build= require('./src/makers/android'),
    ios_build= require('./src/makers/ios'),
    updater= require('./src/updater');

// are we running a build?
var building = false;
// where we store modified versions of mobile-spec
var mobile_spec_build_path = path.join(__dirname, 'temp', 'mobspecapp');
// where we store generated apps
var android_path = path.join(__dirname, 'temp', 'android');
var ios_path = path.join(__dirname, 'temp', 'ios');
// where we keep test results
var posts = path.join(__dirname, 'posts');

http.createServer(function (req, res) {
    var route = url.parse(req.url).pathname.substr(1);
    if (req.method.toLowerCase() == 'post') {
        if (building) {
            var body = '';
            req.on('data', function(chunk) { body += chunk; });
            req.on('end', function() {
                res.writeHead(200);
                res.end();
                // Get device + library info from the post
                var doc = new et.ElementTree(et.XML(body));
                var deviceEl = doc.find('device');
                var platform = deviceEl.attrib.platform;
                var version = deviceEl.attrib.version;
                var uuid = deviceEl.attrib.uuid;
                var name = deviceEl.text;
                var lib_sha = doc.find('library').text;
                var resultsDir = path.join(posts, platform, lib_sha, version);
                shell.mkdir('-p', resultsDir);
                var xmlOutput = path.join(resultsDir, name + '_' + uuid + '.xml');
                fs.writeFileSync(xmlOutput, body, 'utf-8');
            });
        }
    } else if (req.method.toLowerCase() == 'get') {
        if (route == 'go') {
            res.writeHead(200);
            res.end();
            console.log('Triggering a build.');
            // Update our libraries
            updater();
            // Put together mobile-spec app
            create_mobile_spec_app(mobile_spec_build_path);
            // TODO: trigger builds
            android_build(android_path);
            ios_build(ios_path);
            building = true;
            return;
        }
    }
    res.writeHead(200);
    res.end();
}).listen(config.port);
