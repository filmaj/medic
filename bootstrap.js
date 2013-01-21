var shell = require('shelljs'),
    fs    = require('fs'),
    path  = require('path'),
    libs  = require('./libraries');

var libDir = path.join(__dirname, 'lib');
shell.mkdir('-p', libDir);

var contents = fs.readdirSync(libDir);

var command_queue = [];

for (var repo in libs.paths) if (libs.paths.hasOwnProperty(repo)) (function(lib) {
    if (contents.indexOf(lib) == -1) {
        // Don't have the lib, get it.
        var cmd = 'git clone https://git-wip-us.apache.org/repos/asf/' + lib + '.git ' + path.join(libDir, lib);
    } else {
        // Have the lib, update it.
        var cmd = 'cd ' + path.join(libDir, lib) + ' && git checkout -- . && git pull origin master';
    }
    command_queue.push(cmd);
})(repo);

function go(q, cb) {
    var cmd = q.shift();
    if (cmd) {
        console.log('[BOOTSTRAP] Executing "' + cmd + '"');
        shell.exec(cmd, {silent:true, async:true}, function(code, output) {
            if (code > 0) {
                console.error('Error running previous command! Output to follow.');
                console.error(output);
            } 
            go(q, cb);
        });
    } else {
        console.log('[BOOTSTRAP] Complete.');
        cb();
    }
}

module.exports = {
    go:function(callback) {
        go(command_queue, callback);
    }
};
