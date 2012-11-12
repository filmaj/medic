var fs       = require('fs'),
    shell    = require('shelljs'),
    readdirp = require('readdirp'),
    et       = require('elementtree'),
    path     = require('path');

// show this number of the most recent commits in lib's histories
var num_commits_to_show = 20;

// location of platform libraries
var libDir = path.join(__dirname, '..', 'lib');
var libraries = fs.readdirSync(libDir);

// where we store mobile-spec results
var posts = path.join(__dirname, '..', 'posts');

// html template for the dashboard
var html = '<html><head></head><body><h1>ghetto cordova dashboard</h1>';
html    += '<h2>cordova-android</h2>';
html    += '{android}';
html    += '<h2>cordova-ios</h2>';
html    += '{ios}';
html    += '</body></html>';

var libShas = {};
var libResults = {};

function update_commit_list(lib) {
    if (lib == 'incubator-cordova-mobile-spec') return;
    var libPath = path.join(libDir, lib);
    var commitList = shell.exec('cd ' + libPath + ' && git rev-list --all --pretty=oneline --max-count=' + num_commits_to_show, {silent:true});
    if (commitList.code > 0) throw ('Failed to get commit list for ' + lib + ' library.');
    var commitArr = commitList.output.split('\n');
    commitArr = commitArr.slice(0, commitArr.length - 1);
    var shaRegExp = /^([a-z0-9]+)\s+/;
    var shaList = commitArr.map(function(c) {
        var res = shaRegExp.exec(c);
        if (res) return res[1];
    });
    libShas[lib] = shaList;
}

// get latest repository commit lists
libraries.forEach(update_commit_list);

// initialize from written xml
// Identify which commits have test results
fs.readdir(posts, function(err, platforms) {
    if (err) throw ('Could not read posts directory (' + posts + ')');
    platforms.forEach(function(platform) {
        var libName = 'incubator-cordova-' + platform.toLowerCase();
        var resDir = path.join(posts, platform);
        fs.readdir(resDir, function(err, resultsBySha) {
            if (err) throw ('Could not read results lib directory (' + resDir + ')');
            resultsBySha.forEach(function(sha) {
                var testDir = path.join(resDir, sha);

                // recursively read test dirs and grab xml
                // xml are mobile-spec results
                var xmlStream = readdirp({
                    root:testDir,
                    fileFilter:'*.xml'
                }).on('data', function(entry) {
                    var version = entry.path.substr(0, entry.path.indexOf('/'));
                    var model = entry.name.substr(0, entry.name.indexOf('_'));
                    fs.readFile(entry.fullPath, 'utf-8', function(e, data) {
                        if (e) throw ('Could not read result file ' + entry.fullPath);
                        update_specific_template(platform, sha, version, model, data);
                    });
                });

                // recursively grab .json files
                // these are build/compile/other errors
                // TODO
                var jsonStream = readdirp({
                    root:testDir,
                    fileFilter:'*.json'
                }).on('data', function(entry) {
                    fs.readFile(entry.fullPath, 'utf-8', function(err, data) {
                        if (err) throw ('Could not read error file ' + entry.fullPath);
                        var json = JSON.parse(data);
                        update_template_with_error(platform, sha, json.failure, json.details);
                    });
                });
            });
        });
    });
});

// Create page templates
module.exports = function generate_templates(platform, sha, version, model, xml) {
    if (arguments.length === 0) {
        // drop results into the html template and return html
        // TODO: the final html should be ready at any time
        // TODO: only regenerate if a new result comes in
        var table = create_results_table(html, libShas, libResults);
        return interpolate_template(html, table);
    } else if (arguments.length == 4) {
        update_template_with_error(platform, sha, version, model);
    } else if (arguments.length == 5) {
        // update a specific part of the template
        update_specific_template(platform, sha, version, model, xml);
    }
};

