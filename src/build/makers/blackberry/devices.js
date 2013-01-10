var path   = require('path'),
    shell  = require('shelljs'),
    config = require('../../../../config');

// paths, ip ranges and passwords for devices
var ips = config.blackberry.devices.ips;

// depending on what sdks we have installed, the blackberry deploy tool is in different spots
if (config.blackberry.bb10.sdk.length > 0) {
    var deploy = path.join(config.blackberry.bb10.sdk, 'dependencies', 'tools', 'bin', 'blackberry-deploy');
} else {
    var deploy = path.join(config.blackberry.tablet.sdk, 'blackberry-tablet-sdk', 'bin', 'blackberry-deploy');
}
var password = config.blackberry.devices.password;

// hardware id -> model
var hardware_map = {
    '0x06001a06':{name:'Playbook',tablet:true},
    '0x04002307':{name:'BB 10 Dev Alpha',tablet:false},
    '0x04002607':{name:'BB 10 Dev Alpha B',tablet:false}
};

/*
 * device object returned is of the form:
   {
       'ip':{
           model:'name',
           version:'version'
       }, ...
   }
 */

// scan each ip one at a time
function scan(queue, devices, callback) {
    var ip = queue.shift();
    if (ip) {
        var cmd = deploy + ' -listDeviceInfo ' + ip + ' -password ' + password;
        shell.exec(cmd,{silent:true,async:true},function(code, output) {
            // TODO: what if exit code > 0 ?
            if (code === 0) {
                var lines = output.split('\n');
                var version = lines.filter(function(l) { return l.indexOf('scmbundle::') > -1; })[0].split('::')[1];
                var hardware = lines.filter(function(l) { return l.indexOf('hardwareid::') > -1; })[0].split('::')[1];
                if (hardware_map.hasOwnProperty(hardware)) hardware = hardware_map[hardware].name;
                console.log('[BLACKBERRY SCANNER] Found ' + hardware + ' v' + version);
                if (!devices) devices = {};
                devices[ip] = {
                    model:hardware,
                    version:version
                };
            } 
            scan(queue, devices, callback);
        });
    } else {
        callback(false, devices);
    }
}

module.exports = function blackberry_scanner(callback) {
    var q = [];
    var devices = null;

    // figure out over what range of ips to scan
    if (ips instanceof Array) {
        ips.forEach(function(token) {
            if (token.indexOf('-') > -1) {
                // range
                var range = token.split('-');
                var low = parseInt(range[0].split('.')[3]);
                var high = parseInt(range[1].split('.')[3]);
                var base = range[0].split('.').slice(0,3).join('.');
                for (var i = low; i <= high; i++) {
                    var ip = base + '.' + i;
                    q.push(ip);
                }
            } else {
                // single ip
                q.push(token);
            }
        });
    }
    scan(q, devices, callback);
};
