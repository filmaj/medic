
/*
Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
var n     = require('ncallbacks'),
    shell = require('shelljs'),
    cp    = require('child_process');

module.exports = function deploy(sha, devices, path, id, callback) {
    function log(msg) {
        console.log('[ANDROID] [DEPLOY] ' + msg + ' (' + sha.substr(0,7) + ')');
    }
    function done() {
        log('No Android devices connected. Aborting.');
        callback();
    }
    var count = 0;
    if (devices === undefined || !devices) done();
    else {
        for (var d in devices) if (devices.hasOwnProperty(d)) count++;
        // deploy and run on each device
        if (count === 0) done();
        else {
            log('Target: ' + count + ' Android(s).');
            var end = n(count, callback);
            for (var device in devices) if (devices.hasOwnProperty(device)) (function(d) {
                var cmd = 'adb -s ' + d + ' uninstall ' + id;
                var uninstall = shell.exec(cmd, {silent:true,async:true},function(code, uninstall_output) {
                    // NOTE: if uninstall failed with code > 0, keep going.
                    log('Installing on device ' + d);
                    cmd = 'adb -s ' + d + ' install -r ' + path;
                    var install = shell.exec(cmd, {silent:true,async:true},function(code, install_output) {
                        if (code > 0) {
                            log('Error installing on device ' + d);
                            end();
                        } else {
                            log('Running on device ' + d);
                            cmd = 'adb -s ' + d + ' shell am start -n ' + id + '/' + id + '.cordovaExample';
                            var deploy = shell.exec(cmd, {silent:true,async:true},function(code, run_output) {
                                if (code > 0) {
                                    log('Error launching mobile-spec on device ' + d + ', continuing.');
                                    end();
                                } else {
                                    log('Mobile-spec launched on device ' + d);
                                    // Clear out logcat buffer for specific device
                                    shell.exec('adb -s ' + d + ' logcat -c', {silent:true});
                                    // Wait for mobile-spec to be done.
                                    var logcat = cp.spawn('adb', ['-s', d, 'logcat']);
                                    // set a timeout in case mobile-spec doesnt run to the end 
                                    var timer = setTimeout(function() {
                                        logcat.kill();
                                        log('Mobile-spec timed out on ' + d + ', continuing.');
                                        // TODO: write out an error if it times out
                                        //error_writer('android', sha, 
                                        end();
                                    }, 1000 * 60 * 5);

                                    // >>> DONE <<< gets logged when mobile-spec finished everything
                                    logcat.stdout.on('data', function(stdout) {
                                        var buf = stdout.toString();
                                        if (buf.indexOf('>>> DONE <<<') > -1) {
                                            // kill process and clear timeout
                                            log('Mobile-spec finished on ' + d);
                                            clearTimeout(timer);
                                            logcat.kill();
                                            end();
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            }(device));
        }
    }
};