function update_template_with_error(platform, sha, failure, details) {
    if (!libResults[platform]) libResults[platform] = {};
    libResults[platform][sha] = {
        failure:failure,
        details:details
    };
};

function update_specific_template(platform, sha, version, model, xmlData) {
    var xml = new et.ElementTree(et.XML(xmlData));
    var tests = 0, num_fails = 0, time = 0, failText = [];
    xml.getroot().findall('testsuites').forEach(function(set) {
        set.getchildren().forEach(function(suite) {
            tests += parseInt(suite.attrib.tests, 10);
            var failures = parseInt(suite.attrib.failures, 10);
            num_fails += failures;
            time += parseFloat(suite.attrib.time);
            if (failures > 0) {
                suite.getchildren().forEach(function(testcase) {
                    var failTitle = testcase.attrib.classname + ' ' + testcase.attrib.name;
                    testcase.findall('failure').forEach(function(failure) {
                        failText.push(failTitle + ' :: Assertion failure: ' + failure.text);
                    });
                });
            }
        });
    });

    // Make sure libResults have proper parent objects
    if (!libResults[platform]) libResults[platform] = {};
    if (!libResults[platform][sha]) {
        libResults[platform][sha] = {};
        // if we don't have the sha it might be a new commit. we may have to update full sha list.
        update_commit_list('incubator-cordova-' + platform);
    }
    if (!libResults[platform][sha][version]) libResults[platform][sha][version] = {};
    if (!libResults[platform][sha][version][model]) libResults[platform][sha][version][model] = {};

    libResults[platform][sha][version][model] = {
        tests:tests,
        num_fails:num_fails,
        time:time,
        fails:failText
    };
    console.log('Template generated.');
};

function create_results_table(tmpl, sha_list, results) {
    var data = {
        'android':null,
        'ios':null
    };
    for (var lib in sha_list) if (sha_list.hasOwnProperty(lib)) {
        var platform = lib.substr(18);
        var platform_table = '<table><tr><td>commit</td><td>test results</td></tr>';
        var recent_shas = sha_list[lib];
        recent_shas.forEach(function(sha) {
            platform_table += '<tr><td><a href="http://git-wip-us.apache.org/repos/asf?p=' + lib + '.git;a=commit;h='+sha+'">' + sha.substring(0,7)  + '</a></td><td>';
            if (libResults[platform] && libResults[platform][sha]) {
                if (libResults[platform][sha].failure) {
                    platform_table += '<a href="#" style="color:red" onclick="alert(\'' + libResults[platform][sha].details.replace(/'/g, '\\').replace(/\n/g,'\\n') + '\');return false;">' + libResults[platform][sha].failure + '</a>';
                } else {
                    var versions = libResults[platform][sha];
                    var results_table = '<p>mobile-spec results</p><table></tr><tr><td>version</td><td>model/name</td><td>results</td></tr>';
                    for (var version in versions) if (versions.hasOwnProperty(version)) {
                        var models = versions[version];
                        for (var model in models) if (models.hasOwnProperty(model)) {
                            var results = models[model];
                            var pass = (results.tests - results.num_fails);
                            var percent = ((pass / results.tests)*100).toFixed(2);
                            results_table += '<tr><td>' + version + '</td><td>' + model + '</td><td>pass: ' + pass + ', fail: <a href="#" onclick="alert(\'' + results.fails.join('\\n').replace(/'/g,"\\'") + '\');return false;">' + results.num_fails + '</a>, %: ' + percent + '</td></tr>';
                        }
                    }
                    results_table += '</table>';
                    platform_table += results_table;
                }
            }
            platform_table += '</td></tr>';
        });
        platform_table += '<table>';
        data[platform] = platform_table;
    }
    return data;
}

function interpolate_template(tmpl, object) {
    for (var token in object) if (object.hasOwnProperty(token)) {
        tmpl = tmpl.replace(new RegExp("{" + token + "}", "g"), object[token]);
    }
    return tmpl;
}
