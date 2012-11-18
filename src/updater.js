var shell = require('shelljs'),
    path  = require('path'),
    templates = require('./templates');

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
        //var res = shell.exec('cd ' + libPath + ' && git checkout -- . && git pull origin master', {silent:true});
        //if (res.code > 0) throw ('Failed git-pull\'ing ' + libPath + '!\n' + res.output); 

        // update the templates with the new sha
        // TODO: this hsouldnt be here anymore
        // TODO: move to dashboard
        templates.update_commit_list(lib);
    }
    console.log('[UPDATER] Libraries (' + counter + ' of \'em) have been updated.');
};
