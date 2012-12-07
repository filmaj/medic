var shell = require('shelljs'),
    path  = require('path'),
    error_writer=require('./error_writer'),
    n     = require('ncallbacks'),
    fs    = require('fs');

var android_lib = path.join(__dirname, '..', '..', '..', 'lib', 'cordova-android');
var mobile_spec = path.join(__dirname, '..', '..', '..', 'temp', 'mobspec');
var create = path.join(android_lib, 'bin', 'create');

module.exports = function(output, sha, devices, callback) {
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
                        shell.cp('-Rf', path.join(mobile_spec, '*'), path.join(output, 'assets', 'www'));
                        
                        // add the sha to the junit reporter
                        var tempJasmine = path.join(output, 'assets', 'www', 'jasmine-jsreporter.js');
                        fs.writeFileSync(tempJasmine, "var library_sha = '" + sha + "';\n" + fs.readFileSync(tempJasmine, 'utf-8'), 'utf-8');

                        // modify start page
                        var javaFile = path.join(output, 'src', 'org', 'apache', 'cordova', 'example', 'cordovaExample.java'); 
                        fs.writeFileSync(javaFile, fs.readFileSync(javaFile, 'utf-8').replace(/www\/index\.html/, 'www/autotest/pages/all.html'), 'utf-8');
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
                            // get list of connected devices
                            shell.exec('adb devices', {silent:true,async:true},function(code, devices_output) {
                                if (code > 0) {
                                    // Could not obtain device list...
                                    log('Error obtaining device list.');
                                    callback();
                                } else {
                                    try {
                                        var devices = devices_output.split('\n').slice(1);
                                        devices = devices.filter(function(d) { return d.length>0 && d.indexOf('daemon') == -1 && d.indexOf('attached') == -1; });
                                        devices = devices.map(function(d) { return d.split('\t')[0]; });
                                    } catch(e) {
                                        error_writer('android', sha, 'Exception thrown filtering output of `adb devices`.', e.message);
                                        callback(true);
                                        return;
                                    }

                                    // deploy and run on each device
                                    if (devices.length > 0) {
                                        log(devices.length + ' Android devices detected.');
                                        // TODO: set a timeout for deploying to all n devices and if it happens, callback with error.
                                        var end = n(devices.length, callback);
                                        devices.forEach(function(d) {
                                            var cmd = 'adb -s ' + d + ' uninstall org.apache.cordova.example';
                                            var uninstall = shell.exec(cmd, {silent:true,async:true},function(code, uninstall_output) {
                                                // NOTE: if uninstall failed with code > 0, keep going.
                                                log('Installing on device ' + d);
                                                cmd = 'adb -s ' + d + ' install -r ' + path.join(output, 'bin', 'cordovaExample-debug.apk');
                                                var install = shell.exec(cmd, {silent:true,async:true},function(code, install_output) {
                                                    if (code > 0) {
                                                        log('Error installing on device ' + d);
                                                        end();
                                                    } else {
                                                        log('Running on device ' + d);
                                                        cmd = 'adb -s ' + d + ' shell am start -n org.apache.cordova.example/org.apache.cordova.example.cordovaExample';
                                                        var deploy = shell.exec(cmd, {silent:true,async:true},function(code, run_output) {
                                                            if (code > 0) {
                                                                log('Error launching mobile-spec on device ' + d);
                                                            } else {
                                                                log('Mobile-spec successfully launched on device ' + d);
                                                            }
                                                            end();
                                                        });
                                                    }
                                                });
                                            });
                                        });
                                    } else {
                                        log('No Android devices connected. Aborting.');
                                        callback();
                                    }
                                }
                            });
                        }
                    });
                }
            });
        }
    });
}
