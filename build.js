var path                   = require('path'),
    shell                  = require('shelljs'),
    git_hooks              = require('apache-git-commit-hooks'),
    builder                = require('./src/build/builder'),
    updater                = require('./src/build/updater');

// Clean out temp directory, where we keep our generated apps
var temp = path.join(__dirname, 'temp');
shell.rm('-rf', temp);
shell.mkdir(temp);

// TODO: get latest x commits, scan for devices, see if couch has results for each commit+device. if no, build to that device.
// TODO: android doable by using adb devices + adb shell cat system/build.prop
// TODO: bb also likely doable using bb-deploy
// TODO: ios? ...

// on new commits, update + build libraries.
// TODO: once queue system in place this needs a refactor
git_hooks({period:1000 * 60 * 5 /* 5 mins */}, function(libraries) {
    if (libraries) {
        console.log('-------------------------------------------------');
        console.log('[GIT] New commits at ' + new Date());
        console.log('-------------------------------------------------');
        // Update relevant libraries
        updater(libraries);

        // trigger builds only for relevant libraries
        builder(libraries);
    }
});
