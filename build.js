var path      = require('path'),
    shell     = require('shelljs'),
    git_hooks = require('apache-git-commit-hooks'),
    couch     = require('./src/couchdb/interface'),
    libraries = require('./libraries'),
    n         = require('ncallbacks'),
    queue     = require('./src/build/queue');

// Clean out temp directory, where we keep our generated apps
var temp = path.join(__dirname, 'temp');
shell.rm('-rf', temp);
shell.mkdir(temp);

// Look at results for specific devices of recent commits. Compare to connected devices. See which are missing from server. Queue those builds.
// TODO: figure out ios device scanning.
var ms = 'cordova-mobile-spec';
for (var lib in libraries.paths) if (libraries.paths.hasOwnProperty(lib) && lib != ms && lib != 'cordova-ios') (function(repo) {
    var platform = repo.substr(repo.indexOf('-')+1);
    couch.cordova_commits.get(repo, function(err, commits_doc) {
        var commits = commits_doc.shas;
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
                                job.numDevices = targets;
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
    });
})(lib);

// on new commits, queue builds for relevant projects.
// TODO: use gitpubsub
