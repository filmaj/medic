var config = require('../../../config'),
    path = require('path'),
    shell = require('shelljs'),
    fs = require('fs');

var sdk = config.blackberry.tablet.sdk;
var device_password = config.blackberry.devices.password;
var signing_password = config.blackberry.tablet.signingPassword;

var deploy = path.join(sdk, 'blackberry-tablet-sdk', 'bin', 'blackberry-deploy');

var app = path.join(__dirname, '..', '..', '..', 'temp', 'blackberry', 'playbook');

var project_properties = path.join(app, 'project.properties');

function log(msg) {
    console.log('[BLACKBERRY] [BUILDER:Playbook] ' + msg);
}

module.exports = function playbook_builder(tablets) {
    // modify project properties with relevant info
    var props = fs.readFile(project_properties, 'utf-8', function(err, props) {
        if (err) throw ('Could not read BlackBerry project file at ' + project_properties);
        props = props.replace(/playbook\.bbwp\.dir=.*\n/, 'playbook.bbwp.dir='+ sdk + '\n');
        props = props.replace(/playbook\.sigtool\.csk\.password=.*\n/, 'playbook.sigtool.csk.password=' + signing_password + '\n');
        props = props.replace(/playbook\.sigtool\.p12\.password=.*\n/, 'playbook.sigtool.p12.password=' + signing_password + '\n');
        fs.writeFile(project_properties, props, 'utf-8', function(er) {
            if (er) throw ('Could not write BlackBerry project file at ' + project_properties);
            shell.exec('cd ' + app + ' && ant playbook build', {silent:true, async:true}, function(code, output) {
                if (code > 0) {
                    // TODO: need a blackberry/playbook error writer
                } else {
                    if (tablets) for (var i in tablets) if (tablets.hasOwnProperty(i)) (function(ip) {
                        var tablet = tablets[ip];

                    }(i));
                }
            });
        });
    });
};
