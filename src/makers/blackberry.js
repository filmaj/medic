var shell = require('shelljs'),
    path  = require('path'),
    et    = require('elementtree'),
    fs    = require('fs');

var blackberry_lib = path.join(__dirname, '..', '..', 'lib', 'incubator-cordova-blackberry-webworks');
var mobile_spec = path.join(__dirname, '..', '..', 'temp', 'mobspec');
var create = path.join(blackberry_lib, 'bin', 'create');

module.exports = function(output) {
    shell.rm('-rf', output);

    // create an blackberry app into output dir
    console.log('Shelling out to blackberry:create.');
    var create_output = shell.exec(create + ' ' + output, {silent:true});
    if (create_output.code > 0) throw ('Failed to create BlackBerry application. ' + create_output.output);
    
    // copy over mobile spec modified html assets
    console.log('Copying over mobile-spec to BlackBerry app.');
    shell.cp('-Rf', path.join(mobile_spec, '*'), path.join(output, 'www'));

    // drop the Android library SHA into the junit reporter
    var sha = shell.exec('cd ' + blackberry_lib + ' && git log | head -1', {silent:true}).output.split(' ')[1].replace(/\s/,'');
    var tempJunit = path.join(output, 'www', 'junit-reporter.js');
    fs.writeFileSync(tempJunit, "var library_sha = '" + sha + "';\n" + fs.readFileSync(tempJunit, 'utf-8'), 'utf-8');

    // TODO :modify start page
    console.log('Modifying start page changing config.xml.');
    var config_path = path.join(output, 'www', 'config.xml');
    var doc = new et.ElementTree(et.XML(fs.readFileSync(config_path, 'utf-8')));

    // TODO: compile
    console.log('Compiling Android app.');
    var ant = 'cd ' + output + ' && ant clean && ant debug';
    var compile = shell.exec(ant, {silent:true});
    if (compile.code > 0) throw ('Failed to compile Android application. ' + compile.output);

    // TODO:verify + update list of accessible devices 
    console.log('Getting list of devices for Android.');
    var devices = shell.exec('adb devices', {silent:true}).output.split('\n').slice(1);
    devices = devices.filter(function(d) { return d.length>0; });
    devices = devices.map(function(d) { return d.split('\t')[0]; });
    console.log('Device list: ' + devices.join(', '));

    // deploy and run on each device
    if (devices.length > 0) {
        devices.forEach(function(d) {
            console.log('Uninstall app first just in case on device ' + d);
            var cmd = 'adb -s ' + d + ' uninstall org.apache.cordova.example';
            var uninstall = shell.exec(cmd, {silent:true});
            if (uninstall.code > 0) throw ('Failed to uninstall Android app on device ' + d + '.');
            console.log('Installing app on Android device ' + d);
            cmd = 'adb -s ' + d + ' install -r ' + path.join(output, 'bin', 'cordovaExample-debug.apk');
            var install = shell.exec(cmd, {silent:true});
            if (install.code > 0) throw ('Failed to install Android app to device ' + d + '.');

            console.log('Running app on Android device ' + d);
            cmd = 'adb -s ' + d + ' shell am start -n org.apache.cordova.example/org.apache.cordova.example.cordovaExample';
            var deploy = shell.exec(cmd, {silent:true});
            if (deploy.code > 0) throw ('Failed to run Android app on device ' + d + '.');
        });
        console.log('Deployed to Android devices.');
    } else console.log('No Android devices to deploy to :(');
}
