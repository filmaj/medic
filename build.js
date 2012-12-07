var path      = require('path'),
    shell     = require('shelljs'),
    git_hooks = require('apache-git-commit-hooks'),
    queue     = require('./src/build/queue');

// Clean out temp directory, where we keep our generated apps
var temp = path.join(__dirname, 'temp');
shell.rm('-rf', temp);
shell.mkdir(temp);

// TODO: get latest x commits, scan for devices, see if couch has results for each commit+device. if no, build to that device.
// TODO: android doable by using adb devices + adb shell cat system/build.prop
// TODO: bb also likely doable using bb-deploy
// TODO: ios? ... probably not easily. brute-force queue builds for all ios devices for recent x commits?

// on new commits, queue builds for relevant projects.
git_hooks({period:1000 * 60 * 5}, function(updated_projects) {
    if (updated_projects) {
        console.log('-------------------------------------------------');
        console.log('[GIT] New commit(s) at ' + new Date());
        console.log('-------------------------------------------------');
        queue.push(updated_projects);
    }
});
