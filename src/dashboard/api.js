var libraries     = require('../../libraries'),
    n             = require('ncallbacks'),
    templates     = require('./templates'),
    commits       = require('../build/commit_list'),
    updater       = require('../build/updater'),
    request       = require('request'),
    apache_parser = require('../apache-gitpubsub-parser'),
    couch         = require('../couchdb/interface');

function query_for_results(platform, shas, callback) {
    var commits = shas.slice(0);
    var sha = commits.shift();
    if (sha) {
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
            query_for_results(platform, commits, callback);
        });
    } else {
        if (callback) callback();
    }
}
function query_for_errors(platform, shas, callback) {
    var commits = shas.slice(0);
    var sha = commits.shift();

    if (sha) {
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
            query_for_errors(platform, commits, callback);
        });
    } else {
        if (callback) callback();
    }
}

module.exports = {
    commits:{},
    results:{},
    errors:{},
    tested_shas:{},
    boot:function(callback) {
        // final callback setup
        var counter = (libraries.list.count * 2); 
        var end = n(counter, callback);

        // update all libs, then get list of all sha's we've tested
        // query each sha for data
        updater(libraries.first_tested_commit, function() {
            for (var repo in libraries.first_tested_commit) if (libraries.first_tested_commit.hasOwnProperty(repo)) (function(lib) {
                var platform = lib.substr('cordova-'.length);
                module.exports.tested_shas[lib] = commits.since(lib, libraries.first_tested_commit[lib]);
                module.exports.commits[lib] = {};
                module.exports.commits[lib].shas = module.exports.tested_shas[lib].shas.slice(0,20);
                module.exports.commits[lib].dates = module.exports.tested_shas[lib].dates.slice(0,20);
                console.log('[COUCH] Querying ' + platform + ' for ' + module.exports.tested_shas[lib].shas.length + ' SHAs...'); 
                query_for_results(platform, module.exports.tested_shas[lib].shas, end);
                query_for_errors(platform, module.exports.tested_shas[lib].shas, end);
            })(repo);
        });

        // on new commits, update commit lists with sha and date.
        var apache_url = "http://urd.zones.apache.org:2069/json";
        var gitpubsub = request.get(apache_url);
        gitpubsub.pipe(new apache_parser(function(project, sha) {
            var lib = {};
            lib[project] = sha;
            updater(lib, function() {
                if (project.indexOf('mobile-spec') > -1) return;
                var date = commits.date_for(project, sha);
                if (date) {
                    console.log('[MEDIC] New commit (' + project + '@' + sha.substr(0,7) + '), updating commit lists.');
                    module.exports.tested_shas[project].shas.unshift(sha);
                    module.exports.tested_shas[project].dates.unshift(date);
                    module.exports.commits[project].shas.unshift(sha);
                    module.exports.commits[project].dates.unshift(date);
                }
            });
        }));
        console.log('[MEDIC] Now listening to Apache git commits from ' + apache_url);

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
    add_mobile_spec_result:function(platform, sha, doc) {
        var tests = doc.value.total, num_fails = (doc.value.total - doc.value.passed), failText = doc.value.fails;

        platform = platform.toLowerCase();
        var model = doc.value.model;
        var version = doc.value.version;

        // Make sure results have proper parent objects
        if (!module.exports.results[platform]) module.exports.results[platform] = {};
        if (!module.exports.results[platform][sha]) module.exports.results[platform][sha] = {};
        if (!module.exports.results[platform][sha][version]) module.exports.results[platform][sha][version] = {};
        if (!module.exports.results[platform][sha][version][model]) module.exports.results[platform][sha][version][model] = {};

        module.exports.results[platform][sha][version][model] = {
            tests:tests,
            num_fails:num_fails,
            fails:failText
        };
    },
    add_build_failure:function(platform, sha, doc) {
        if (!module.exports.errors[platform]) module.exports.errors[platform] = {};
        if (!module.exports.errors[platform][sha]) module.exports.errors[platform][sha] = {};
        module.exports.errors[platform][sha] = doc;
    }
};
