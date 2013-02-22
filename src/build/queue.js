
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
var events    = require('events'),
    updater   = require('./updater'),
    builder,
    libraries = require('../../libraries');

var q = function(name) {
    this.q = [];
    this.building = false;
    this.name = name;
    // If we're not building when we get something pushed onto the queue, we should start building
    this.on('push', function() {
        this.build();
    });
};

q.prototype.__proto__ = events.EventEmitter.prototype;

q.prototype.push = function(i) {
    var job_desc = '';
    for (var p in i) if (i.hasOwnProperty(p)) job_desc = p;
    var r = this.q.push(i);
    console.log('[QUEUE] [' + this.name + '] SHA ' + i[job_desc].sha.substr(0,7) + (i[job_desc].numDevices?' for ' + i[job_desc].numDevices + ' device(s).':'.') + ' (' + this.q.length + ' jobs in queue)');
    this.emit('push', i);
    return r;
};

q.prototype.build = function() {
    if (this.building) return;

    var job = this.q.shift();
    var self = this;
    if (job) {
        this.building = true;
        console.log('[BUILDER] Starting ' + this.name + ' job.');
        // first should update the necessary libs

        // job can be of the form
        // {'cordova-android':'sha'}, OR
        // {'cordova-android':
        //   {
        //     'sha':'sha',
        //     'devices':['id1','id2']
        //   }
        // }
        updater(job, function() {
            builder(job, function() {
                console.log('[BUILDER] [' + self.name + '] Job complete. (' + self.q.length + ' jobs remaining in queue)');
                self.building = false;
                self.build();
            });
        });
    } else {
        this.building = false;
        console.log('[BUILDER] [' + this.name + '] Job queue emptied. Illin\' chillin\'.');
    }
};

// set up individual queues for each platform
var platform_queue = {};
for (var lib in libraries.paths) if (libraries.paths.hasOwnProperty(lib)) {
    platform_queue[lib] = new q(lib);
}
platform_queue['test'] = new q('Test App');

function queue(app_builder, app_entry_point, static) {
    builder = require('./builder')(app_builder, app_entry_point, static);
}

queue.prototype = {
    push:function(job) {
        var lib = null;
        for (var p in job) if (job.hasOwnProperty(p)) lib = p;
        if (lib && lib in platform_queue) {
            platform_queue[lib].push(job);
        }
    }
};

module.exports = queue;
