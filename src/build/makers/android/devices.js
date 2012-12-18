var shell = require('shelljs'),
    n     = require('ncallbacks');

/*
  device object returned is of the form:
  {
      'id':{
          model:'name',
          version:'version'
      }, ...
  }
 */
module.exports = function(callback) {
    // TODO: perhaps add configuration option to specify android sdk tools location
    shell.exec('adb devices', {silent:true, async:true}, function(code, output) {
        if (code > 0) {
            callback(true, 'Could not obtain device list when running `adb devices`');
        } else {
            try {
                var devices = output.split('\n').slice(1);
                devices = devices.filter(function(d) { return d.length>0 && d.indexOf('daemon') == -1 && d.indexOf('attached') == -1; });
                devices = devices.map(function(d) { return d.split('\t')[0]; });
                var devObj = {};
                var end = n(devices.length, function() {
                    callback(false, devObj);
                });
                devices.forEach(function(id) {
                    var device_info = 'adb -s ' + id + ' shell cat system/build.prop';
                    shell.exec(device_info + ' | grep "model"', {silent:true, async:true}, function(kode, ootput) {
                        if (kode === 0) {
                            var model = ootput.split('=')[1].split('\r').join('').split('\n').join('');
                            shell.exec(device_info + ' | grep "build\.version\.release"', {silent:true, async:true}, function(cowed, putout) {
                                if (cowed === 0) {
                                    var version = putout.split('=')[1].split('\r').join('').split('\n').join('');
                                    devObj[id] = {
                                        model:model,
                                        version:version
                                    };
                                }
                                end();
                            });
                        } else end();
                    });
                });
            } catch(e) {
                callback(true, 'Error filtering output of `adb devices`');
            }
        }
    });
}
