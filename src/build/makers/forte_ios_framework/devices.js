
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
var shell = require('shelljs');

module.exports = function scan(callback) {
    shell.exec('./node_modules/fruitstrap/listdevices --timeout 1 list-devices', {silent:true, async:true}, function(code, output) {
        var lines = output.split('\n');
        var devices = lines.filter(function(l) {
            return (l.length > 0 && (l.indexOf('Waiting') == -1 && l.indexOf('found') == -1 && l.indexOf('Timed out') == -1));
        });
        callback(false, devices);
    });
}
