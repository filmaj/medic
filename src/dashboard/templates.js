var render = require('./templates/render'),
    couch  = require('../couchdb/interface'),
    n      = require('ncallbacks');

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

function query_for_results(platform, shas, callback) {
    shas.forEach(function(sha) {
        var view = platform + '?key="' + sha + '"';
        couch.mobilespec_results.query_view('results', view, function(error, result) {
            if (error) {
                console.error('query failed for mobile spec results', error); throw 'Query failed';
            }
            if (result.rows.length) {
                result.rows.forEach(function(row) {
                    module.exports.add_mobile_spec_result(platform, sha, row);
                });
            }
            callback();
        });
    });
}
function query_for_errors(platform, shas, callback) {
    shas.forEach(function(sha) {
        var view = platform + '?key="' + sha + '"';
        // get build errors from couch for each repo
        couch.build_errors.query_view('errors', view, function(error, result) {
            if (error) {
                console.error('query failed for build errors', error); throw 'Query failed';
            }
            if (result.rows.length) {
                result.rows.forEach(function(row) {
                    module.exports.add_build_failure(platform, sha, row);
                });
            }
            callback();
        });
    });
}

module.exports = {
    boot:function(callback) {
        // get commits from couch for each repo
        var counter = 20 * 3 * 2; 
        var end = n(counter, function() {
            should_render = true;
            html = render(shas, results, build_errors);
            callback();
        });
        for (var repo in libraries.paths) if (libraries.paths.hasOwnProperty(repo)) (function(lib) {
            if (lib.indexOf('mobile-spec') > -1) return;
            var platform = lib.substr('cordova-'.length);
            couch.cordova_commits.get(lib, function(err, doc) {
                if (err) {
                    console.error('WTF CANT TALK TO COUCH?!');
                    throw new Error(err);
                } else {
                    // save the commit SHAs
                    shas[lib] = doc.shas;

                    // query each sha for data
                    query_for_results(platform, doc.shas, end);
                    query_for_errors(platform, doc.shas, end);
                }
            });
        })(repo);

        // subscribe to couch changes for commits
        couch.cordova_commits.follow(function(err, change) {
            if (err) console.error('COMMIT FOLLOW ERR OMFGWTFBBQ', err);
            else {
                // commits have changed for a certain library; update commits
                var lib = change._id;
                var platform = lib.substr('cordova-'.length);
                shas[lib] = change.shas;
                // we should re-query for results and errors for this set of SHAs
                var got_updates = n(40, function() {
                    // once we got all errors + possible results re-render it all
                    html = render(shas, results, build_errors);
                });
                query_for_results(platform, change.shas, got_updates);
                query_for_errors(platform, change.shas, got_updates);
            }
        });

        // subscribe to couch changes for mobile spec results
        couch.mobilespec_results.follow(function(err, change) {
            if (err) console.error('mobspecresult FOLLOW ERR OMFGWTFBBQ', err);
            else if (change.deleted) return;
            else {
                console.log('[COUCH] New mobile-spec result for ' + change.doc.platform + ' ' + change.doc.version + ', ' + change.doc.model);
                var doc = {
                    value:{
                        total:change.doc.mobilespec.total,
                        passed:(change.doc.mobilespec.total - change.doc.mobilespec.failed),
                        fails:change.doc.mobilespec.failures,
                        model:change.doc.model,
                        version:change.doc.version
                    }
                };
                module.exports.add_mobile_spec_result(change.doc.platform, change.doc.sha, doc);
            }
        });

        // subscribe to couch changes for build errors
        couch.build_errors.follow(function(err, change) {
            if (err) console.error('builderros FOLLOW ERR OMFGWTFBBQ', err);
            else {
                console.log('[COUCH] New build error.');
                module.exports.add_build_failure(change.doc.platform, change.doc.sha, change.doc);
            }
        });
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
        if (should_render) html = render(shas, results, build_errors);
    },
    add_build_failure:function(platform, sha, doc) {
        if (!build_errors[platform]) build_errors[platform] = {};
        if (!build_errors[platform][sha]) build_errors[platform][sha] = [];
        build_errors[platform][sha].push(doc);
        if (should_render) html = render(shas, results, build_errors);
    }
};
