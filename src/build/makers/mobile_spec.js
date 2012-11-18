var shell = require('shelljs'),
    path  = require('path'),
    config= require('../../../config'),
    fs    = require('fs');

var mobile_spec = path.join(__dirname, '..', '..', '..', 'lib', 'incubator-cordova-mobile-spec');
var jasmineReporter = path.join(__dirname, 'mobile_spec', 'jasmine-jsreporter.js');
var mobile_spec_out = path.join(__dirname, '..', '..', '..', 'temp', 'mobspec');

module.exports = function() {
    shell.rm('-Rf', mobile_spec_out);
    shell.mkdir('-p', mobile_spec_out);
    var tempAll = path.join(mobile_spec_out, 'autotest', 'pages', 'all.html');

    // copy entire mobile_spec project to mobile_spec_out location
    shell.cp('-Rf', [path.join(mobile_spec, 'autotest'), path.join(mobile_spec, 'cordova.js'), path.join(mobile_spec, 'master.css'), path.join(mobile_spec, 'main.js')], mobile_spec_out);

    // copy jasmine reporter into mobile_spec_out location
    shell.cp('-Rf', jasmineReporter, mobile_spec_out);
    
    // get the last SHA for mobile-spec and drop it to the top of the jasmine reporter
    var sha = shell.exec('cd ' + mobile_spec + ' && git log | head -1', {silent:true}).output.split(' ')[1].replace(/\s/,'');
    var tempJasmine = path.join(mobile_spec_out, 'jasmine-jsreporter.js');
    fs.writeFileSync(tempJasmine, "var mobile_spec_sha = '" + sha + "';\n" + fs.readFileSync(tempJasmine, 'utf-8'), 'utf-8');

    // replace a few lines under the "all" tests autopage
    fs.writeFileSync(tempAll, fs.readFileSync(tempAll, 'utf-8').replace(/<script type=.text.javascript. src=.\.\..html.TrivialReporter\.js.><.script>/, '<script type="text/javascript" src="../html/TrivialReporter.js"></script><script type="text/javascript" src="../../jasmine-jsreporter.js"></script>'), 'utf-8');
    fs.writeFileSync(tempAll, fs.readFileSync(tempAll, 'utf-8').replace(/jasmine.HtmlReporter.../, 'jasmine.HtmlReporter(); var jr = new jasmine.JSReporter("' + config.couchdb.host + '");'), 'utf-8');
    fs.writeFileSync(tempAll, fs.readFileSync(tempAll, 'utf-8').replace(/addReporter.htmlReporter../, 'addReporter(htmlReporter);jasmineEnv.addReporter(jr);'), 'utf-8');
    console.log('[MOBILE-SPEC] HTML app created.');
}
