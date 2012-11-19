var path = require('path'),
    shell = require('shelljs');

var shaRegExp = /^([a-z0-9]+)\s+/;
var libDir = path.join(__dirname, '..', '..', 'lib');

module.exports = function commit_list(lib, num_commits_to_show) {
    var libPath = path.join(libDir, lib);
    var commitList = shell.exec('cd ' + libPath + ' && git rev-list --all --pretty=oneline --max-count=' + num_commits_to_show, {silent:true});
    if (commitList.code > 0) throw ('Failed to get commit list for ' + lib + ' library.');
    var commitArr = commitList.output.split('\n');
    commitArr = commitArr.slice(0, commitArr.length - 1);
    var shaList = commitArr.map(function(c) {
        var res = shaRegExp.exec(c);
        if (res) return res[1];
    });
    return shaList;
}
