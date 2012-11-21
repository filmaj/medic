var config = require('../../../../config'),
    path = require('path'),
    error_writer = require('../error_writer'),
    shell = require('shelljs'),
    fs = require('fs');

var sdk = config.blackberry.bb10.sdk;
var device_password = config.blackberry.devices.password;
var signing_password = config.blackberry.bb10.signingPassword;

var deploy = path.join(sdk, 'dependencies', 'tools', 'bin', 'blackberry-deploy');
var bbwp = path.join(sdk, 'bbwp');

var app = path.join(__dirname, '..', '..', '..', '..', 'temp', 'blackberry', 'bb10');
var build_dir = path.join(app, 'build');
var zip = path.join(build_dir, 'cordovaExample.zip');
var binary = path.join(build_dir, 'device', 'cordovaExample.bar');

// bbwp command to compile packaged widget app
var bbwp_cmd = bbwp + ' ' + zip + ' -o ' + build_dir + ' -d';

var project_properties = path.join(app, 'project.properties');

module.exports = function bbten_builder(tens, sha, callback) {
    function log(msg) {
        console.log('[BLACKBERRY] [BUILDER:OS 10] ' + msg + ' (' + sha.substr(0,7) + ')');
    }

    // modify project properties with relevant info
    var props = fs.readFile(project_properties, 'utf-8', function(err, props) {
        if (err) throw ('Could not read BlackBerry project file at ' + project_properties);
        props = props.replace(/qnx\.bbwp\.dir=.*\n/, 'qnx.bbwp.dir='+ sdk + '\n');
        props = props.replace(/qnx\.sigtool\.password=.*\n/, 'qnx.sigtool.password=' + signing_password + '\n');
        fs.writeFile(project_properties, props, 'utf-8', function(er) {
            if (er) throw ('Could not write BlackBerry project file at ' + project_properties);
            
            // compile
            var cmd = 'cd ' + app + ' && ant qnx package-app';
            log('Packaging app.');
            shell.exec(cmd, {silent:true,async:true}, function(code, output) {
                if (code > 0) {
                    error_writer('blackberry', sha, 'Packaging error.', output);
                    callback();
                } else {
                    // compile using bbwp
                    shell.exec(bbwp_cmd, {silent:true,async:true}, function(cowed, oatpoat) {
                        if (cowed > 0) {
                            error_writer('blackberry', sha, 'bbwp compilation error.', oatpoat);
                            callback();
                        } else {
                            // deploy and launch to bb10s 
                            if (tens) for (var i in tens) if (tens.hasOwnProperty(i)) (function(ip) {
                                var ten = tens[ip];
                                log('Installing and running on ' + ten.hardware + ' (' + ip + ').');
                                shell.exec(deploy + ' -installApp -launchApp -device ' + ip + ' -password ' + device_password + ' ' + binary, {silent:true,async:true}, function(kode, ootput) {
                                    if (kode > 0) {
                                        error_writer('blackberry', sha, ten.version, ten.hardware, 'Deployment error.', ootput);
                                    } else {
                                        log('Mobile-spec successfully launched on ' + ten.hardware + ' (' + ip + ').');
                                    }
                                });
                            }(i));
                            callback();
                        }
                    });
                }
            });
        });
    });
};
