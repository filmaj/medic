var path = require('path'),
    shell = require('shelljs'),
    error_writer = require('../error_writer'),
    cp = require('child_process');

var root = path.join(__dirname, '..', '..', '..', '..');
var fruitstrap = path.join(root, 'node_modules', 'fruitstrap', 'fruitstrap');
// current fruitstrap dependency has two binaries, uninstall exists under the "listdevices" one
var listdevices = path.join(root, 'node_modules', 'fruitstrap', 'listdevices');

function should_we_kill(process, buf, sha, device_id) {
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
        console.log('[IOS] [DEPLOY] ' + msg + ' (' + sha.substr(0,7) + ')');
    }
    var d = devices.shift();
    if (d) {
        log('Uninstalling app on ' + d);
        var cmd = listdevices + ' uninstall --id=' + d + ' --bundle-id=org.apache.cordova.example';
        shell.exec(cmd, {silent:true,async:true}, function(code, output) {
            if (code > 0) log('Uninstall on ' + d + ' failed, continuing anyways.');
            log('Install + deploy on ' + d);
            var args = ['--id=' + d, '--bundle=' + bundlePath, '--debug'];
            var buf = '';
            var fruit = cp.spawn(fruitstrap, args);
            fruit.stdout.on('data', function(stdout) {
                buf += stdout.toString();
                if (should_we_kill(fruit, buf, sha, d)) {
                    run_through(sha, devices, bundlePath, bundleId, callback);
                }
            });
            fruit.stderr.on('data', function(stderr) {
                buf += stderr.toString();
                if (should_we_kill(fruit, buf, sha, d)) {
                    run_through(sha, devices, bundlePath, bundleId, callback);
                }
            });
        });
    } else {
        log('Finished deploying to devices.');
        callback();
    }
}

// deploy and run a specified bundle to specified devices
module.exports = function deploy(sha, devices, bundlePath, bundleId, callback) {
    function log(msg) {
        console.log('[IOS] [DEPLOY] ' + msg + ' (' + sha.substr(0,7) + ')');
    }
    if (devices.length > 0) {
        log('Devices: ' + devices.join(', '));
        run_through(sha, devices, bundlePath, bundleId, callback);
    } else {
        log('No iOS devices detected.');
        callback();
    }
};

