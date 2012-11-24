var render = require('./templates/render'),
    couch = require('../couchdb/interface');

// hash of libraries -> paths
var libraries = require('../../libraries');
// hash of libraries -> [shas] 
var shas = {};
// hash of platforms -> shas -> platform versions -> device models -> # of tests, # of failures, test runtimes, and failed assertions
var results = {};
var build_errors = {};
// cached string of html
var html;
var should_render = false;

module.exports = {
    boot:function(callback) {
        // get commits from couch for each repo
        var counter = 20 * 3 * 1; 
        // TODO: get build errors from couch for each repo
        for (var repo in libraries.paths) if (libraries.paths.hasOwnProperty(repo)) (function(lib) {
            if (lib.indexOf('mobile-spec') > -1) return;
            var platform = lib.substr('cordova-'.length);
            couch.cordova_commits.get(lib, function(err, doc) {
                if (err) {
                    console.error('WTF CANT TALK TO COUCH?!');
                    throw new Error(err);
                } else {
                    // couch returns twenty most recent commit shas for each repo
                    // for each of these, query couch for results
                    shas[lib] = doc.shas;
                    shas[lib].forEach(function(sha) {
                        couch.mobilespec_results.query_view('results', platform + '?key="' + sha + '"', function(error, result) {
                            if (error) {
                                console.error('query failed dude', error); throw 'Query failed';
                            }
                            if (result.rows.length) {
                                result.rows.forEach(function(row) {
                                    module.exports.add_mobile_spec_result(platform, sha, row);
                                });
                            }
                            if (--counter === 0) {
                                should_render = true;
                                html = render(shas, results, build_errors);
                                callback();
                            }
                        });
                    });
                }
            });
        })(repo);
        // TODO: subscribe to couch changes for commits
        // TODO: subscribe to couch changes for mobile spec results
        // TODO: subscribe to couch changes for build errors
    },
    html:function() { return html; },
    add_mobile_spec_result:function(platform, sha, doc) {
        var tests = doc.value.total, num_fails = (doc.value.total - doc.value.passed), failText = doc.value.fails;

        platform = platform.toLowerCase();
        var model = doc.value.model;
        var version = doc.value.version;

        // Make sure results have proper parent objects
        if (!results[platform]) results[platform] = {};
        if (!results[platform][sha]) results[platform][sha] = {};
        if (!results[platform][sha][version]) results[platform][sha][version] = {};
        if (!results[platform][sha][version][model]) results[platform][sha][version][model] = {};

        results[platform][sha][version][model] = {
            tests:tests,
            num_fails:num_fails,
            fails:failText
        };
        if (should_render) render(shas, results, build_errors);
    },
    add_build_failure:function(platform, sha, doc) {
        if (!build_errors[platform]) build_errors[platform] = {};
        if (!build_errors[platform][sha]) build_errors[platform][sha] = [];
        build_errors[platform][sha].push(doc);
        if (should_render) render(shas, results, build_errors);
    }
};
