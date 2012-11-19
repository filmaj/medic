var renderer = require('./templates/render'),
    couch = require('../couchdb/interface');

// hash of libraries -> paths
var libraries = require('../../libraries');
// hash of libraries -> [shas] 
var shas = {};
// hash of platforms -> shas -> platform versions -> device models -> # of tests, # of failures, test runtimes, and failed assertions
var results = {};
// cached string of html
var html = renderer(shas, results);

for (var repo in libraries) if (libraries.hasOwnProperty(repo)) (function(lib) {
    // get commits from couch
    couch.cordova_commits.get(lib, function(err, doc) {
        shas[lib] = doc.shas;
        shas[lib].forEach(function(sha) {
            // TODO: couch: for each commit, get results
            // TODO: update templates
        });
    });
    // TODO: subscribe to couch changes for commits
    // TODO: subscribe to couch changes for mobile spec results
    // TODO: subscribe to couch changes for build errors
})(repo);

// TODO: currently, errors clobber over mobile spec results.
// INSTEAD, system should be aware of timestamps and use that in the template appropriately
// TODO: NEED UX HELP!
module.exports = {
    html:function() { return html; },
    add_mobile_spec_result:function(platform, sha, version, model, spec) {
        // TODO: parse spec into:
        var tests = 0, num_fails = 0, time = 0, failText = [];

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
    }
};
