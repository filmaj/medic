var child_process = require('child_process');

module.exports = function scan(callback) {
    child_process.exec('./node_modules/fruitstrap/listdevices --timeout 1 list-devices', function(err, stdout, stderr) {
        if (err) {
            callback(true, 'Error executing fruitstrap listdevices: ' + err);
        } else if (stdout) {
            var lines = stdout.split('\n');
            var devices = lines.filter(function(l) {
                return (l.length > 0 && (l.indexOf('Waiting') == -1 && l.indexOf('found') == -1 && l.indexOf('Timed out') == -1));
            });
        } else {
            callback(true, 'Random error, shit happened getting a list of ios devices.');
        }
    });
}
