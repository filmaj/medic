var shell = require('shelljs'),
    fs    = require('fs'),
    path  = require('path'),
    libs  = require('./libraries');

var libDir = path.join(__dirname, 'lib');
shell.mkdir('-p', libDir);
shell.rm('-rf', path.join(libDir, 'test'));

var contents = fs.readdirSync(libDir);

var command_queue = [];

for (var repo in libs.paths) if (libs.paths.hasOwnProperty(repo) && repo != 'test') (function(lib) {
    if (contents.indexOf(lib) == -1) {
        // Don't have the lib, get it.
        var cmd = 'git clone https://git-wip-us.apache.org/repos/asf/' + lib + '.git ' + path.join(libDir, lib);
    } else {
        // Have the lib, update it.
        var cmd = 'cd ' + path.join(libDir, lib) + ' && git checkout -- . && git pull origin master';
    }
    command_queue.push(cmd);
})(repo);

function go(q, builder, cb) {
    var cmd = q.shift();
    if (cmd) {
        console.log('[BOOTSTRAP] Executing "' + cmd + '"');
        shell.exec(cmd, {silent:true, async:true}, function(code, output) {
            if (code > 0) {
                console.error('Error running previous command! Output to follow.');
                console.error(output);
            } 
            go(q, builder, cb);
        });
    } else {
        // TODO: use the builder.
        console.log('[BOOTSTRAP] Complete.');
        if (cb) cb();
    }
}

function bootstrap(url, builder) {
    this.test_builder = builder;
    if (url) {
        var test_path = path.join(libDir, 'test');
        var cmd;
        if (fs.existsSync(test_path)) {
            cmd = 'cd ' + test_path + ' && git checkout -- . && git pull origin master';
        } else {
            cmd = 'git clone ' + url + ' ' + test_path;
        }
        command_queue.push(cmd);
    }
};

bootstrap.prototype = {
    go:function(callback) {
        go(command_queue, this.test_builder, callback);
    }
};

module.exports = bootstrap;

if(require.main === module) {
    new bootstrap().go();
}
