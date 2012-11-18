var path = require('path'),
    shell = require('shelljs'),
    config = require('../../../../config');

// paths, ip ranges and passwords for devices
var range = config.blackberry.devices.networkRange;
var sdk_path = config.blackberry.bb10.sdk || config.blackberry.tablet.sdk;
var password = config.blackberry.devices.password;

// hardware id -> model
var hardware_map = {
    '0x06001a06':{name:'Playbook',tablet:true},
    '0x04002307':{name:'BB 10 Dev Alpha',tablet:false}
};

module.exports = function blackberry_scanner(callback) {
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
                    if (hardware_map.hasOwnProperty(hardware)) hardware = hardware_map[hardware].name;
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
