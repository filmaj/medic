
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
var path             = require('path'),
    fs               = require('fs'),
    libraries        = require('../../libraries'),
    android_build    = require('./makers/cordova-android'),
    ios_build        = require('./makers/cordova-ios'),
    blackberry_build = require('./makers/cordova-blackberry');
    forte_android_framework_build = require('./makers/forte_android_framework');

var builders = {
    'cordova-android':android_build,
    'cordova-ios':ios_build,
    'cordova-blackberry':blackberry_build,
    'forte_android_framework': forte_android_framework_build
};

function build_the_queue(q, callback) {
    // console.log('build the queue: ' + JSON.stringify(q));
    var job = q.shift();
    if (job) {
        // console.log('building job: ' + JSON.stringify(job));
        job.builder(job.output_location, job.sha, job.devices, job.entry, function(err) {
            if (err) console.error('[BUILDER] Previous build failed, continuing.');
            build_the_queue(q, callback);
        });
    } else callback();
}

module.exports = function(app_builder, app_entry_point, static) {
    builders['test'] = require(path.join('..','..',app_builder));
    if (static) {
        builders['test'](libraries['test'].output, static, null, null, app_entry_point, function(err) {
            if (err) {
                throw new Error('Could not copy test app over!');
            }
            console.log('[MEDIC] Test app built + ready.');
        });
    } else {
        builders['test'](libraries['test'].output, 'HEAD', null, app_entry_point, function(err) {
            if (err) {
                throw new Error('Could not build Test App! Aborting!');
            }
            console.log('[MEDIC] Test app built + ready.');
        });
    }

    return function builder(commits, callback) {
        // commits format:
        // { cordova-android:'sha'}
        // OR
        // { cordova-android:{
        //     sha:'sha',
        //     devices:[]
        //   }
        // }
        var miniq = [];
        for (var lib in commits) if (commits.hasOwnProperty(lib)) {
            console.log('[BUILDER] checking commit: ' + lib);
            if (builders.hasOwnProperty(lib)) {
                var job = {
                    library:lib,
                    builder:builders[lib],
                    output_location:libraries[lib].output,
                    entry:app_entry_point
                };

                // Some jobs might be for all devices, or specific devices
                if (typeof commits[lib] == 'string') {
                    job.sha = commits[lib];
                } else {
                    job.sha = commits[lib].sha;
                    job.devices = commits[lib].devices;
                }
                miniq.push(job);
            }
        }
        build_the_queue(miniq, callback);
    };
};
