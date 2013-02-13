var shell        = require('shelljs'),
    path         = require('path'),
    error_writer = require('./error_writer'),
    n            = require('ncallbacks'),
    libraries    = require('../../../libraries'),
    scan         = require('./android/devices'),
    deploy       = require('./android/deploy'),
    fs           = require('fs');

var android_lib = libraries.paths['cordova-android'];
var mobile_spec = libraries.output.test;
var create = path.join(android_lib, 'bin', 'create');

module.exports = function(output, sha, devices, entry_point, callback) {
    function log(msg) {
        console.log('[ANDROID] ' + msg + ' (sha: ' + sha.substr(0,7) + ')');
    }

    shell.rm('-rf', output);

    // checkout appropriate tag
    shell.exec('cd ' + android_lib + ' && git checkout ' + sha, {silent:true, async:true}, function(code, checkout_output) {
        if (code > 0) {
            error_writer('android', sha, 'error git-checking out sha ' + sha, checkout_output);
            callback(true);
        } else {
            // create an android app into output dir
            log('Creating project.');
            shell.exec(create + ' ' + output, {silent:true,async:true}, function(code, create_out) {
                if (code > 0) {
                    error_writer('android', sha, './bin/create error', create_out);
                    callback(true);
                } else {
                    try {
                        // copy over mobile spec modified html assets
                        log('Modifying Cordova application.');

                        // make sure android app got created first.
                        if (!fs.existsSync(output)) {
                            throw new Error('./bin/create must have failed as output path does not exist.');
                        }
                        shell.cp('-Rf', path.join(mobile_spec, '*'), path.join(output, 'assets', 'www'));
                        
                        // add the sha to the junit reporter
                        var tempJasmine = path.join(output, 'assets', 'www', 'jasmine-jsreporter.js');
                        fs.writeFileSync(tempJasmine, "var library_sha = '" + sha + "';\n" + fs.readFileSync(tempJasmine, 'utf-8'), 'utf-8');

                        // modify start page
                        // 1. old cordova-android: modify the .java file
                        var javaFile = path.join(output, 'src', 'org', 'apache', 'cordova', 'example', 'cordovaExample.java'); 
                        fs.writeFileSync(javaFile, fs.readFileSync(javaFile, 'utf-8').replace(/www\/index\.html/, 'www/' + entry_point), 'utf-8');
                        // 2. new cordova-android: modify the config.xml
                        var configFile = path.join(output, 'res', 'xml', 'config.xml');
                        fs.writeFileSync(configFile, fs.readFileSync(configFile, 'utf-8').replace(/<content\s*src=".*"/gi, '<content src=" ' +entry_point + '"'), 'utf-8');
                        
                        // look at which cordova-<v>.js current lib uses
                        var version = fs.readFileSync(path.join(android_lib, 'VERSION'), 'utf-8').replace(/\r?\n/,'');
                        var cordovajs = path.join(output, 'assets', 'www', 'cordova.js');
                        fs.writeFileSync(cordovajs, fs.readFileSync(cordovajs, 'utf-8').replace(/var VERSION='.*';/, "var VERSION='" + version + "';"), 'utf-8');
                    } catch (e) {
                        error_writer('android', sha, 'Exception thrown modifying Android mobile spec application.', e.message);
                        callback(true);
                        return;
                    }

                    // compile
                    log('Compiling.');
                    var ant = 'cd ' + output + ' && ant clean && ant debug';
                    shell.exec(ant, {silent:true,async:true},function(code, compile_output) {
                        if (code > 0) {
                            error_writer('android', sha, 'Compilation error', compile_output);
                            callback(true);
                        } else {
                            var binary_path = path.join(output, 'bin', 'cordovaExample-debug.apk');
                            var package = 'org.apache.cordova.example';
                            if (devices) {
                                // already have a specific set of devices to deploy to
                                deploy(sha, devices, binary_path, package, callback);
                            } else {
                                // get list of connected devices
                                scan(function(err, devices) {
                                    if (err) {
                                        // Could not obtain device list...
                                        var error_message = devices;
                                        log(error_message);
                                        callback(true);
                                    } else {
                                        deploy(sha, devices, binary_path, package, callback);
                                    }
                                });
                            }
                        }
                    });
                }
            });
        }
    });
}
