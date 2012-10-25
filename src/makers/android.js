var shell = require('shelljs'),
    path  = require('path'),
    fs    = require('fs');

var android_lib = path.join(__dirname, '..', '..', 'lib', 'incubator-cordova-android');
var mobile_spec = path.join(__dirname, '..', '..', 'temp', 'mobspecapp');
var create = path.join(android_lib, 'bin', 'create');

module.exports = function(output) {
    shell.rm('-rf', output);

    // create an android app into output dir
    var create_output = shell.exec(create + ' ' + output, {silent:true});
    if (create_output.code > 0) throw ('Failed to create Android application. ' + create_output.output);
    
    // copy over mobile spec modified html assets
    shell.cp('-Rf', path.join(mobile_spec, '*'), path.join(output, 'assets', 'www'));

    // modify start page
    var javaFile = path.join(output, 'src', 'org', 'apache', 'cordova', 'example', 'cordovaExample.java'); 
    fs.writeFileSync(javaFile, fs.readFileSync(javaFile, 'utf-8').replace(/www\/index\.html/, 'www/autotest/pages/all.html'), 'utf-8');

    // compile
    var debug = path.join(output, 'cordova', 'debug');
    var compile = shell.exec(debug, {silent:true});
    if (compile.code > 0) throw ('Failed to compile Android application. ' + compile.output);

    // get list of connected devices
    var devices = shell.exec('adb devices', {silent:true}).output.split('\n').slice(1);
    devices = devices.filter(function(d) { return d.length>0; });
    devices = devices.map(function(d) { return d.split('\t')[0]; });

    // deploy and run on each device
    if (devices.length > 0) {
        devices.forEach(function(d) {
            var cmd = 'adb -s ' + d + ' install -r ' + path.join(output, 'bin', 'cordovaExample-debug.apk');
            var install = shell.exec(cmd, {silent:true});
            if (install.code > 0) throw ('Failed to install Android app to device ' + d + '.');

            cmd = 'adb -s ' + d + ' shell am start -n org.apache.cordova.example/org.apache.cordova.example.cordovaExample';
            var deploy = shell.exec(cmd, {silent:true});
            if (deploy.code > 0) throw ('Failed to run Android app on device ' + d + '.');
        });
        console.log('Deployed to Android devices.');
    } else console.log('No Android devices to deploy to :(');
}
