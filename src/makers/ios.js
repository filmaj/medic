var shell = require('shelljs'),
    path  = require('path'),
    cp    = require('child_process'),
    fs    = require('fs');

var ios_lib = path.join(__dirname, '..', '..', 'lib', 'incubator-cordova-ios');
var mobile_spec = path.join(__dirname, '..', '..', 'temp', 'mobspec');
var logspot = path.join(__dirname, '..', '..', 'temp', 'log');
var create = path.join(ios_lib, 'bin', 'create');
var root = path.join(__dirname, '..', '..');

// deploy and run a specified bundle to specified devices
function deploy(devices, bundlePath, bundleId) {
    var fruitstrap = path.join(root, 'node_modules', 'fruitstrap', 'fruitstrap');
    // current fruitstrap dependency has two binaries, uninstall exists under the "listdevices" one
    var listdevices = path.join(root, 'node_modules', 'fruitstrap', 'listdevices');
    if (devices.length > 0) {
        devices.forEach(function(d) {
            console.log('Uninstall app first just in case on device ' + d);
            var cmd = listdevices + ' uninstall --id=' + d + ' --bundle-id=org.apache.cordova.example';
            var uninstall = shell.exec(cmd, {silent:true});
            if (uninstall.code > 0) console.log('Failed to uninstall iOS app on device ' + d + ', continuing');
            console.log('Installing and running app on iOS device ' + d);
            var args = ['--id=' + d, '--bundle=' + bundlePath, '--debug'];
            var buf = '';
            var fruit = cp.spawn(fruitstrap, args);
            fruit.stdout.on('data', function(stdout) {
                buf += stdout.toString();
                should_we_kill(fruit, buf);
            });
            fruit.stderr.on('data', function(stderr) {
                buf += stderr.toString();
                should_we_kill(fruit, buf);
            });
        });
        console.log('Deployed to iOS devices.');
    } else console.log('No iOS devices to deploy to :(');
};

function should_we_kill(process, buf) {
    if (buf.indexOf('>>> DONE <<<') > -1) {
        process.kill();
    }
};

module.exports = function(output) {
    shell.rm('-rf', output);

    // create an ios app into output dir
    console.log('Shelling out to ios:create.');
    var create_output = shell.exec(create + ' ' + output + ' org.apache.cordova.example cordovaExample', {silent:true});
    if (create_output.code > 0) throw ('Failed to create iOS application. ' + create_output.output);

    var projectWww = path.join(output, 'www');
    
    // copy over mobile spec modified html assets
    console.log('Copying over mobile-spec to iOS app.');
    shell.cp('-Rf', path.join(mobile_spec, '*'), projectWww);

    // drop the iOS library SHA into the junit reporter
    var sha = shell.exec('cd ' + ios_lib + ' && git log | head -1', {silent:true}).output.split(' ')[1].replace(/\s/,'');
    var tempJunit = path.join(projectWww, 'junit-reporter.js');
    fs.writeFileSync(tempJunit, "var library_sha = '" + sha + "';\n" + fs.readFileSync(tempJunit, 'utf-8'), 'utf-8');

    // modify start page
    console.log('Modifying start page by clobbering objective-c.');
    var mFile = path.join(output, 'cordovaExample', 'Classes', 'AppDelegate.m'); 
    fs.writeFileSync(mFile, fs.readFileSync(mFile, 'utf-8').replace(/index\.html/, 'autotest/pages/all.html'), 'utf-8');

    // modify whitelist
    var plist = path.join(output, 'cordovaExample', 'Cordova.plist');
    var contents = fs.readFileSync(plist, 'utf-8');
    var re = /<key>ExternalHosts<\/key>\s*<array\/>/gi;
    fs.writeFileSync(plist, contents.replace(re, '<key>ExternalHosts</key><array><string>*</string></array>'), 'utf-8');

    // compile
    console.log('Compiling iOS app.');
    
    // modify configuration to Release mode, i386 to armv7 and sdk to iphoneos6.0  so we can use it with fruitstrap
    var debugScript = path.join(output, 'cordova', 'debug');
    fs.writeFileSync(debugScript, fs.readFileSync(debugScript, 'utf-8').replace(/configuration Debug/, 'configuration Release').replace(/i386/g,'armv7').replace(/SDK=`.*`/, 'SDK="iphoneos6.0"'), 'utf-8');
    var debug = 'cd ' + output + ' && ./cordova/debug';
    var compile = shell.exec(debug, {silent:true});
    if (compile.code > 0) throw ('Failed to compile iOS application. ' + compile.output);

    // get list of connected devices
    console.log('Getting list of devices for iOS.');
    var devices = [],
        bundle = path.join(output, 'build', 'cordovaExample.app'),
        bundleId = 'org.apache.cordova.example';
    cp.exec('./node_modules/fruitstrap/listdevices --timeout 1 list-devices', function(err, stdout, stderr) {
        if (stdout) {
            var lines = stdout.split('\n');
            devices = lines.filter(function(l) {
                return (l.length > 0 && (l.indexOf('Waiting') == -1 && l.indexOf('found') == -1 && l.indexOf('Timed out') == -1));
            });
            console.log('Devices detected: ' + devices.join(', '));
            deploy(devices, bundle, bundleId);
        }
    });
}
