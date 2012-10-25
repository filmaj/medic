var shell = require('shelljs'),
    path  = require('path'),
    config= require('../config'),
    fs    = require('fs');

var mobile-spec = path.join(__dirname, '..', 'lib', 'incubator-cordova-mobile-spec');
var allTests = path.join(mobile-spec, 'autotest', 'pages', 'all.html');
var junitReporter = path.join(__dirname, '..', 'src', 'junit-reporter.js');

module.exports = function(output) {
    // copy entire mobile-spec project to output location
    shell.cp('-Rf', [path.join(mobile-spec, 'autotest'), path.join(mobile-spec, 'cordova.js'), path.join(mobile-spec, 'master.css'), path.join(mobile-spec, 'main.js')], output);

    // copy junit reporter into output location
    shell.cp('-Rf', junitReporter, output);

    // replace a few lines under the "all" tests autopage
    fs.writeFileSync(allTests, fs.readFileSync(allTests, 'utf-8').replace(/<script type=.text.javascript. src=.\.\..html.TrivialReporter\.js.><.script>/, '<script type="text/javascript" src="../html/TrivialReporter.js"></script><script type="text/javascript" src="../../junit-reporter.js"></script>'), 'utf-8');
    fs.writeFileSync(allTests, fs.readFileSync(allTests, 'utf-8').replace(/jasmine.HtmlReporter.../, 'jasmine.HtmlReproter(); var jr = new jasmine.JUnitXmlReporter("' + config.server + ':' + config.port + '");'), 'utf-8');
    fs.writeFileSync(allTests, fs.readFileSync(allTests, 'utf-8').replace(/addReporter.htmlReporter../, 'addReporter(htmlReporter);jasmineEnv.addReporter(jr);'), 'utf-8');
}
