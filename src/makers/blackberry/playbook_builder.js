var config = require('../../../config'),
    path = require('path'),
    error_writer = require('../error_writer'),
    shell = require('shelljs'),
    fs = require('fs');

var sdk = config.blackberry.tablet.sdk;
var device_password = config.blackberry.devices.password;
var signing_password = config.blackberry.tablet.signingPassword;

var deploy = path.join(sdk, 'blackberry-tablet-sdk', 'bin', 'blackberry-deploy');

var app = path.join(__dirname, '..', '..', '..', 'temp', 'blackberry', 'playbook');
var binary = path.join(app, 'build', 'cordovaExample.bar');

var project_properties = path.join(app, 'project.properties');

module.exports = function playbook_builder(tablets, sha) {
    function log(msg) {
        console.log('[BLACKBERRY] [BUILDER:Tablet] ' + msg + ' (' + sha.substr(0,7) + ')');
    }

    // modify project properties with relevant info
    var props = fs.readFile(project_properties, 'utf-8', function(err, props) {
        if (err) throw ('Could not read BlackBerry project file at ' + project_properties);
        props = props.replace(/playbook\.bbwp\.dir=.*\n/, 'playbook.bbwp.dir='+ sdk + '\n');
        props = props.replace(/playbook\.sigtool\.csk\.password=.*\n/, 'playbook.sigtool.csk.password=' + signing_password + '\n');
        props = props.replace(/playbook\.sigtool\.p12\.password=.*\n/, 'playbook.sigtool.p12.password=' + signing_password + '\n');
        fs.writeFile(project_properties, props, 'utf-8', function(er) {
            if (er) throw ('Could not write BlackBerry project file at ' + project_properties);
            
            // compile
            var cmd = 'cd ' + app + ' && ant playbook build';
            log('Compiling + packaging.');
            shell.exec(cmd, {silent:true,async:true}, function(code, output) {
                if (code > 0) {
                    error_writer('blackberry', sha, 'Compilation error.', output);
                } else {
                    // deploy and launch to tablets
                    if (tablets) for (var i in tablets) if (tablets.hasOwnProperty(i)) (function(ip) {
                        var tablet = tablets[ip];
                        log('Installing and running on ' + tablet.hardware + ' (' + ip + ').');
                        shell.exec(deploy + ' -installApp -launchApp -device ' + ip + ' -password ' + device_password + ' ' + binary, {silent:true,async:true}, function(kode, ootput) {
                            if (kode > 0) {
                                error_writer('blackberry', sha, tablet.version, tablet.hardware, 'Deployment error.', ootput);
                            } else {
                                log('Mobile-spec successfully launched on ' + tablet.hardware + ' (' + ip + ').');
                            }
                        });
                    }(i));
                }
            });
        });
    });
};
