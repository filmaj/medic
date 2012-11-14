var shell = require('shelljs'),
    path  = require('path'),
    et    = require('elementtree'),
    config= require('../../config'),
    semver= require('semver'),
    scanner=require('./blackberry/blackberry_scanner'),
    playbook_builder = require('./blackberry/playbook_builder'),
    bbten_builder = require('./blackberry/bbten_builder'),
    error_writer=require('./error_writer'),
    fs    = require('fs');

var blackberry_lib = path.join(__dirname, '..', '..', 'lib', 'incubator-cordova-blackberry-webworks');
var mobile_spec = path.join(__dirname, '..', '..', 'temp', 'mobspec');
var create = path.join(blackberry_lib, 'bin', 'create');
var results = path.join(__dirname, '..', '..', 'posts', 'blackberry');

module.exports = function(output, sha) {
    function log(msg) {
        console.log('[BLACKBERRY] ' + msg + ' (sha: ' + sha.substr(0,7) + ')');
    }
    shell.rm('-rf', output);

    var shaDir = path.join(results, sha);

    // checkout appropriate tag
    shell.exec('cd ' + blackberry_lib + ' && git checkout ' + sha, {silent:true, async:true}, function(code, checkout_output) {
        if (code > 0) {
            error_writer('blackberry', sha, 'error git-checking out sha ' + sha, checkout_output);
        } else {
            // create a blackberry app into output dir
            log('Creating project.');
            shell.exec(create + ' ' + output + ' cordovaExample', {silent:true,async:true}, function(code, create_out) {
                if (code > 0) {
                    error_writer('blackberry', sha, './bin/create error', create_out);
                } else {
                    // copy over mobile spec modified html assets
                    log('Modifying Cordova application.');
                    shell.cp('-Rf', path.join(mobile_spec, '*'), path.join(output, 'www'));

                    // drop the BlackBerry library SHA into the junit reporter
                    var tempJunit = path.join(output, 'www', 'junit-reporter.js');
                    fs.writeFileSync(tempJunit, "var library_sha = '" + sha + "';\n" + fs.readFileSync(tempJunit, 'utf-8'), 'utf-8');

                    // modify start page
                    var config_path = path.join(output, 'www', 'config.xml');
                    var doc = new et.ElementTree(et.XML(fs.readFileSync(config_path, 'utf-8')));
                    doc.getroot().find('content').attrib.src = 'autotest/pages/all.html';
                    fs.writeFileSync(config_path, doc.write({indent:4}), 'utf-8');

                    // two copies of the project
                    var playbook_target = path.join(output, '..', 'playbook');
                    var bbten_target = path.join(output, '..', 'bb10');
                    var final_pb = path.join(output, 'playbook');
                    var final_bbten = path.join(output, 'bb10');
                    shell.mv(output, playbook_target);
                    shell.mkdir('-p', bbten_target);
                    shell.cp('-R', path.join(playbook_target, '*'), bbten_target);
                    shell.mkdir('-p', output);
                    shell.mv(playbook_target, final_pb);
                    shell.mv(bbten_target, final_bbten);

                    // scan for devices, figure out which of each kind we have.
                    scanner(config.blackberry, function(devices) {
                        if (devices) {
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
                            // compile as needed, one for bb10, one for tablet
                            if (num_bs) {
                                bbten_builder(bbtens);
                            }
                            if (num_ts) {
                                playbook_builder(tablets);
                            }
                        } else {
                            log('No BlackBerry devices discovered. Aborting.');
                        }
                    });
                }
            });
        }
    });
}
