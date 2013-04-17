
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
var path         = require('path'),
    shell        = require('shelljs'),
    error_writer = require('../error_writer'),
    cp           = require('child_process');

var root = path.join(__dirname, '..', '..', '..', '..');
var fruitstrap = path.join(root, 'node_modules', 'fruitstrap', 'fruitstrap');
// current fruitstrap dependency has two binaries, uninstall exists under the "listdevices" one
var listdevices = path.join(root, 'node_modules', 'fruitstrap', 'listdevices');

function kill(process, buf, sha, device_id) {
    if (buf.indexOf('>>> DONE <<<') > -1) {
        process.kill();
        return true;
    } else if (buf.indexOf('AMDeviceInstallApplication failed') > -1) {
        // Deployment failed.
        error_writer('ios', sha, 'unknown', device_id, 'Deployment failed.', 'AMDeviceInstallApplication failed');
        process.kill();
        return true;
    }
    return false;
}

function run_through(sha, devices, bundlePath, bundleId, callback) {
    function log(msg) {
        console.log('[MONACA IOS] [DEPLOY] ' + msg + ' (' + sha.substr(0,7) + ')');
    }
    var d = devices.shift();
    if (d) {
        log('Uninstalling app on ' + d);
        var cmd = listdevices + ' uninstall --id=' + d + ' --bundle-id=jp.co.asial.sandbox';
        shell.exec(cmd, {silent:true,async:true}, function(code, output) {
            if (code > 0) log('Uninstall on ' + d + ' failed, continuing anyways.');

            log('NOW Install + deploy on ' + d);
            var args = ['--id=' + d, '--bundle=' + bundlePath, '--debug'];
            var buf = '';
            var fruit = cp.spawn(fruitstrap, args);
            // set up a timeout in case mobile-spec doesnt deploy or run
            var timer = setTimeout(function() {
                fruit.kill();
                log('Mobile-spec timed out on ' + d + ', continuing.');
                // TODO: write out an error if it times out
                run_through(sha, devices, bundlePath, bundleId, callback);
            }, 1000 * 60 * 15);

            // when fruitstrap is done, kill the process and go on to the next device 
            fruit.stdout.on('data', function(stdout) {
                buf += stdout.toString();
                if (kill(fruit, buf, sha, d)) {
                    clearTimeout(timer);
                    run_through(sha, devices, bundlePath, bundleId, callback);
                }
            });
            fruit.stderr.on('data', function(stderr) {
                buf += stderr.toString();
                if (kill(fruit, buf, sha, d)) {
                    clearTimeout(timer);
                    run_through(sha, devices, bundlePath, bundleId, callback);
                }
            });
        });
    } else {
        callback();
    }
}

// deploy and run a specified bundle to specified devices
module.exports = function deploy(sha, devices, bundlePath, bundleId, callback) {
    function log(msg) {
        console.log('[MONACA IOS] [DEPLOY] ' + msg + ' (' + sha.substr(0,7) + ')');
    }
    if (devices.length > 0) {
        log('Devices: ' + devices.join(', '));
        run_through(sha, devices, bundlePath, bundleId, callback);
    } else {
        log('No iOS devices detected.');
        callback();
    }
};

