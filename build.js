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

// get latest commits for each repo
var ms = 'cordova-mobile-spec';
for (var lib in libraries.paths) if (libraries.paths.hasOwnProperty(lib) && lib != ms) (function(repo) {
    var platform = repo.substr(repo.indexOf('-')+1);
    couch.cordova_commits.get(repo, function(err, commits_doc) {
        var commits = commits_doc.shas;
        // scan for devices for said platform 
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
        //queue.push(updated_projects);
    }
});
