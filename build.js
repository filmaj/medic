#!/usr/bin/env node
var path          = require('path'),
    shell         = require('shelljs'),
    apache_parser = require('./src/apache-gitpubsub-parser'),
    request       = require('request'),
    couch         = require('./src/couchdb/interface'),
    libraries     = require('./libraries'),
    config        = require('./config'),
    n             = require('ncallbacks'),
    bootstrap     = require('./bootstrap'),
    argv          = require('optimist').argv,
    commit_list   = require('./src/build/commit_list'),
    updater       = require('./src/build/updater'),
    q             = require('./src/build/queue');

// Clean out temp directory, where we keep our generated apps
var temp = path.join(__dirname, 'temp');
shell.rm('-rf', temp);
shell.mkdir(temp);

function log(err) {
    if (err) {
        console.error(err);
        process.exit(1);
    } else {
        console.log('Usage:');
        process.exit(0);
    }
}

var queue;

// should we even bother building certain platforms
var should_build = {
    'cordova-blackberry':(config.blackberry.devices.ips && config.blackberry.devices.ips.length > 0),
    'cordova-ios':(config.ios.keychainLocation && config.ios.keychainLocation.length > 0),
    'cordova-android':true
};

// --entry, -e: entry point into the app. index.html as default.
var app_entry_point = argv.e || argv.entry || config.app.entry || 'index.html';
var remote_app = app_entry_point.indexOf('http') === 0;

// Sanitize/check parameters.
// --app, -a: relative location to static app 
var static = argv.a || argv.app || config.app.static.path;
if (!static && !remote_app) {
    // must be dynamic app
    var app_commit_hook = argv.h || argv.hook || config.app.dynamic.commit_hook;
    var app_git = argv.g || argv.git || config.app.dynamic.git;
    if (!app_git) {
        log('No test application git URL provided!');
    }
    // --builder, -b: path to node.js module that will handle app prep
    var app_builder = argv.b || argv.builder || config.app.dynamic.builder;
    if (!app_builder) {
        log('No application builder module specified!');
    }
}

// --platforms, -p: specify which platforms to build for. android, ios, blackberry, all, or a comma-separated list
// can also specify a specific sha or tag of cordova to build the app with using <platform>@<sha>
// if none specified, builds for all platforms by default, using the latest cordova. this means it will also listen to changes to the cordova project
var platforms = argv.p || argv.platforms || config.app.platforms;
if (!platforms) {
    platforms = libraries.list;
}
if (typeof platforms == 'string') {
    platforms = platforms.split(',').filter(function(p) { 
        return libraries.list.indexOf(p.split('@')[0]) > -1;
    });
}
// determine which platforms we listen to apache cordova commits to
var head_platforms = platforms.filter(function(p) {
    return p.indexOf('@') == -1;
}).map(function(p) { return 'cordova-' + p; });
// determine which platforms are frozen to a tag
var frozen_platforms = platforms.filter(function(p) {
    return p.indexOf('@') > -1;
});

