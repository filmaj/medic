var renderer = require('./templates/render'),
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

// TODO: currently, errors clobber over mobile spec results.
// This isn't terrible but instead this information should be parallel (I think)
// INSTEAD, system should be aware of timestamps and use that in the template appropriately
// TODO: NEED UX HELP!
module.exports = {
    boot:function(callback) {
        // get commits from couch for each repo
        var counter = 60; 
        // TODO: get build errors from couch for each repo
        for (var repo in libraries.paths) if (libraries.paths.hasOwnProperty(repo)) (function(lib) {
            if (lib.indexOf('mobile-spec') > -1) return;
            var platform = lib.substr('incubator-cordova-'.length);
            if (platform.indexOf('webworks') > -1) platform = platform.split('-')[0];
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
                            if (result.rows.length) result.rows.forEach(function(row) {
                                module.exports.add_mobile_spec_result(platform, sha, row);
                            });
                            counter--;
                            if (counter === 0) {
                                should_render = true;
                                html = renderer(shas, results);
                                callback();
                            }
                        });
                    });
                }
            });
            // TODO: subscribe to couch changes for commits
        })(repo);
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
        // TODO: shouldnt re-make all html templates, only relevant ones
        if (should_render) html = renderer(shas, results);
    },
    add_build_failure:function(platform, sha, failure, details) {
        if (!build_errors[platform]) build_errors[platform] = {};
        if (arguments.length == 4) {
            build_errors[platform][sha] = {
                failure:failure,
                details:details
            };
        } else if (arguments.length == 5) {
            var version = failure;
            failure = details;
            details = arguments[4];
            if (!build_errors[platform][sha]) build_errors[platform][sha] = {};
            build_errors[platform][sha][version] = {
                failure:failure,
                details:details
            };
        } else if (arguments.length == 6) {
            var version = failure;
            var model = details;
            failure = arguments[4];
            details = arguments[5];
            if (!build_errors[platform][sha]) build_errors[platform][sha] = {};
            if (!build_errors[platform][sha][version]) build_errors[platform][sha][version] = {};
            build_errors[platform][sha][version][model] = {
                failure:failure,
                details:details
            };
        }
        // TODO: how to render ?
    }
};
