var config       = require('../../../../config'),
    path         = require('path'),
    error_writer = require('../error_writer'),
    n            = require('ncallbacks'),
    shell        = require('shelljs'),
    fs           = require('fs');

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
    var num_tens = 0;
    for (var i in tens) if (tens.hasOwnProperty(i)) num_tens++;
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
                            var end = n(num_tens, callback); // final callback for all devices deployed to.
                            if (tens) for (var i in tens) if (tens.hasOwnProperty(i)) (function(ip) {
                                var ten = tens[ip];
                                log('Installing and running on ' + ten.model + ' (' + ip + ').');
                                shell.exec(deploy + ' -installApp -launchApp -device ' + ip + ' -password ' + device_password + ' ' + binary, {silent:true,async:true}, function(kode, ootput) {
                                    if (kode > 0) {
                                        error_writer('blackberry', sha, ten.version, ten.model, 'Deployment error.', ootput);
                                        end();
                                    } else {
                                        log('Mobile-spec successfully launched on ' + ten.model + ' (' + ip + ').');
                                        var inner_timer = {};
                                        var timer = setTimeout(function() {
                                            log('Mobile-spec timed out on ' + ten.model + ' (' + ip + ').');
                                            clearTimeout(inner_timer.timer);
                                            inner_timer.timer = false;
                                            //error_writer('blackberry', sha, ten.version, ten.model, 'mobile-spec timed out', 'mobile-spec timed out after 5 minutes');
                                            end();
                                        }, 1000 * 60 * 5);

                                        inner_timer = when_app_finishes(ip, device_password, 'cordovaExample', function(err, message) {
                                            clearTimeout(timer);
                                            if (err) {
                                                // TODO: post an error?
                                                // probalby not.. deployment errors generally the cause here.
                                            } else {
                                                end();
                                            }
                                        });
                                    }
                                });
                            }(i));
                        }
                    });
                }
            });
        });
    });
};

function when_app_finishes(device_ip, device_password, package_name, callback) {
    var to = {timer:null};
    shell.exec(deploy + ' -listInstalledApps -device ' + device_ip + ' -password ' + device_password, {silent:true, async:true}, function(code, output) {
        if (code > 0) {
            console.log('[BLACKBERRY] [BUILDER:OS 10] omfg list installed apps failed on ' + device_ip);
            callback(true, 'listInstalledAps failed: ' + output);
        } else {
            var package_id = output.split('\n').filter(function(l) {return l.indexOf(package_name) === 0})[0];
            package_id = package_id.substr(package_id.indexOf('.') + 1, 27);
            is_app_running(device_ip, device_password, package_name + '.' + package_id, function(err, msg) {
                if (err) {
                    callback(true, 'isAppRunning failed: ' + msg);
                } else {
                    callback(false);
                }
            }, to);
        }
    });
    return to;
}
function is_app_running(device_ip, device_password, package_fullname, callback, timer_object) {
    timer_object.timer = true;
    shell.exec(deploy + ' -isAppRunning -device ' + device_ip + ' -password ' + device_password + ' -package-fullname ' + package_fullname, {silent:true, async:true}, function(code, output) {
        if (code > 0) {
            console.log('[BLACKBERRY] [BUILDER:OS 10] omfg isapprunning failed wtf');
            callback(true, output);
        } else {
            var result = (output.split('\n').filter(function(l) { return l.indexOf('result') === 0})[0].split('::')[1] == 'true');
            if (result) {
                // If app is still running, test again in 5 seconds
                if (timer_object.timer) {
                    timer_object.timer = setTimeout(function() {
                        is_app_running(device_ip, device_password, package_fullname, callback, timer_object);
                    }, 1000 * 5);
                } else {
                }
            } else {
                // Not running anymore!
                callback(false);
            }
        }
    });
}
