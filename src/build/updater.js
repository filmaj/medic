
/*
Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
var shell       = require('shelljs'),
    path        = require('path'),
    n           = require('ncallbacks'),
    commit_list = require('./commit_list'),
    couch       = require('../couchdb/interface');

var libDir = path.join(__dirname, '..', '..', 'lib');

function iterate(obj, cb) {
    for (var p in obj) if (obj.hasOwnProperty(p)) {
        cb(p);
    }
}

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
    iterate(commits, function(lib) { number_of_updates++; });
    var end = n(number_of_updates, function() {
        console.log('[UPDATER] Finished updating ' + number_of_updates + ' repos.');
        callback();
    });

    iterate(commits, function(lib) {
        console.log('[UPDATER] Grabbing latest for ' + lib);
        
        // shell out to git
        var libPath = path.join(libDir, lib);
        shell.exec('cd ' + libPath + ' && git checkout -- . && git pull origin master', {silent:true, async:true}, function(res) {
            if (res.code > 0) throw new Error('Failed git-pull\'ing ' + libPath + '!\n' + res.output); 
            else end();
        });
    });
};
