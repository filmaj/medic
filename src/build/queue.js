var events  = require('events'),
    updater = require('./updater'),
    builder = require('./builder');

var q = function() {
    this.q = [];
    this.building = false;
    // If we're not building when we get something pushed onto the queue, we should start building
    this.on('push', function() {
        this.build();
    });
};

q.prototype.__proto__ = events.EventEmitter.prototype;

q.prototype.push = function(i) {
    var job_desc = '';
    for (var p in i) if (i.hasOwnProperty(p)) job_desc = p;
    console.log('[QUEUE] Queued ' + job_desc + '@' + i[job_desc].sha.substr(0,7) + (i[job_desc].numDevices?' for ' + i[job_desc].numDevices + ' devices.':'.'));
    var r = this.q.push(i);
    this.emit('push', i);
    return r;
};

q.prototype.shift = function() {
    var i = this.q.shift();
    if (i) this.emit('shift',i);
    return i;
};

q.prototype.build = function() {
    if (this.building) return;

    var job = this.q.shift();
    var self = this;
    if (job) {
        this.building = true;
        console.log('[BUILDER] Starting Job');
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
                console.log('[BUILDER] Job complete.');
                self.building = false;
                self.build();
            });
        });
    } else {
        this.building = false;
        console.log('[BUILDER] Job queue emptied. Illin\' chillin\'.');
    }
};

module.exports = new q();
