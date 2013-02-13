var shell     = require('shelljs'),
    path      = require('path'),
    libraries = require('../../../libraries'),
    config    = require('../../../config'),
    fs        = require('fs');

var jasmineReporter = path.join(__dirname, 'static', 'jasmine-jsreporter.js');

module.exports = function(output_location, static_path, sha, devices, entry_point, callback) {
    shell.rm('-rf', output_location);
    shell.mkdir('-p', output_location);

    // copy project over
    shell.cp('-rf', path.join(static_path, '*'), output_location);

    /*
    // copy jasmine reporter into output_location location
    shell.cp('-f', jasmineReporter, output_location);
    
    // drop sha to the top of the jasmine reporter
    var tempJasmine = path.join(output_location, 'jasmine-jsreporter.js');
    fs.writeFileSync(tempJasmine, "var mobile_spec_sha = '" + sha + "';\n" + fs.readFileSync(tempJasmine, 'utf-8'), 'utf-8');

    // replace a few lines under the "all" tests autopage
    fs.writeFileSync(tempAll, fs.readFileSync(tempAll, 'utf-8').replace(/<script type=.text.javascript. src=.\.\..html.TrivialReporter\.js.><.script>/, '<script type="text/javascript" src="../html/TrivialReporter.js"></script><script type="text/javascript" src="../../jasmine-jsreporter.js"></script>'), 'utf-8');
    fs.writeFileSync(tempAll, fs.readFileSync(tempAll, 'utf-8').replace(/jasmine.HtmlReporter.../, 'jasmine.HtmlReporter(); var jr = new jasmine.JSReporter("' + config.couchdb.host + '");'), 'utf-8');
    fs.writeFileSync(tempAll, fs.readFileSync(tempAll, 'utf-8').replace(/addReporter.htmlReporter../, 'addReporter(htmlReporter);jasmineEnv.addReporter(jr);'), 'utf-8');
    */
    callback();
}
