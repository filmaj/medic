var path      = require('path'),
    shell     = require('shelljs'),
    git_hooks = require('apache-git-commit-hooks'),
    couch     = require('./src/couchdb/interface'),
    libraries = require('./libraries'),
    queue     = require('./src/build/queue');

// Clean out temp directory, where we keep our generated apps
var temp = path.join(__dirname, 'temp');
shell.rm('-rf', temp);
shell.mkdir(temp);

// Look at results for specific devices of recent commits. Compare to connected devices. See which are missing from server. Queue those builds.
// get latest commits for each repo
var ms = 'cordova-mobile-spec';
for (var lib in libraries.paths) if (libraries.paths.hasOwnProperty(lib) && lib != ms) (function(repo) {
    var platform = repo.substr(repo.indexOf('-')+1);
    couch.cordova_commits.get(repo, function(err, commits_doc) {
        var commits = commits_doc.shas;
        // scan for devices for said platform
        var platform_scanner = require('./src/build/makers/' + platform + '/devices');
        platform_scanner(function(err, devices) {
            if (err) console.log('[BUILD] Error scanning for ' + platform + ' devices: ' + devices);
            else {
                console.log(devices);
            }
        });
    });
})(lib);
// TODO: android doable by using adb devices + adb shell cat system/build.prop
// TODO: bb also likely doable using bb-deploy
// TODO: ios? ... probably not easily. brute-force queue builds for all ios devices for recent x commits?

// on new commits, queue builds for relevant projects.
git_hooks({period:1000 * 60 * 5}, function(updated_projects) {
    if (updated_projects) {
        console.log('-------------------------------------------------');
        console.log('[GIT] New commit(s) at ' + new Date());
        console.log('-------------------------------------------------');
        // TODO: multiple commits?
        // TODO: if multiple commits, rescan for devices to see which combo of device+libshas we are missing results for?
        //queue.push(updated_projects);
    }
});
