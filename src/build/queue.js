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
        console.log('[BUILDER] Starting a job.');
        // first should update the necessary libs
        updater(job, function() {
            builder(job, function() {
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
