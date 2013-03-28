
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
var path = require('path'),
    shell = require('shelljs');

var shaRegExp = /^[0-9]*\s+([a-z0-9]+)/;
var timeRegExp = /^([0-9]+)\s/;
var libDir = path.join(__dirname, '..', '..', 'lib');

module.exports = {
    recent:function recent(lib, num_commits_to_show) {
        var libPath = path.join(libDir, lib);
        var commitList = shell.exec('cd ' + libPath + ' && git rev-list --all --pretty=oneline --timestamp --max-count=' + num_commits_to_show, {silent:true});
        if (commitList.code > 0) throw ('Failed to get commit list for ' + lib + ' library.');
        var commitArr = commitList.output.split('\n');
        commitArr = commitArr.slice(0, commitArr.length - 1);
        var shaList = commitArr.map(function(c) {
            var res = shaRegExp.exec(c);
            if (res) return res[1];
        });
        var dateList = commitArr.map(function(c) {
            var date = timeRegExp.exec(c);
            if (date) return date[1];
        });
        return {
            shas:shaList,
            dates:dateList
        };
    },
    since:function since(lib, sha) {
        var libPath = path.join(libDir, lib);
        var commitList = shell.exec('cd ' + libPath + ' && git rev-list --timestamp --all', {silent:true});
        if (commitList.code > 0) throw ('Failed to get commit list for ' + lib + ' library.');
        var commitArr = commitList.output.split('\n');
        commitArr = commitArr.slice(0, commitArr.length - 1);
        for (var i = 0, l = commitArr.length; i < l; i++) {
            if (commitArr[i].indexOf(sha) > -1) {
                commitArr = commitArr.slice(0, i+1);
                break;
            }
        }
        var shaList = commitArr.map(function(c) {
            var res = shaRegExp.exec(c);
            if (res) return res[1];
        });
        var dateList = commitArr.map(function(c) {
            var date = timeRegExp.exec(c);
            if (date) return date[1];
        });

        return {
            shas:shaList,
            dates:dateList
        };
    },
    date_for:function date_for(lib, sha) {
        var libPath = path.join(libDir, lib);
        var res = shell.exec('cd ' + libPath + ' && git show -s --format="%at" ' + sha, {silent:true});
        if (res.code > 0) {
            return null;
        } else {
            return res.output.split('\n').join('');
        }
    },
    iso_date_for:function iso_date_for(lib, sha) {
        var libPath = path.join(libDir, lib);
        var res = shell.exec('cd ' + libPath + ' && git show -s --format="%ci" ' + sha, {silent:true});
        if (res.code > 0) {
            return null;
        } else {
            return res.output.split('\n').join('');
        }
    },
    commit_message_for: function commit_message_for(lib, sha) {
        var libPath = path.join(libDir, lib);
        var res = shell.exec('cd ' + libPath + ' && git log --format="%B" -n 1 ' + sha, {silent:true});
        if (res.code > 0) {
            return null;
        } else {
            return res.output.split('\n').join('');
        }
    }
};
