var http                   = require('http'),
    url                    = require('url'),
    path                   = require('path'),
    config                 = require('./config'),
    shell                  = require('shelljs'),
    fs                     = require('fs'),
    et                     = require('elementtree'),
    generate_templates     = require('./src/generate_templates'),
    builder                = require('./src/builder'),
    updater                = require('./src/updater');

// where we keep test results
var posts = path.join(__dirname, 'posts');

// map of plastform names for sanity sake
var platformMap = {
    'ipod touch':'iOS',
    'ipad':'iOS',
    'iphone':'iOS'
};

generate_templates();

http.createServer(function (req, res) {
    var route = url.parse(req.url).pathname.substr(1);
    var method = req.method.toLowerCase();
    switch (method) {
        case 'post':
            switch (route) {
                case 'commit':
                    // TODO: factor this out into own module
                    var commitBody = '';
                    req.on('data', function(chunk) { commitBody += chunk; });
                    req.on('end', function() {
                        res.writeHead(200);
                        res.end();
                        console.log('Received a commit notification!');
                        var commits = JSON.parse(commitBody);
                        console.log(commits);

                        // Update relevant libraries
                        updater(commits);

                        // trigger builds only for relevant libraries
                        builder(commits);
                    });
                    return;
                default:
                    // TODO: factor this out into own module
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
                    return;
            };
        case 'get':
            // Home
            var updated = generate_templates();
            res.writeHead(200);
            res.write(updated.html, 'utf-8');
            res.end();
            return;
    };
    res.writeHead(200);
    res.end();
}).listen(config.port);
console.log('Listening on port ' + config.port);
