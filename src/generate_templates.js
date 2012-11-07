var fs       = require('fs'),
    shell    = require('shelljs'),
    readdirp = require('readdirp'),
    et       = require('elementtree'),
    path     = require('path');

var libDir = path.join(__dirname, '..', 'lib');
var platforms = fs.readdirSync(libDir);
var posts = path.join(__dirname, '..', 'posts');
var html = '<html><head></head><body><h1>hi</h1></body></html>';

// These objects store results
var libShas = {};
var libResults = {};
var returnObject = {
    html:html,
    results:libResults
};

// get repository commit lists
platforms.forEach(function(lib) {
    var libPath = path.join(libDir, lib);
    var commitList = shell.exec('cd ' + libPath + ' && git rev-list --all --pretty=oneline', {silent:true});
    if (commitList.code > 0) throw ('Failed to get commit list for ' + lib + ' library.');
    var commitArr = commitList.output.split('\n');
    commitArr = commitArr.slice(0, commitArr.length - 1);
    var shaRegExp = /^([a-z0-9]+)\s+/;
    var shaList = commitArr.map(function(c) {
        var res = shaRegExp.exec(c);
        if (res) return res[1];
    });
    libShas[lib] = shaList;
});

// Identify which commits have test results
fs.readdir(posts, function(err, platforms) {
    if (err) throw ('Could not read posts directory (' + posts + ')');
    platforms.forEach(function(platform) {
        var libName = 'incubator-cordova-' + platform.toLowerCase();
        var resDir = path.join(posts, platform);
        libResults[platform] = {};
        fs.readdir(resDir, function(err, resultsBySha) {
            if (err) throw ('Could not read results lib directory (' + resDir + ')');
            resultsBySha.forEach(function(sha) {
                libResults[platform][sha] = {};
                var testDir = path.join(resDir, sha);
                // recursively read test dirs and grab xml
                var entryStream = readdirp({
                    root:testDir,
                    fileFilter:'*.xml'
                }).on('data', function(entry) {
                    var version = entry.path.substr(0, entry.path.indexOf('/'));
                    if (!libResults[platform][sha].hasOwnProperty(version)) libResults[platform][sha][version] = {};

                    var model = entry.name.substr(0, entry.name.indexOf('_'));
                    if (!libResults[platform][sha][version].hasOwnProperty(model)) libResults[platform][sha][version][model] = {};
                    var uuid = entry.name.substring(entry.name.indexOf('_') + 1, entry.name.indexOf('.xml'));
                    fs.readFile(entry.fullPath, 'utf-8', function(e, data) {
                        if (e) throw ('Could not read result file ' + entry.fullPath);
                        var xml = new et.ElementTree(et.XML(data));
                        var tests = 0, fails = 0, time = 0;
                        xml.getroot().findall('testsuites').forEach(function(set) {
                            set.getchildren().forEach(function(suite) {
                                tests += parseInt(suite.attrib.tests, 10);
                                fails += parseInt(suite.attrib.failures, 10);
                                time += parseFloat(suite.attrib.time);
                            });
                        });
                        libResults[platform][sha][version][model] = {
                            tests:tests,
                            fails:fails,
                            time:time
                        };
                        console.log(returnObject);
                    });
                });
            });
        });
    });
});


// Create page templates
module.exports = function generate_templates() {
    return returnObject;
};
