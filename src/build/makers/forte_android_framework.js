
/*
Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
var shell        = require('shelljs'),
    path         = require('path'),
    error_writer = require('./error_writer'),
    n            = require('ncallbacks'),
    libraries    = require('../../../libraries'),
    scan         = require('./forte_android_framework/devices'),
    deploy       = require('./forte_android_framework/deploy'),
    fs           = require('fs');

//var android_lib = libraries.paths['cordova-android'];
var android_lib = libraries['forte_android_framework'].path;
var create = path.join(android_lib, 'bin', 'create');

module.exports = function(output, sha, devices, entry_point, callback) {
    function log(msg) {
        console.log('[MONACA_FRAMEWORK] ' + msg + ' (sha: ' + sha.substr(0,7) + ')');
    }

    var monaca_framework = path.join(output,'forte_android_framework');
    var monaca_framework_project = path.join(output,'forte_android_framework', 'MonacaFramework');

    console.log('removing output folder:', output);
    shell.rm('-rf', output);

    // checkout appropriate tag
    // TODO: remove hardcode sha
    // sha = 'feature/medic';
    shell.exec('cd ' + android_lib + ' && git checkout ' + sha, {silent:true, async:true}, function(code, checkout_output) {
        if (code > 0) {
            error_writer('android', sha, 'error git-checking out sha ' + sha, checkout_output);
            callback(true);
        } else {
            // create an android app into output dir
            log('Creating project.');

            shell.cp('-Rf', android_lib, output);

            log('copy modifed mobile spec html assets from: ' + libraries['test'].output + ' to assets/www/');
            var wwwPath = path.join(monaca_framework_project, 'assets', 'www');
            shell.mkdir('-p', wwwPath);
            shell.cp('-Rf', path.join(libraries['test'].output, '*'), wwwPath);

            log('Inject plugin_loader.js');
            // inject plugin_loader.js to autotest/pages/all.html
            var allHtmlFile = path.join(monaca_framework_project, 'assets', 'www', 'autotest', 'pages', 'all.html');
            fs.writeFileSync(allHtmlFile, fs.readFileSync(allHtmlFile, 'utf-8').replace('../../cordova.js', 'https://stg-ide.monaca.mobi/test/loader.php?os=android'));

            // add the sha to the junit reporter
            log('add the sha to the junit reporter');
            var tempJasmine = path.join(monaca_framework_project, 'assets', 'www', 'jasmine-jsreporter.js');
            if (fs.existsSync(tempJasmine)) {
                fs.writeFileSync(tempJasmine, "var library_sha = '" + sha + "';\n" + fs.readFileSync(tempJasmine, 'utf-8'), 'utf-8');

                // replace platform
                fs.writeFileSync(tempJasmine, fs.readFileSync(tempJasmine, 'utf-8').replace('(platformMap.hasOwnProperty(p) ? platformMap[p] : p)', "'forte_android_framework'"));
            }

            // modify start page
            // 1. old cordova-android: modify the .java file
            log('modify start page');
            var javaFile = path.join(monaca_framework_project, 'src', 'mobi', 'monaca', 'framework', 'MonacaPageActivity.java');
            fs.writeFileSync(javaFile, fs.readFileSync(javaFile, 'utf-8').replace(': "file:///android_asset/www/index.html"', ': "file:///android_asset/www/' + entry_point + '"'), 'utf-8');

            // convert libray project to normal project
            var projectFile = path.join(monaca_framework_project, 'project.properties');
            fs.writeFileSync(projectFile, fs.readFileSync(projectFile, 'utf-8').replace('android.library=true', ''), 'utf-8');

            // compile
            log('Compiling.');
            log('Update projects properties');
            var cmd = 'cd ' + monaca_framework + ' && android update project -p MonacaUtils && android update project -p cordova-android/framework -t "android-17" && android update project -p BarcodeScannerLibrary && android update project -p MonacaFramework';
            shell.exec(cmd, function(code, android_output){
                if(code > 0){
                    error_writer('android', sha, 'android update projects fail', android_output);
                    callback(true);
                }else{
                    log('Ant clean and debug');
                    var ant = 'cd ' + monaca_framework_project + ' && ant clean && ant debug';
                    shell.exec(ant, {silent:true,async:true},function(code, compile_output) {
                        if (code > 0) {
                            error_writer('android', sha, 'Compilation error', compile_output);
                            callback(true);
                        } else {
                            var binary_path = path.join(monaca_framework_project, 'bin', 'MonacaSplashActivity-debug.apk');
                            var package = 'mobi.monaca.framework';
                            if (devices) {
                                // already have a specific set of devices to deploy to
                                deploy(sha, devices, binary_path, package, callback);
                            } else {
                                // get list of connected devices
                                scan(function(err, devices) {
                                    if (err) {
                                        // Could not obtain device list...
                                        var error_message = devices;
                                        log(error_message);
                                        callback(true);
                                    } else {
                                        deploy(sha, devices, binary_path, package, callback);
                                    }
                                });
                            }
                        }
                    });
                }
            });
        }
    });
}
