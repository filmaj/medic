var request = require('request'),
    follow = require('follow'),
    config = require('../../config');

var couch = config.couchdb.host;

function log(msg) {
    console.log('[COUCH] ' + msg);
}

log('Using host ' + couch);

// Generic interface + convenience functions for working with couch dbs
function db(name) {
    this.name = name;
    this.db_url = couch + '/' + this.name;
    this.is_following = false;
}

db.prototype = {
    get:function(id, callback) {
        // Gets a specific document by id
    },
    query_view:function(design, view, callback) {
        // Queries a view.

        // Some parameter massaging to allow optional key parameter
        if (arguments.length == 4) {
            var key = callback;
            callback = arguments[3];
        }
    },
    clobber:function(id, document, callback) {
        // Overwrites a document 

        function e(msg, err) {
            console.error('[COUCH ERROR] DB: ' + this.name + ' ' + msg, err);
            callback({error:true,status:err});
        }

        var url = this.db_url + '/' + id;
        
        request.put({
            url:url,
            json:document
        }, function(error, response, body) {
            if (error)  e('PUT ' + url, error);
            else {
                var status = response.statusCode;
                if (status == 201) callback(body);
                else if (status == 409) {
                    request.get(url, function(err, resp, bod) {
                        if (err) e('GET ' + url, err);
                        else {
                            if (resp.statusCode == 200) {
                                var existing = JSON.parse(bod);
                                var rev = existing._rev;
                                request.del({
                                    url:url + '?rev=' + rev,
                                }, function(er, res, boday) {
                                    if (er) e('DELETE ' + url, er);
                                    else {
                                        if (res.statusCode == 200) {
                                            request.put({
                                                url:url,
                                                json:document
                                            }, function(argh, r, bodee) {
                                                if (r.statusCode == 201) callback(bodee);
                                                else e('RE-PUT unexpected status', r.statusCode);
                                            });
                                        } else e('DELETE unexpected status', res.statusCode);
                                    }
                                });
                            } else e('GET unexpected status', resp.statusCode);
                        }
                    });
                } else e('PUT unexpected status', response);
            }
        });
    },
    follow:function(callback) {
        if (!this.is_following) {
            this.is_following = true;
            follow(this.db_url, function(err, change) {
                if (!err) callback(change);
            });
            return true;
        } else return false;
    }
};

module.exports = {
    build_errors:new db('build_errors'),
    mobilespec_results:new db('mobilespec_results'),
    cordova_commits:new db('cordova_commits')
};
