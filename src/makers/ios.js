var shell = require('shelljs'),
    path  = require('path'),
    cp    = require('child_process'),
    deploy= require('./ios/deploy'),
    error_writer = require('./error_writer'),
    fs    = require('fs');

var ios_lib = path.join(__dirname, '..', '..', 'lib', 'incubator-cordova-ios');
var mobile_spec = path.join(__dirname, '..', '..', 'temp', 'mobspec');
var logspot = path.join(__dirname, '..', '..', 'temp', 'log');
var create = path.join(ios_lib, 'bin', 'create');

module.exports = function(output, sha) {
    function log(msg) {
        console.log('[IOS] ' + msg + ' (' + sha.substr(0,7) + ')');
    }
    shell.rm('-rf', output);

    // create an ios app into output dir
    log('./bin/create\'ing.');
    shell.exec(create + ' ' + output + ' org.apache.cordova.example cordovaExample', {silent:true, async:true}, function(code, ootput) {
        if (code > 0) {
            error_writer('ios', sha, './bin/create error', ootput);
        } else {
            var projectWww = path.join(output, 'www');
            
            // copy over mobile spec modified html assets
            shell.cp('-Rf', path.join(mobile_spec, '*'), projectWww);

            // drop the iOS library SHA into the junit reporter
            var tempJunit = path.join(projectWww, 'junit-reporter.js');
            fs.writeFileSync(tempJunit, "var library_sha = '" + sha + "';\n" + fs.readFileSync(tempJunit, 'utf-8'), 'utf-8');

            // modify start page
            var mFile = path.join(output, 'cordovaExample', 'Classes', 'AppDelegate.m'); 
            fs.writeFileSync(mFile, fs.readFileSync(mFile, 'utf-8').replace(/index\.html/, 'autotest/pages/all.html'), 'utf-8');

            // modify whitelist
            var plist = path.join(output, 'cordovaExample', 'Cordova.plist');
            var contents = fs.readFileSync(plist, 'utf-8');
            var re = /<key>ExternalHosts<\/key>\s*<array\/>/gi;
            fs.writeFileSync(plist, contents.replace(re, '<key>ExternalHosts</key><array><string>*</string></array>'), 'utf-8');

            // modify configuration to Release mode, i386 to armv7 and sdk to iphoneos6.0  so we can use it with fruitstrap
            var debugScript = path.join(output, 'cordova', 'debug');
            fs.writeFileSync(debugScript, fs.readFileSync(debugScript, 'utf-8').replace(/configuration Debug/, 'configuration Release').replace(/i386/g,'armv7').replace(/SDK=`.*`/, 'SDK="iphoneos6.0"'), 'utf-8');

            // compile
            log('Compiling.');
            
            var debug = 'cd ' + output + ' && ./cordova/debug';
            var compile = shell.exec(debug, {silent:true});
            if (compile.code > 0) {
                error_writer('ios', sha, 'Compilation error.', compile.output);
            } else {
                // get list of connected devices
                // TODO: what if this section fails?
                var devices = [],
                    bundle = path.join(output, 'build', 'cordovaExample.app'),
                    bundleId = 'org.apache.cordova.example';
                cp.exec('./node_modules/fruitstrap/listdevices --timeout 1 list-devices', function(err, stdout, stderr) {
                    if (stdout) {
                        var lines = stdout.split('\n');
                        devices = lines.filter(function(l) {
                            return (l.length > 0 && (l.indexOf('Waiting') == -1 && l.indexOf('found') == -1 && l.indexOf('Timed out') == -1));
                        });
                        deploy(sha, devices, bundle, bundleId);
                    }
                });
            }
        }
    });
}
