var shell = require('shelljs'),
    path  = require('path'),
    commit_list = require('./commit_list'),
    couch = require('../couchdb/interface');

var libDir = path.join(__dirname, '..', '..', 'lib');
var num_commits = 20;

module.exports = function(commits) {
    // commits format:
    // {
    //     cordova-android:sha
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

        // update couch if necessary
        var latest_shas = commit_list(lib, num_commits);
        couch.cordova_commits.get(lib, function(error, response) {
            if (error) console.error('[COUCH] [ERROR] Could not retrieve latest commits from couch.');
            else {
                var stored_shas = response.shas;
                if (stored_shas[0] != latest_shas[0]) {
                    // we should update the shas.
                    couch.cordova_commits.clobber(lib, {
                        shas:latest_shas
                    }, function(err, res) {
                        if (err) {
                            console.error('[COUCH] [ERROR] Could not update commits for ' + lib, err);
                        } else {
                            console.log('[COUCH] Cordova commits for ' + lib + ' updated.');
                        }
                    });
                }
            }
        });
    }(repo));
    console.log('[UPDATER] Libraries (' + counter + ' of \'em) have been updated.');
};
