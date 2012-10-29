var shell = require('shelljs'),
    fs    = require('fs'),
    path  = require('path');

// Get the cordova libraries
var libs = ['incubator-cordova-android', 'incubator-cordova-mobile-spec', 'incubator-cordova-ios'];

var libDir = path.join(__dirname, 'lib');
shell.mkdir('-p', libDir);

var contents = fs.readdirSync(libDir);

libs.forEach(function(lib) {
    if (contents.indexOf(lib) == -1) {
        // Don't have the lib, get it.
        var cmd = 'git clone https://git-wip-us.apache.org/repos/asf/' + lib + '.git ' + path.join(libDir, lib);
        console.log('Cloning ' + lib);
        shell.exec(cmd, {silent:true});
    }
});

// Build fruitstrap
var cmd = 'cd ./node_modules/fruitstrap && make fruitstrap';
var make = shell.exec(cmd, {silent:true});
if (make.code > 0) {
    console.log('There was an error building fruitstrap. You will not be able to deploy to iOS devices. Suggest you run:');
    console.log('    cd node_modules/fruitstrap');
    console.log('    make fruitstrap');
    console.log('..and fix that if you want to get this to run.');
} else {
    console.log('fruitstrap built successfully.');
}

