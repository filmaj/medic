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
// simple stream object to handle apache gitpubsub json events
var Stream    = require('stream').Stream,
    libraries = require('../libraries');

module.exports = function apache_gitpubsub_parser(callback) {
    var s = new Stream();
    s.writable = true;
    s.write = function(data) {
        try {
            var json = data.toString();
            json = json.substr(0,json.length-3); // get rid of trailing comma
            json = JSON.parse(json);
            if (json.stillalive) return true; // if its just a keepalive ping ignore it
            if (json.commit) {
                // make sure this is a commit for a library we track
                if (json.commit.project in libraries.paths) {
                    callback(json.commit.project, json.commit.sha, json.commit.ref);
                }
            }
        } catch(e) {
            console.error('[GITPUBSUB] [ERROR]: ' + new Date() + ' ' + e.message);
            console.error('[GITPUBSUB] [ERROR] Attempted to parse: ' + json);
        }
        return true;
    };
    return s;
};
