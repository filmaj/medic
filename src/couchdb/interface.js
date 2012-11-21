var request = require('request'),
    follow = require('follow'),
    config = require('../../config');

var couch = config.couchdb.host;

function log(msg) {
    console.log('[COUCH] ' + msg);
}

if (couch.length < 4 || couch.indexOf('http') == -1) {
    throw ('Pretty sure your couch config URL is wrong. Here it is wtf man: ' + couch);
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

        var db = this;
        var url = this.db_url + '/' + id;
        request.get(url, function(error, response, body) {
            if (error) db.e('GET ' + url, error, callback);
            else {
                if (response.statusCode == 200) callback(null, JSON.parse(body));
                else if (response.statusCode == 404) db.e('Not found', 404, callback);
                else db.e('GET unexpected status ' + response.statusCode, JSON.parse(body), callback);
            }
        });
    },
    query_view:function(design, view, callback) {
        // Queries a view.
        
        var db = this;
        var url = this.db_url + '/_design/' + design + '/_view/' + view;

        request.get(url, function(error, response, body) {
            if (error) db.e('GET ' + url, error, callback);
            else {
                if (response.statusCode == 200) callback(null, JSON.parse(body));
                else if (response.statusCode == 404) db.e('Not found', 404, callback);
                else db.e('GET unexpected status ' + response.statusCode, JSON.parse(body), callback);
            }
        });
    },
    clobber:function(id, document, callback) {
        // Overwrites a document 
        var db = this;
        var url = this.db_url + '/' + id;
        
        request.put({
            url:url,
            json:document
        }, function(error, response, body) {
            if (error) db.e('PUT ' + url, error, callback);
            else {
                var status = response.statusCode;
                if (status == 201) callback(null, body);
                else if (status == 409) {
                    request.get(url, function(err, resp, bod) {
                        if (err) db.e('GET ' + url, err, callback);
                        else {
                            if (resp.statusCode == 200) {
                                var existing = JSON.parse(bod);
                                var rev = existing._rev;
                                request.del({
                                    url:url + '?rev=' + rev,
                                }, function(er, res, boday) {
                                    if (er) db.e('DELETE ' + url, er, callback);
                                    else {
                                        if (res.statusCode == 200) {
                                            request.put({
                                                url:url,
                                                json:document
                                            }, function(argh, r, bodee) {
                                                if (r.statusCode == 201) callback(null, bodee);
                                                else db.e('RE-PUT unexpected status', r.statusCode, callback);
                                            });
                                        } else db.e('DELETE unexpected status', res.statusCode, callback);
                                    }
                                });
                            } else db.e('GET unexpected status', resp.statusCode, callback);
                        }
                    });
                } else db.e('PUT unexpected status', response.statusCode, callback);
            }
        });
    },
    follow:function(callback) {
        if (!this.is_following) {
            this.is_following = true;
            follow(this.db_url, function(err, change) {
                if (!err) callback(change);
                else callback(err);
            });
            return true;
        } else return false;
    },
    e:function(msg, err, callback) {
        log('[ERROR] DB: ' + this.name + ' ' + msg, err);
        callback(err);
    }
};

module.exports = {
    build_errors:new db('build_errors'),
    mobilespec_results:new db('mobilespec_results'),
    cordova_commits:new db('cordova_commits')
};
