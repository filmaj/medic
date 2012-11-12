var path = require('path'),
    shell = require('shelljs');

module.exports = function blackberry_scanner(config, callback) {
    var range = config.networkRange;
    var sdk_path = config.bb10Sdk;
    var password = config.password;
    var deploy = path.join(sdk_path, 'dependencies', 'tools', 'bin', 'blackberry-deploy');

    // figure out over what range of ips to scan
    var ips = range.split('-');
    var low = parseInt(ips[0].split('.')[3]);
    var high = parseInt(ips[1].split('.')[3]);
    var base = ips[0].split('.').slice(0,3).join('.');
    var pings = high - low;
    var devices = null;
    for (var i = low; i <= high; i++) {
        (function(last) {
            var ip = base + '.' + last;
            var cmd = deploy + ' -listDeviceInfo ' + ip + ' -password ' + password;
            shell.exec(cmd,{silent:true,async:true},function(code, output) {
                pings--;
                if (code === 0) {
                    var lines = output.split('\n');
                    var version = lines.filter(function(l) { return l.indexOf('scmbundle::') > -1; })[0].split('::')[1];
                    var hardware = lines.filter(function(l) { return l.indexOf('hardwareid::') > -1; })[0].split('::')[1];
                    if (!devices) devices = {};
                    devices[ip] = {
                        hardware:hardware,
                        version:version
                    };
                } 
                if (pings === 0) {
                    callback(devices);
                }
            });
        }(i));
    }
};
