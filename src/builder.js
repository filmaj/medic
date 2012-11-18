var path = require('path'),
    fs = require('fs'),
    android_build    = require('./makers/android'),
    mobspec_build    = require('./makers/mobile_spec'),
    ios_build        = require('./makers/ios'),
    blackberry_build = require('./makers/blackberry');

// results location
var posts = path.join(__dirname, '..', 'posts');

// im lazy
var ms = 'incubator-cordova-mobile-spec';

// where we store generated apps mapping
var output_paths = {
    'incubator-cordova-android':path.join(__dirname, '..', 'temp', 'android'),
    'incubator-cordova-ios':path.join(__dirname, '..', 'temp', 'ios'),
    'incubator-cordova-blackberry-webworks':path.join(__dirname, '..', 'temp', 'blackberry'),
    'incubator-cordova-mobile-spec':path.join(__dirname, '..', 'temp', 'mobspec')
};

// builder mapping
var builders = {
    'incubator-cordova-android':android_build,
    'incubator-cordova-ios':ios_build,
    'incubator-cordova-blackberry-webworks':blackberry_build,
    'incubator-cordova-mobile-spec':mobspec_build
};

module.exports = function builder(commits) {
    // build mobile-spec first if its in the commits
    if (ms in commits) mobspec_build();
    // if a medic-flavoured mobile spec isnt built, build it
    if (!fs.existsSync(output_paths[ms])) mobspec_build();

    // commits format:
    // { incubator-cordova-android:'sha',
    //   incubator-cordova-ios:'sha' }
    for (var lib in commits) if (commits.hasOwnProperty(lib)) {
        if (builders.hasOwnProperty(lib)) {
            builders[lib](output_paths[lib], commits[lib]);
        }
    }
};
