var shell = require('shelljs'),
    path  = require('path'),
    fs    = require('fs');

var libDir = path.join(__dirname, '..', 'lib');

module.exports = function() {
    fs.readdirSync(libDir).forEach(function(lib) {
        lib = path.join(libDir, lib);
        var res = shell.exec('cd ' + lib + ' && git pull origin master', {silent:true});
        if (res.code > 0) throw ('Failed updating ' + lib + '!'); 
    });
}
