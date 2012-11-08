var path = require('path'),
    fs = require('fs'),
    android_build = require('./makers/android'),
    create_mobspec= require('./create_mobile_spec_app'),
    ios_build     = require('./makers/ios');

var mobile-spec-app = path.join(__dirname, '..', 'temp', 'mobspec');
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
    if (!fs.existsSync(mobile-spec-app)) create_mobspec();
    // TODO: other platforms
    for (var lib in commits) if (commits.hasOwnProperty(lib)) {
        if (builders.hasOwnProperty(lib)) {
            builders[lib](paths[lib]);
        }
    }
};
