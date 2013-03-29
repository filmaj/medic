
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
var request = require('request'),
    follow = require('follow'),
    config = require('../../config');

var couch = config.couchdb.host;

if (couch.length < 4 || couch.indexOf('http') == -1) {
    throw ('Pretty sure your couch config URL is wrong. Here it is wtf man: ' + couch);
}

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
            if (error) callback(error);
            else {
                if (response.statusCode == 200) callback(false, JSON.parse(body));
                else if (response.statusCode == 404) callback(true, 404);
                else callback(true, response.statusCode);
            }
        });
    },
    query_view:function(design, view, callback) {
        // Queries a view.
        var db = this;
        var url = this.db_url + '/_design/' + design + '/_view/' + view;
        request.get(url, function(error, response, body) {
            if (error) callback(error);
            else {
                if (response.statusCode == 200) callback(false, JSON.parse(body));
                else if (response.statusCode == 404) callback(true, 404);
                else callback(true, response.statusCode);
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
            if (error) callback(error);
            else {
                var status = response.statusCode;
                if (status == 201) callback(false, body);
                else if (status == 409) {
                    request.get(url, function(err, resp, bod) {
                        if (err) callback(err);
                        else {
                            if (resp.statusCode == 200) {
                                var existing = JSON.parse(bod);
                                var rev = existing._rev;
                                request.del({
                                    url:url + '?rev=' + rev,
                                }, function(er, res, boday) {
                                    if (er) callback(er);
                                    else {
                                        if (res.statusCode == 200) {
                                            request.put({
                                                url:url,
                                                json:document
                                            }, function(argh, r, bodee) {
                                                if (argh) callback(argh);
                                                else {
                                                    if (r.statusCode == 201) callback(false, bodee);
                                                    else callback(true, r.statusCode);
                                                }
                                            });
                                        } else callback(true, r.statusCode);
                                    }
                                });
                            } else callback(true, resp.statusCode);
                        }
                    });
                } else callback(true, response.statusCode);
            }
        });
    },
    follow:function(callback) {
        if (!this.is_following) {
            this.is_following = true;
            follow({
                db:this.db_url,
                since:'now',
                include_docs:true
            }, function(err, change) {
                if (!err) callback(false, change);
                else callback(err);
            });
            return true;
        } else return false;
    }
};

module.exports = {
    build_errors:new db('build_errors'),
    mobilespec_results:new db('mobilespec_results')
};
