var path                   = require('path'),
    shell                  = require('shelljs'),
    git_hooks              = require('apache-git-commit-hooks'),
    builder                = require('./src/build/builder'),
    updater                = require('./src/build/updater');

// Clean out temp directory, where we keep our generated apps
var temp = path.join(__dirname, 'temp');
shell.rm('-rf', temp);
shell.mkdir(temp);

// get latest commits (and set up interval for pinging for that)
git_hooks({period:1000 * 60 * 15}, function(libraries) {
    if (libraries) {
        console.log('[GIT] New commits!');
        // Update relevant libraries
        // TODO: what if multiple commits are new?
        // TODO: build queuing system.
        // TODO: on init run through and see which of the x recent commits have no results. queue those commits for builds. 
        // TODO: should also have a queue/check system for devices
        updater(commits);

        // trigger builds only for relevant libraries
        builder(commits);
    }
});
