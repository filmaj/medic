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
        var commitList = shell.exec('cd ' + libPath + ' && git rev-list --timestamp ' + sha + '^..HEAD', {silent:true});
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
    }
};