// bootstrap makes sure we have the libraries cloned down locally and can query them for commit SHAs and dates
new bootstrap(app_git, app_builder).go(function() {
    if (!static && !remote_app) { 
        // Set up build queue based on config
        queue = new q(app_builder, app_entry_point, false);
    } else {
        // static app support
        queue = new q('./src/build/makers/static', app_entry_point, (remote_app ? app_entry_point : static));
    }

    // If there are builds specified for specific commits of libraries, queue them up
    if (frozen_platforms.length > 0) {
        console.log('[MEDIC] Queuing up frozen builds.');
        frozen_platforms.forEach(function(p) {
            var tokens = p.split('@');
            var platform = p[0];
            var sha = p[1];
            var job = {};
            job['cordova-' + platform] = {
                "sha":sha
            }
            queue.push(job);
        });
        console.log('[MEDIC] Frozen build queued.');
    }
    if (static || remote_app) {
        // just build the head of platforms
        console.log('[MEDIC] Building test app for latest version of platforms.');
        head_platforms.forEach(function(platform) {
            if (should_build[platform]) {
                var job = {};
                job[platform] = {
                    "sha":"HEAD"
                }
                queue.push(job);
            }
        });
    } else {
        // on new commits to cordova libs, queue builds for relevant projects.
        if (head_platforms.length > 0) { 
            var apache_url = "http://urd.zones.apache.org:2069/json";
            var gitpubsub = request.get(apache_url);
            gitpubsub.pipe(new apache_parser(function(project, sha) {
                // only queue for platforms that we want to build with latest libs
                if (head_platforms.indexOf(project) > -1) {
                    // update the local repo
                    var job = {};
                    job[project] = sha;
                    updater(job, function() {
                        // handle commit bunches
                        // number of most recent commits including newest one to check for queueing results.
                        // since you can commit multiple times locally and push multiple commits up to repo, this ensures we have decent continuity of results
                        var num_commits_back_to_check = 5;
                        var commits = commit_list.recent(project, num_commits_back_to_check).shas;
                        check_n_queue(project, commits); 
                    });
                }
            }));
            console.log('[MEDIC] Now listening to Apache git commits from ' + apache_url);

            // queue up builds for any missing recent results for HEAD platforms too
            head_platforms.forEach(function(platform) {
                if (should_build[platform]) {
                    var commits = commit_list.recent(platform, 10).shas;
                    check_n_queue(platform, commits);
                }
            });
        }
        // if app commit_hook exists, wire it up here
        if (app_commit_hook) {
            if (app_commit_hook.lastIndexOf('.js') == (app_commit_hook.length - 3)) {
                app_commit_hook = app_commit_hook.substr(0, app_commit_hook.length -3);
            }
            var hook;
            try {
                hook = require('./' + app_commit_hook);
            } catch(e) {
                console.error('[MEDIC] [ERROR] ..requiring app hook. Probably path issue: ./' + app_commit_hook);
                console.error(e.message);
            }
            if (hook) {
                hook(function(sha) {
                    // On new commits to test project, make sure we build it.
                    // TODO: once test project is created, we should also queue it for relevant platforms
                    queue.push({
                        'test':sha
                    });
                });
                console.log('[MEDIC] Now listening for test app updates.');
            } else {
                console.log('[MEDIC] [WARNING] Not listening for app commits. Fix the require issue first!');
            }
        }
    }
});

// Given a repository and array of commits for that repository, 
function check_n_queue(repo, commits) {
    console.log('[MEDIC] Checking ' + repo + '\'s ' + commits.length + ' most recent commit(s) for results on your couch...');
    var platform = repo.substr(repo.indexOf('-')+1);
    // TODO: figure out ios device scanning. issue: determine what model and version connected ios devices are running. until then, we can't queue ios builds on devices that we are missing results for, so we look at ios commits with no results and queue those up.
    if (repo == 'cordova-ios') {
        // look at latest commits and see which ones have no results
        commits.forEach(function(commit) {
            couch.mobilespec_results.query_view('results', 'ios?key="' + commit + '"', function(error, result) {
                if (error) {
                    console.error('[COUCH] Failed to retrieve iOS results for sha ' + commit.substr(0,7) + ', continuing.');
                } else {
                    if (result.rows.length === 0) {
                        // no results, queue the job!
                        var job = {
                            'cordova-ios':{
                                'sha':commit
                            }
                        };
                        queue.push(job);
                    }
                }
            });
        });
    } else {
        // scan for devices for said platform
        var platform_scanner = require('./src/build/makers/' + platform + '/devices');
        var platform_builder = require('./src/build/makers/' + platform);
        platform_scanner(function(err, devices) {
            if (err) console.log('[BUILD] Error scanning for ' + platform + ' devices: ' + devices);
            else {
                var numDs = 0;
                for (var d in devices) if (devices.hasOwnProperty(d)) numDs++;
                if (numDs > 0) {
                    commits.forEach(function(commit) {
                        var job = {};
                        var targets = 0;
                        job[repo] = {
                            sha:commit,
                            numDevices:0,
                            devices:{}
                        };
                        var end = n(numDs, function() {
                            if (targets > 0) {
                                job[repo].numDevices = targets;
                                queue.push(job);
                            }
                        });
                        for (var d in devices) if (devices.hasOwnProperty(d)) (function(id) {
                            var device = devices[id];
                            var version = device.version;
                            var model = device.model;
                            var couch_id = platform + '__' + commit + '__' + version + '__' + model;
                            couch.mobilespec_results.get(couch_id, function(err, res_doc) {
                                if (err && res_doc == 404) {
                                    // Don't have results for this device!
                                    targets++;
                                    job[repo].devices[id] = {
                                        version:version,
                                        model:model
                                    }; 
                                }
                                end();
                            });
                        }(d));
                    });
                }
            }
        });
    }
};
