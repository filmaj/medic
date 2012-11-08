var shell = require('shelljs'),
    path  = require('path'),
    fs    = require('fs'),
    create_mobile_spec_app = require('./create_mobile_spec_app');

var libDir = path.join(__dirname, '..', 'lib');

module.exports = function(commits) {
    // commits format:
    // {
    //     incubator-cordova-android:sha
    // }
    var counter = 0;
    for (var lib in commits) if (commits.hasOwnProperty(lib)) {
        console.log('Pulling down latest for ' + lib);
        counter++;
        lib = path.join(libDir, lib);
        var res = shell.exec('cd ' + lib + ' && git pull origin master', {silent:true});
        if (res.code > 0) throw ('Failed git-pull\'ing ' + lib + '!'); 
        if (lib == 'incubator-cordova-mobile-spec') {
            create_mobile_spec_app();
        }
    }
    console.log('Libraries (' + counter + ' of \'em) have been updated.');
};
