var shell = require('shelljs'),
    path  = require('path'),
    fs    = require('fs'),
    templates = require('./templates'),
    create_mobile_spec_app = require('./create_mobile_spec_app');

var libDir = path.join(__dirname, '..', 'lib');

module.exports = function(commits) {
    // commits format:
    // {
    //     incubator-cordova-android:sha
    // }
    var counter = 0;
    for (var lib in commits) if (commits.hasOwnProperty(lib)) {
        console.log('[UPDATER] Grabbing latest for ' + lib);
        counter++;
        
        // shell out to git
        var libPath = path.join(libDir, lib);
        var res = shell.exec('cd ' + libPath + ' && git pull origin master', {silent:true});
        if (res.code > 0) throw ('Failed git-pull\'ing ' + libPath + '!'); 

        // update the templates with the new sha
        templates.update_commit_list(lib);

        // if we are updating mobile-spec, build a fresh medic-compatible html app
        if (lib == 'incubator-cordova-mobile-spec') {
            create_mobile_spec_app();
        }
    }
    console.log('Libraries (' + counter + ' of \'em) have been updated.');
};
