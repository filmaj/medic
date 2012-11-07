var http                   = require('http'),
    url                    = require('url'),
    path                   = require('path'),
    config                 = require('./config'),
    shell                  = require('shelljs'),
    fs                     = require('fs'),
    util                   = require('util'),
    et                     = require('elementtree'),
    create_mobile_spec_app = require('./src/create_mobile_spec_app'),
    android_build          = require('./src/makers/android'),
    ios_build              = require('./src/makers/ios'),
    generate_templates     = require('./src/generate_templates'),
    updater                = require('./src/updater');

var libDir = path.join(__dirname, 'lib');
var libs = fs.readdirSync(libDir);
// where we store modified versions of mobile-spec
var mobile_spec_build_path = path.join(__dirname, 'temp', 'mobspecapp');
// where we store generated apps
var android_path = path.join(__dirname, 'temp', 'android');
var ios_path = path.join(__dirname, 'temp', 'ios');
// where we keep test results
var posts = path.join(__dirname, 'posts');

// map of plastform names for sanity sake
var platformMap = {
    'ipod touch':'iOS',
    'ipad':'iOS',
    'iphone':'iOS'
};

generate_templates();

// TODO: there needs to be a clearer mapping of routes
http.createServer(function (req, res) {
    var route = url.parse(req.url).pathname.substr(1);
    if (req.method.toLowerCase() == 'post') {
        var body = '';
        req.on('data', function(chunk) { body += chunk; });
        req.on('end', function() {
            res.writeHead(200);
            res.end();
            // Get device + library info from the post
            var doc = new et.ElementTree(et.XML(body));
            var deviceEl = doc.find('device');
            var platform = deviceEl.attrib.platform;
            if (platformMap.hasOwnProperty(platform.toLowerCase())) platform = platformMap[platform.toLowerCase()];
            var version = deviceEl.attrib.version;
            var uuid = deviceEl.attrib.uuid;
            var name = deviceEl.text;
            var lib_sha = doc.find('library').text;
            var xmlDir = path.join(posts, platform, lib_sha, version);
            // TODO: if we already have a result for a similar device for same lib commit, don't write it out
            // TODO: if we don't, need to update a specific part of the templates
            shell.mkdir('-p', xmlDir);
            var xmlOutput = path.join(xmlDir, name + '_' + uuid + '.xml');
            console.log('RESULT: ' + platform + ' ' + version + ' (' + name + ')');
            fs.writeFileSync(xmlOutput, body, 'utf-8');
        });
    } else if (req.method.toLowerCase() == 'get') {
        if (route == 'go') {
            res.writeHead(200);
            res.end();
            console.log('Triggering a build.');
            // Update our libraries
            // TODO: should only rebuild + redeploy changed libraries
            updater();
            // Put together mobile-spec app
            // TODO: should only do this if mobile-spec changes
            create_mobile_spec_app(mobile_spec_build_path);
            // trigger builds
            // TODO: other platforms
            android_build(android_path);
            ios_build(ios_path);
            return;
        } else if (route == '') {
            // Home
            var updated = generate_templates();
            res.writeHead(200);
            res.write(updated.html, 'utf-8');
            res.end();
            return;
        }
    }
    res.writeHead(200);
    res.end();
}).listen(config.port);
console.log('Listening on port ' + config.port);
