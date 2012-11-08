var path = require('path'),
    android_build = require('./makers/android'),
    ios_build     = require('./makers/ios');

// where we store generated apps mapping
var paths = {
    'incubator-cordova-android':path.join(__dirname, '..', 'temp', 'android'),
    'incubator-cordova-ios':path.join(__dirname, '..', 'temp', 'ios')
};

// builder mapping
var builders = {
    'incubator-cordova-android':android_build,
    'incubator-cordova-ios':ios_build
};

module.exports = function builder(commits) {
    // commits format:
    // { incubator-cordova-android:'sha',
    //   incubator-cordova-ios:'sha' }
    // TODO: other platforms
    for (var lib in commits) if (commits.hasOwnProperty(lib)) {
        if (builders.hasOwnProperty(lib)) {
            builders[lib](paths[lib]);
        }
    }
};
