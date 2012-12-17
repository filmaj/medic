var shell = require('shelljs');

module.exports = function(callback) {
    // TODO: perhaps add configuration option to specify android sdk tools location
    shell.exec('adb devices', {silent:true, async:true}, function(code, output) {
        if (code > 0) {
            callback(true, 'Could not obtain device list when running `adb devices`');
        } else {
            try {
                var devices = output.split('\n').slice(1);
                devices = devices.filter(function(d) { return d.length>0 && d.indexOf('daemon') == -1 && d.indexOf('attached') == -1; });
                devices = devices.map(function(d) { return d.split('\t')[0]; });
                callback(false, devices);
            } catch(e) {
                callback(true, 'Error filtering output of `adb devices`');
            }
        }
    });
}
