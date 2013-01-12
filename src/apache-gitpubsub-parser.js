// simple stream object to handle apache gitpubsub json events
var Stream    = require('stream').Stream,
    queue     = require('./build/queue'),
    libraries = require('../libraries');

var s = new Stream();
s.writable = true;
s.write = function(data) {
    try {
        var json = data.toString();
        json = json.substr(0,json.length-3); // get rid of trailing comma
        json = JSON.parse(json);
        if (json.stillalive) return true; // if its just a keepalive ping ignore it
        if (json.commit) {
            if (json.commit.project in libraries.paths) {
                var job = {};
                job[json.commit.project] = {
                    sha:json.commit.sha
                };
                queue.push(job);
            }
        }
    } catch(e) {
        console.error('[GITPUBSUB] [ERROR]: ' + e.message);
        console.log('[GITPUBSUB] Continuing.');
    }
    return true;
};

module.exports = s;
