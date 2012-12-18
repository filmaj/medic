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
            log(count + ' Android(s) detected.');
            // TODO: set a timeout for deploying to all n devices and if it happens, callback with error.
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
                                } else {
                                    log('Mobile-spec successfully launched on device ' + d);
                                }
                                end();
                            });
                        }
                    });
                });
            }(device));
        }
    }
};
