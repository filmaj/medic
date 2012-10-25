var shell = require('shelljs'),
    fs    = require('fs'),
    path  = require('path');

var libs = ['incubator-cordova-android', 'incubator-cordova-mobile-spec'];

var libDir = path.join(__dirname, 'lib');

var contents = fs.readdirSync(libDir);

libs.forEach(function(lib) {
    if (contents.indexOf(lib) == -1) {
        // Don't have the lib, get it.
        var cmd = 'git clone https://git-wip-us.apache.org/repos/asf/' + lib + '.git ' + path.join(libDir, lib);
        console.log('Cloning ' + lib);
        shell.exec(cmd, {silent:true});
    }
});
