
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
var request       = require('request'),
    apache_parser = require('../../../apache-gitpubsub-parser');

var apache_url = "http://urd.zones.apache.org:2069/json";

module.exports = function(callback) {
    var gitpubsub = request.get(apache_url);
    gitpubsub.pipe(new apache_parser(function(project, sha, ref) {
        if (project.indexOf('mobile-spec') > -1 && ref == 'refs/heads/master') {
            callback(sha);
        }
    }));
};
