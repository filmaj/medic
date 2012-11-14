var fs       = require('fs'),
    shell    = require('shelljs'),
    et       = require('elementtree'),
    path     = require('path'),
    commit_list = require('./templates/commit_list'),
    renderer    = require('./templates/render');

// show this number of the most recent commits in lib's histories
var num_commits_to_show = 20;

// location of platform libraries
var libDir = path.join(__dirname, '..', 'lib');
var libraries = fs.readdirSync(libDir);

// hash of libraries -> [shas] 
var shas = {};
// hash of platforms -> shas -> platform versions -> device models -> # of tests, # of failures, test runtimes, and failed assertions
var results = {};

// get latest repository commit lists
libraries.forEach(function(lib) {
    shas[lib] = commit_list(lib, num_commits_to_show);
});

// cached string of html
var html = renderer(shas, results);

module.exports = {
    html:function() { return html; },
    add_mobile_spec_result:function(platform, sha, version, model, xmlData) {
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

        // Make sure results have proper parent objects
        if (!results[platform]) results[platform] = {};
        if (!results[platform][sha]) results[platform][sha] = {};
        if (!results[platform][sha][version]) results[platform][sha][version] = {};
        if (!results[platform][sha][version][model]) results[platform][sha][version][model] = {};

        results[platform][sha][version][model] = {
            tests:tests,
            num_fails:num_fails,
            time:time,
            fails:failText
        };
        html = renderer(shas, results);
    },
    add_build_failure:function(platform, sha, failure, details) {
        if (!results[platform]) results[platform] = {};
        if (arguments.length == 4) {
            results[platform][sha] = {
                failure:failure,
                details:details
            };
        } else if (arguments.length == 5) {
            var version = failure;
            failure = details;
            details = arguments[4];
            if (!results[platform][sha]) results[platform][sha] = {};
            results[platform][sha][version] = {
                failure:failure,
                details:details
            };
        } else if (arguments.length == 6) {
            var version = failure;
            var model = details;
            failure = arguments[4];
            details = arguments[5];
            if (!results[platform][sha]) results[platform][sha] = {};
            if (!results[platform][sha][version]) results[platform][sha][version] = {};
            results[platform][sha][version][model] = {
                failure:failure,
                details:details
            };
        }
        html = renderer(shas, results);
    },
    update_commit_list:function(lib) {
        shas[lib] = commit_list(lib, num_commits_to_show);
    }
};
