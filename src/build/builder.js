var path = require('path'),
    fs = require('fs'),
    libraries = require('../../libraries'),
    android_build    = require('./makers/android'),
    mobspec_build    = require('./makers/mobile_spec'),
    ios_build        = require('./makers/ios'),
    blackberry_build = require('./makers/blackberry');

// im lazy
var ms = 'cordova-mobile-spec';

// builder mapping
var builders = {
    'cordova-android':android_build,
    'cordova-ios':ios_build,
    'cordova-blackberry':blackberry_build,
    'cordova-mobile-spec':mobspec_build
};

function build_the_queue(queue) {
    var job = queue.shift();
    if (job) {
        console.log('[BUILDER] Starting job ' + job.library);
        job.builder(job.output_location, job.sha, function(err) {
            if (err) console.error('[BUILDER] Previous job failed.');
            else build_the_queue(queue);
        });
    } else {
        console.log('[BUILDER] Job queue emptied.');
    }
}

module.exports = function builder(commits) {
    // build mobile-spec first if its in the commits
    // if a medic-flavoured mobile spec isnt built, build it
    if (ms in commits || !fs.existsSync(libraries.output[ms])) mobspec_build();

    // commits format:
    // { incubator-cordova-android:'sha',
    //   incubator-cordova-ios:'sha' }
    var queue = [];
    for (var lib in commits) if (commits.hasOwnProperty(lib) && lib != ms) {
        if (builders.hasOwnProperty(lib)) {
            queue.push({
                library:lib,
                builder:builders[lib],
                output_location:libraries.output[lib],
                sha:commits[lib]
            });
        }
    }
    build_the_queue(queue);
};
