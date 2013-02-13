var path             = require('path'),
    fs               = require('fs'),
    libraries        = require('../../libraries'),
    android_build    = require('./makers/android'),
    ios_build        = require('./makers/ios'),
    blackberry_build = require('./makers/blackberry');

var builders = {
    'cordova-android':android_build,
    'cordova-ios':ios_build,
    'cordova-blackberry':blackberry_build
};

function build_the_queue(q, callback) {
    var job = q.shift();
    if (job) {
        job.builder(job.output_location, job.sha, job.devices, job.entry, function(err) {
            if (err) console.error('[BUILDER] Previous build failed, continuing.');
            build_the_queue(q, callback);
        });
    } else callback();
}

module.exports = function(app_builder, app_entry_point) {
    builders['test'] = app_builder;

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
            if (builders.hasOwnProperty(lib)) {
                var job = {
                    library:lib,
                    builder:builders[lib],
                    output_location:libraries.output[lib]
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
    }
};
