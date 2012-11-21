var shell = require('shelljs'),
    path  = require('path'),
    commit_list = require('./commit_list'),
    couch = require('../couchdb/interface');

var libDir = path.join(__dirname, '..', '..', 'lib');
var num_commits = 20;

module.exports = function(commits) {
    // commits format:
    // {
    //     incubator-cordova-android:sha
    // }
    // TODO: async + callback this shit
    var counter = 0;
    for (var repo in commits) if (commits.hasOwnProperty(repo)) (function(lib) {
        console.log('[UPDATER] Grabbing latest for ' + lib);
        counter++;
        
        // shell out to git
        var libPath = path.join(libDir, lib);
        var res = shell.exec('cd ' + libPath + ' && git checkout -- . && git pull origin master', {silent:true});
        if (res.code > 0) throw ('Failed git-pull\'ing ' + libPath + '!\n' + res.output); 

        // update couch
        couch.cordova_commits.clobber(lib, {
            shas:commit_list(lib, num_commits)
        }, function(err, res) {
            if (err) {
                console.log('[COUCH] [ERROR] Could not update commits for ' + lib);
            } else {
                console.log('[COUCH] Cordova commits for ' + lib + ' updated.');
            }
        });
    }(repo));
    console.log('[UPDATER] Libraries (' + counter + ' of \'em) have been updated.');
};
