var semver           = require('semver'),
    playbook_builder = require('./playbook_builder'),
    n                = require('ncallbacks'),
    config           = require('../../../../config'),
    bbten_builder    = require('./bbten_builder');

var bb10_sdk = config.blackberry.bb10.sdk;
var tablet_sdk = config.blackberry.tablet.sdk;

module.exports = function deploy(sha, devices, callback) {
    function log(msg) {
        console.log('[BLACKBERRY] [DEPLOY] ' + msg + ' (sha: ' + sha.substr(0,7) + ')');
    }
    function done() {
        log('No BlackBerry devices connected. Aborting.');
        callback();
    }
    // determine how many of each device we have
    var tablets = {}, bbtens = {};
    var num_ts = 0, num_bs = 0;
    for (var ip in devices) if (devices.hasOwnProperty(ip)) {
        var device = devices[ip];
        var version = device.version;
        if (semver.satisfies(version.substring(0,version.lastIndexOf('.')), '>=2.0.0 && < 3.0.0')) {
            num_ts++;
            tablets[ip] = device;
        } else {
            num_bs++;
            bbtens[ip] = device;
        }
    }
    log(num_ts + ' Tablets and ' + num_bs + ' BB-10s detected.');
    var counter = (num_bs && bb10_sdk.length > 0 ? 1 : 0) + (num_ts && tablet_sdk.length > 0 ? 1 : 0);
    var end = n(counter, callback);
    // compile as needed, one for bb10, one for tablet
    if (num_bs && bb10_sdk.length > 0) {
        bbten_builder(bbtens, sha, end);
    }
    if (num_ts && tablet_sdk.length > 0) {
        playbook_builder(tablets, sha, end);
    }
};
