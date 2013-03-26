
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
    deploy       = require('./forte_ios_framework/deploy'),
    error_writer = require('./error_writer'),
    config       = require('../../../config'),
    libraries    = require('../../../libraries'),
    scan         = require('./cordova-ios/devices'),
    fs           = require('fs');

var keychain_location = config.ios.keychainLocation;
var keychain_password = config.ios.keychainPassword;

var ios_lib = libraries['forte_ios_framework'].path;
var create = path.join(ios_lib, 'bin', 'create');


module.exports = function(output, sha, devices, entry_point, callback) {
    function log(msg) {
        console.log('[MONACA_IOS] ' + msg + ' (sha: ' + sha.substr(0,7) + ')');
    }

    var monaca_framework = path.join(output,'forte_ios_framework');
    var monaca_sandbox_project = path.join(output,'forte_ios_framework', 'MonacaSandbox');

    if (keychain_location.length === 0 || keychain_password.length === 0) {
        log('No keychain information. Fill that shit out in config.json if you want to build for iOS.');
        callback(true);
        return;
    }
    shell.rm('-rf', output);

    shell.exec('cd ' + ios_lib + ' && git checkout ' + sha, {silent:true, async:true}, function(code, checkout_output) {
        if (code > 0) {
            error_writer('forte_ios_framework', sha, 'error git-checking out sha ' + sha, checkout_output);
            callback(true);
        } else {
            // unlock the chain
            var security = shell.exec('security default-keychain -s ' + keychain_location + ' && security unlock-keychain -p ' + keychain_password + ' ' + keychain_location, {silent:true});
            if (security.code > 0) {
                error_writer('forte_ios_framework', sha, 'Could not unlock keychain.', security.output);
                callback(true);
            } else {
                // create an ios app into output dir
                log('./bin/create\'ing.');
                console.log('copying from ' + ios_lib + ' to ' + output);
                shell.cp('-Rf', ios_lib, output);


                log('copy modifed mobile spec html assets from: ' + libraries['test'].output + ' to www/');
                var wwwPath = path.join(monaca_sandbox_project, 'www');
                shell.mkdir('-p', wwwPath);
                shell.cp('-Rf', path.join(libraries['test'].output, '*'), wwwPath);

                log('Inject plugin_loader.js');
                // inject plugin_loader.js to autotest/pages/all.html
                var allHtmlFile = path.join(monaca_sandbox_project, 'www', 'autotest', 'pages', 'all.html');
                fs.writeFileSync(allHtmlFile, fs.readFileSync(allHtmlFile, 'utf-8').replace('../../cordova.js', 'https://stg-ide.monaca.mobi/test/loader.php?os=ios'));

                // add the sha to the junit reporter
                log('add the sha to the junit reporter');
                var tempJasmine = path.join(monaca_sandbox_project, 'www', 'jasmine-jsreporter.js');
                if (fs.existsSync(tempJasmine)) {
                    fs.writeFileSync(tempJasmine, "var library_sha = '" + sha + "';\n" + fs.readFileSync(tempJasmine, 'utf-8'), 'utf-8');

                    // replace platform
                    fs.writeFileSync(tempJasmine, fs.readFileSync(tempJasmine, 'utf-8').replace('(platformMap.hasOwnProperty(p) ? platformMap[p] : p)', "'forte_ios_framework'"));
                }

                console.log('modify start page to :' + entry_point);
                var mFile = path.join(monaca_framework, 'MonacaFramework', 'MFDelegate.m');
                fs.writeFileSync(mFile, fs.readFileSync(mFile, 'utf-8').replace(/index\.html/, entry_point), 'utf-8');

                log('Compiling.');

                var debug = 'cd ' + monaca_framework + ' && xcodebuild -project MonacaFramework.xcodeproj -configuration Debug -target sandbox APP_ID="build.from.Xcode.Jenkins" CODE_SIGN_IDENTITY="iPhone Developer: Masahiro Tanaka (PMFV6A74RJ)" clean build';
                var compile = shell.exec(debug, {silent:true});

                if (compile.code > 0) {
                    error_writer('forte_ios_framework', sha, 'Compilation error.', compile.output);
                    callback(true);
                } else {
                    // get list of connected devices
                    scan(function(err, devices) {
                        if (err) {
                            error_writer('forte_ios_framework', sha, devices, 'No further details dude.');
                            callback(true);
                        } else {
                            var bundle = path.join(monaca_framework, 'build', 'Debug-iphoneos', 'sandbox.app'),
                                bundleId = 'mobi.monaca.sandbox';
                            deploy(sha, devices, bundle, bundleId, callback);
                        }
                    });
                }



                // shell.exec(create + ' ' + output + ' org.apache.cordova.example cordovaExample', {silent:true, async:true}, function(code, ootput) {
                //     if (code > 0) {
                //         error_writer('forte_ios_framework', sha, './bin/create error', ootput);
                //         callback(true);
                //     } else {
                //         try {
                //             var projectWww = path.join(output, 'www');
                            
                //             // copy over html assets
                //             shell.cp('-Rf', path.join(libraries['test'].output, '*'), projectWww);

                //             // drop the iOS library SHA into the junit reporter
                //             // only applies to projects that use it
                //             var tempJasmine = path.join(projectWww, 'jasmine-jsreporter.js');
                //             if (fs.existsSync(tempJasmine)) {
                //                 fs.writeFileSync(tempJasmine, "var library_sha = '" + sha + "';\n" + fs.readFileSync(tempJasmine, 'utf-8'), 'utf-8');
                //                 fs.writeFileSync(tempJasmine, fs.readFileSync(tempJasmine, 'utf-8').replace('(platformMap.hasOwnProperty(p) ? platformMap[p] : p)', "'cordova-ios'"));
                //             }

                //             // modify start page
                //             // 1. old way: modify appdelegate
                //             var mFile = path.join(output, 'cordovaExample', 'Classes', 'AppDelegate.m'); 
                //             fs.writeFileSync(mFile, fs.readFileSync(mFile, 'utf-8').replace(/index\.html/, entry_point), 'utf-8');
                //             // 2. new way: modify config.xml
                //             var configFile = path.join(output, 'cordovaExample', 'config.xml');
                //             fs.writeFileSync(configFile, fs.readFileSync(configFile, 'utf-8').replace(/<content\s*src=".*"/gi, '<content src="'+entry_point+'"'), 'utf-8');

                //             // modify configuration to Release mode, i386 to armv7 and sdk to iphoneos6.0 so we can use it with fruitstrap
                //             // TODO: expose which target sdk to build for
                //             var debugScript = path.join(output, 'cordova', 'build');
                //             fs.writeFileSync(debugScript, fs.readFileSync(debugScript, 'utf-8').replace(/configuration Debug/, 'configuration Release').replace(/i386/g,'armv7').replace(/SDK=`.*`/, 'SDK="iphoneos6.1"'), 'utf-8');

                //             // look at which cordova-<v>.js current lib uses
                //             var cordovajs = path.join(projectWww, 'cordova.js');
                //             if (fs.existsSync(cordovajs)) {
                //                 var version = fs.readFileSync(path.join(ios_lib, 'CordovaLib', 'VERSION'), 'utf-8').replace(/\r?\n/,'');
                //                 fs.writeFileSync(cordovajs, fs.readFileSync(cordovajs, 'utf-8').replace(/var VERSION='.*';/, "var VERSION='" + version + "';"), 'utf-8');
                //             }
                //         } catch(e) {
                //             error_writer('forte_ios_framework', sha, 'Exception thrown modifying mobile spec application for iOS.', e.message);
                //             callback(true);
                //             return;
                //         }

                //         // compile
                //         log('Compiling.');
                        
                //         var debug = 'cd ' + output + ' && ./cordova/build';
                //         var compile = shell.exec(debug, {silent:true});
                //         if (compile.code > 0) {
                //             error_writer('forte_ios_framework', sha, 'Compilation error.', compile.output);
                //             callback(true);
                //         } else {
                //             // get list of connected devices
                //             scan(function(err, devices) {
                //                 if (err) {
                //                     error_writer('forte_ios_framework', sha, devices, 'No further details dude.');
                //                     callback(true);
                //                 } else {
                //                     var bundle = path.join(output, 'build', 'cordovaExample.app'),
                //                         bundleId = 'org.apache.cordova.example';
                //                     deploy(sha, devices, bundle, bundleId, callback);
                //                 }
                //             });
                //         }
                //     }
                // });
            }
        }
    });
}
