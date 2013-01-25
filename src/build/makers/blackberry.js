var shell        = require('shelljs'),
    path         = require('path'),
    et           = require('elementtree'),
    scan         = require('./blackberry/devices'),
    deploy       = require('./blackberry/deploy'),
    error_writer = require('./error_writer'),
    fs           = require('fs');

var blackberry_lib = path.join(__dirname, '..', '..', '..', 'lib', 'cordova-blackberry');
var mobile_spec = path.join(__dirname, '..', '..', '..', 'temp', 'mobspec');
var create = path.join(blackberry_lib, 'bin', 'create');

module.exports = function(output, sha, devices, callback) {
    function log(msg) {
        console.log('[BLACKBERRY] ' + msg + ' (sha: ' + sha.substr(0,7) + ')');
    }

    shell.rm('-rf', output);

    // checkout appropriate tag
    shell.exec('cd ' + blackberry_lib + ' && git checkout ' + sha, {silent:true, async:true}, function(code, checkout_output) {
        if (code > 0) {
            error_writer('blackberry', sha, 'error git-checking out sha ' + sha, checkout_output);
            callback(true);
        } else {
            // create a blackberry app into output dir
            log('Creating project.');
            shell.exec(create + ' ' + output + ' cordovaExample', {silent:true,async:true}, function(code, create_out) {
                if (code > 0) {
                    error_writer('blackberry', sha, './bin/create error', create_out);
                    callback(true);
                } else {
                    try {
                        // copy over mobile spec modified html assets
                        log('Modifying Cordova application.');
                        shell.cp('-Rf', path.join(mobile_spec, '*'), path.join(output, 'www'));

                        // drop the BlackBerry library SHA into the junit reporter
                        var tempJasmine = path.join(output, 'www', 'jasmine-jsreporter.js');
                        fs.writeFileSync(tempJasmine, "var library_sha = '" + sha + "';\n" + fs.readFileSync(tempJasmine, 'utf-8'), 'utf-8');

                        // TODO: make sure we are using blackberry lib's version in mobile-spec's cordoa.js

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
                    } catch(e) {
                        error_writer('blackberry', sha, 'Exception thrown modifying mobile spec application for BlackBerry.', e.message);
                        callback(true);
                        return;
                    }

                    if (devices) {
                        deploy(sha, devices, callback);
                    } else {
                        log('Scanning for BlackBerry devices.');
                        scan(function(err, devices) {
                            if (err) {
                                // Could not obtain device list...
                                var error_message = devices;
                                log(error_message);
                                callback(true);
                            } else {
                                deploy(sha, devices, callback);
                            }
                        });
                    }
                }
            });
        }
    });
}
