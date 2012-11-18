var shell = require('shelljs'),
    fs    = require('fs'),
    path  = require('path');

// Get the cordova libraries
var libs = ['incubator-cordova-android', 'incubator-cordova-mobile-spec', 'incubator-cordova-ios', 'incubator-cordova-blackberry-webworks'];

var libDir = path.join(__dirname, 'lib');
shell.mkdir('-p', libDir);

var contents = fs.readdirSync(libDir);

libs.forEach(function(lib) {
    if (contents.indexOf(lib) == -1) {
        // Don't have the lib, get it.
        var cmd = 'git clone https://git-wip-us.apache.org/repos/asf/' + lib + '.git ' + path.join(libDir, lib);
        console.log('Cloning ' + lib);
        shell.exec(cmd, {silent:true});
    } else {
        // Have the lib, update it.
        var cmd = 'cd ' + path.join(libDir, lib) + ' && git checkout -- . && git pull origin master';
        shell.exec(cmd, {silent:true});
    }
});
