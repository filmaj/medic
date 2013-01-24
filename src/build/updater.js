var shell       = require('shelljs'),
    path        = require('path'),
    n           = require('ncallbacks'),
    commit_list = require('./commit_list'),
    couch       = require('../couchdb/interface');

var libDir = path.join(__dirname, '..', '..', 'lib');

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
            else end();
        });
    }(repo));
};
