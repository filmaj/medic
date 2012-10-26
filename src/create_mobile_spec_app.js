var shell = require('shelljs'),
    path  = require('path'),
    config= require('../config'),
    fs    = require('fs');

var mobile_spec = path.join(__dirname, '..', 'lib', 'incubator-cordova-mobile-spec');
var junitReporter = path.join(__dirname, '..', 'src', 'junit-reporter.js');

module.exports = function(output) {
    shell.rm('-Rf', output);
    shell.mkdir('-p', output);
    var tempAll = path.join(output, 'autotest', 'pages', 'all.html');

    // copy entire mobile_spec project to output location
    shell.cp('-Rf', [path.join(mobile_spec, 'autotest'), path.join(mobile_spec, 'cordova.js'), path.join(mobile_spec, 'master.css'), path.join(mobile_spec, 'main.js')], output);

    // copy junit reporter into output location
    shell.cp('-Rf', junitReporter, output);
    
    // get the last SHA for mobile-spec and drop it to the top of the junit reporter
    var sha = shell.exec('cd ' + mobile_spec + ' && git log | head -1', {silent:true}).output.split(' ')[1].replace(/\s/,'');
    var tempJunit = path.join(output, 'junit-reporter.js');
    fs.writeFileSync(tempJunit, "var mobile_spec_sha = '" + sha + "';\n" + fs.readFileSync(tempJunit, 'utf-8'), 'utf-8');

    // replace a few lines under the "all" tests autopage
    fs.writeFileSync(tempAll, fs.readFileSync(tempAll, 'utf-8').replace(/<script type=.text.javascript. src=.\.\..html.TrivialReporter\.js.><.script>/, '<script type="text/javascript" src="../html/TrivialReporter.js"></script><script type="text/javascript" src="../../junit-reporter.js"></script>'), 'utf-8');
    fs.writeFileSync(tempAll, fs.readFileSync(tempAll, 'utf-8').replace(/jasmine.HtmlReporter.../, 'jasmine.HtmlReporter(); var jr = new jasmine.JUnitXmlReporter("' + config.server + ':' + config.port + '");'), 'utf-8');
    fs.writeFileSync(tempAll, fs.readFileSync(tempAll, 'utf-8').replace(/addReporter.htmlReporter../, 'addReporter(htmlReporter);jasmineEnv.addReporter(jr);'), 'utf-8');
    console.log('Mobile Spec HTML app is ready.');
}
