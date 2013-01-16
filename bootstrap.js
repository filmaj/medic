var shell = require('shelljs'),
    fs    = require('fs'),
    path  = require('path'),
    libs  = require('./libraries');

var libDir = path.join(__dirname, 'lib');
shell.mkdir('-p', libDir);

var contents = fs.readdirSync(libDir);

for (var repo in libs.paths) if (libs.paths.hasOwnProperty(repo)) (function(lib) {
    if (contents.indexOf(lib) == -1) {
        // Don't have the lib, get it.
        var cmd = 'git clone https://git-wip-us.apache.org/repos/asf/' + lib + '.git ' + path.join(libDir, lib);
        console.log('Cloning ' + lib + '...');
        shell.exec(cmd, {silent:true, async:true}, function(code, output) {
            if (code > 0) {
                console.error('Error cloning ' + lib + '! Output to follow.');
                console.error(output);
            } else {
                console.log('Done cloning ' + lib);
            }
        });
    } else {
        // Have the lib, update it.
        var cmd = 'cd ' + path.join(libDir, lib) + ' && git checkout -- . && git pull origin master';
        shell.exec(cmd, {silent:true, async:true}, function(code, output) {
            if (code > 0) {
                console.error('Error updating ' + lib + '. Output to follow');
                console.error(output);
            } else {
                console.log('Done updating ' + lib);
            }
        });
    }
})(repo);
