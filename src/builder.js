var android_build          = require('./src/makers/android'),
    ios_build              = require('./src/makers/ios');

// where we store generated apps
var android_path = path.join(__dirname, '..', 'temp', 'android');
var ios_path = path.join(__dirname, '..', 'temp', 'ios');

module.export = function builder(commits) {
    // TODO: only build whats specified in commits
    // TODO: other platforms
    android_build(android_path);
    ios_build(ios_path);
};
