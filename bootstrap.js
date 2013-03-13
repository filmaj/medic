/*
Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var shell = require('shelljs'),
    fs    = require('fs'),
    path  = require('path'),
    libs  = require('./libraries');

var libDir = path.join(__dirname, 'lib');
shell.mkdir('-p', libDir);
shell.rm('-rf', path.join(libDir, 'test'));

var contents = fs.readdirSync(libDir);

var command_queue = [];

for (var i=0; i<libs.platforms.length; i++){
    platform = libs.platforms[i];
    if (contents.indexOf(platform) == -1) {
        // Don't have the lib, get it.
        var cmd = 'git clone ' + libs[platform].git + ' ' + libs[platform].path;
        command_queue.push(cmd);

        cmd = 'cd ' + libs[platform].path + ' && git submodule init && git submodule update';
        command_queue.push(cmd);
    } else {
        // Have the lib, update it.
        var cmd = 'cd ' + path.join(libDir, platform) + ' && git checkout -- . && git checkout master && git fetch --tags';
        command_queue.push(cmd);

        cmd = 'cd ' + libs[platform].path + ' && git submodule init && git submodule update';
        command_queue.push(cmd);
    }
}


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
}

bootstrap.prototype = {
    go:function(callback) {
        go(command_queue, this.test_builder, callback);
    }
};

module.exports = bootstrap;

if(require.main === module) {
    new bootstrap().go();
}
