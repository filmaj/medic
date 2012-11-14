var path = require('path'),
    fs   = require('fs'),
    shell= require('shelljs'),
    templates = require('../templates');

var posts = path.join(__dirname, '..', '..', 'posts');

module.exports = function error_writer(platform, sha, failure, details) {
    var shadir = path.join(posts, platform, sha);
    if (arguments.length == 5) {
        var version = failure;
        failure = details;
        details = arguments[4];
        shadir = path.join(shadir, version);
    } else if (arguments.length == 6) {
        var version = failure;
        var model = details;
        failure = arguments[4];
        details = arguments[5];
        shadir = path.join(shadir, version, model);
    }
    shell.mkdir('-p', shadir);
    var filename = path.join(shadir, new Date().valueOf() + '.json');
    var contents = JSON.stringify({
        failure:failure,
        details:details
    });
    fs.writeFile(filename, contents, 'utf-8', function(err) {
        if (err) throw ('Failed to write out error file to ' + filename);
        console.error('[ERROR] [' + platform[0].toUpperCase() + platform.substr(1) + '] (sha: ' + sha.substr(0,7) +')');
        console.error(failure);
        templates.add_build_failure(platform, sha, failure, details);
    });
}
