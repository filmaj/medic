var shell       = require('shelljs'),
    path        = require('path'),
    n           = require('ncallbacks'),
    commit_list = require('./commit_list'),
    couch       = require('../couchdb/interface');

var libDir = path.join(__dirname, '..', '..', 'lib');
var num_commits = 20;

module.exports = function(commits, callback) {
    // commits format:
    // {
    //     cordova-android:sha
    // }
    // OR:
    // {
    //     cordova-android:{
    //         sha:sha,
    //         devices:[id1, id2]
    //     }
    // }

    var number_of_updates = 0;
    for (var repo in commits) if (commits.hasOwnProperty(repo)) number_of_updates++;
    var end = n(number_of_updates, function() {
        console.log('[UPDATER] Finished updating ' + number_of_updates + ' repos.');
        callback();
    });

    for (var repo in commits) if (commits.hasOwnProperty(repo)) (function(lib) {
        console.log('[UPDATER] Grabbing latest for ' + lib);
        
        // shell out to git
        var libPath = path.join(libDir, lib);
        shell.exec('cd ' + libPath + ' && git checkout -- . && git pull origin master', {silent:true, async:true}, function(res) {
            if (res.code > 0) throw ('Failed git-pull\'ing ' + libPath + '!\n' + res.output); 

            // update couch if necessary
            var latest_shas = commit_list.recent(lib, num_commits);
            couch.cordova_commits.get(lib, function(error, response) {
                if (error) console.error('[COUCH] [ERROR] Could not retrieve latest commits from couch.');
                else {
                    var stored_shas = response.shas;
                    if (stored_shas[0] != latest_shas.shas[0]) {
                        // we should update the shas.
                        couch.cordova_commits.clobber(lib, latest_shas, function(err, res) {
                            if (err) {
                                console.error('[COUCH] [ERROR] Could not update commits for ' + lib, err);
                            } else {
                                console.log('[COUCH] Cordova commits for ' + lib + ' updated.');
                            }
                        });
                    } else {
                        console.log('[COUCH] ' + lib + ' already has most recent commits.');
                    }
                }
            });
            end();
        });
    }(repo));
};
