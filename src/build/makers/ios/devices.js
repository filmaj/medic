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
