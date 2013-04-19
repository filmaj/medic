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

var http                   = require('http'),
    url                    = require('url'),
    fs                     = require('fs'),
    path                   = require('path'),
    mime                   = require('mime'),
    config                 = require('./config'),
    templates              = require('./src/dashboard/templates'),
    api                    = require('./src/dashboard/api'),
    commits                = require('./src/build/commit_list'),
    bootstrap              = require('./bootstrap'),
    mail                   = require('./src/dashboard/mail'),
    ejs                    = require('ejs');

var boot_start = new Date().getTime();

// Different way of doing routes :P
function not_found(res, msg) {
    res.writeHead(404, {
        "Content-Type":"application/json"
    });
    var json = {
        error:true,
        message:msg
    };
    res.write(JSON.stringify(json), 'utf-8');
    res.end();
}
function routeApi(resource) {
    return function(req, res) {
        try {
            var queries = url.parse(req.url, true).query;
            var json = api[resource];

            if (queries.platform) {
                json = json[queries.platform];
                if (!json) {
                    not_found(res, 'platform "' + queries.platform + '" not found.');
                    return;
                }
            }
            if (queries.sha) {
                json = json[queries.sha];
                if (!json) {
                    not_found(res, 'sha "' + queries.sha + '" on platform "' + queries.platform + '" not found.');
                    return;
                }
            }
            res.writeHead(200, {
                "Content-Type":"application/json"
            });
            // console.log('[HTTP] request ' + resource + ", result: " + JSON.stringify(json));
            res.write(JSON.stringify(json), 'utf-8');
            res.end();
        } catch(e) {
            res.writeHead(500, {
                "Content-Type":"application/json"
            });
            var json = {
                error:true,
                message:e.message
            };
            res.write(JSON.stringify(json), 'utf-8');
            res.end();
        }
    };
}

var routes = {
    "":function(req, res) {
        // Homepage
        res.writeHead(200);
        var html = templates.html();
        res.write(html ? html : '<h1>not yet</h1>', 'utf-8');
        res.end();
    },
    "api/results":routeApi('results'),
    "api/errors":routeApi('errors'),
    "api/commits/recent":routeApi('commits'),
    "api/commits/tested":routeApi('tested_shas'),
    "result": showTestResult
};

function showTestResult(req, res){
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;
    var platform = query.p;
    var sha = query.s;
    var result = {
        sha: api.results[platform][sha],
        platform_value: platform,
        sha_value: sha
    };

    fs.readFile(path.resolve(__dirname, 'src/dashboard/templates/test_result_detail.ejs'), 'utf-8', function(err, data) {
        if(!err) {

            // make time human readable
            // testResult.doc.human_time = commits.iso_date_for( testResult.doc.platform, testResult.doc.sha );
            // var commitMessage = commits.commit_message_for(testResult.doc.platform, testResult.doc.sha);
            // testResult.doc.commitMessage = commitMessage;
            // console.log('commit message ' + testResult.doc.sha + " :" + commitMessage);

            templateString = data;
            renderedHtml = ejs.render( templateString, {'result' : result} );

            res.write(renderedHtml);
            res.end();
            
        }else{
            console.log('Error!', err);
        }
    });    
}

// cache local static content in memory (in memory? k)
['js', 'img', 'css'].forEach(function(media) {
    var dir = path.join(__dirname, 'src', 'dashboard', 'templates', media);
    fs.readdirSync(dir).forEach(function(m) {
        var file_path = path.join(dir, m);
        var contents = fs.readFileSync(file_path);
        var type = mime.lookup(file_path);
        routes[media + "/" + m] = function(req, res) {
            res.setHeader('Content-Type', type);
            res.writeHead(200);
            res.write(contents);
            res.end();
        }
    });
});

http.createServer(function (req, res) {
    var method = req.method.toLowerCase();

    // Get rid of leading and trailing / if exists
    var route = url.parse(req.url).pathname.substr(1);
    if (route[route.length-1] == '/') route = route.substr(0, route.length-1);

    if (method == 'get' && route in routes) {
        routes[route](req,res);
    } else {
        res.writeHead(404);
        res.write('<h1>not found!</h1>', 'utf-8');
        res.end();
    }
}).listen(config.dashboard.port);

function email(todayResults){
    fs.readFile(path.resolve(__dirname, 'src/dashboard/templates/summary_email.ejs'), 'utf-8', function(err, data) {
        if(!err) {

            templateString = data;
            renderedHtml = ejs.render( templateString, {'result' : todayResults} );
            var today = new Date().toDateString();

            var mailOptions = {
                from: "Medic<medic@asial.co.jp>", // sender address
                to: "spla-dev@asial.co.jp", // list of receivers
                subject: "Monaca Test Summary for " + today, // Subject line
                html: renderedHtml
            };

            mail(mailOptions, function(err, response){
                if(err){
                    console.log('WTF Cant email you the test report! Sorry.', err);
                }
            });
        }else{
            console.log('Error!', err);
        }
    });
}

function summary(){
    var results = api.results;
    var todayResults = {};
    for(var platform in results) if (results.hasOwnProperty(platform)){
        todayResults[platform] = {};

        var commits_since_last_night = commits.since_last_night(platform);

        if(results[platform]){
            commits_since_last_night.forEach(function(sha){
                todayResults[platform][sha] = {};
                if(results[platform][sha]){
                   todayResults[platform][sha].versions = results[platform][sha];
                }else{
                    todayResults[platform][sha].versions = {};
                    console.log('[DASHBOARD] Warning! no test result for ' + sha);
                }
                todayResults[platform][sha].commitMessage = commits.commit_message_for(platform, sha);
                todayResults[platform][sha].commitDate = commits.iso_date_for(platform, sha).substr(0, 16);
                
            // var commitMessage = 
            });
        }
    }
    email(todayResults);
}

setTimeout(function() {
    console.log('[BOOT] Cloning necessary git repos (bootstrap).');
    new bootstrap().go(function() {
        console.log('[BOOT] Retrieving results from couch...');
        api.boot(function() {
            var boot_end = new Date().getTime();
            var diff = (boot_end - boot_start)/1000;
            console.log('[BOOT] Finished in ' + diff + ' seconds. READY TO ROCK!');
        });
    });
}, 3000);

function getMillisUntil12_30() {
    var midnight = new Date();
    midnight.setHours( 24 );
    midnight.setMinutes( 0 );
    midnight.setSeconds( 0 );
    midnight.setMilliseconds( 0 );
    return midnight.getTime() - Date.now() ;
}

var untilMidnight = getMillisUntil12_30();
console.log('until midnight ', untilMidnight);

function doNightlyTestReport(){
    console.log('[12:00] time to send report!');
    new bootstrap().go(function() {
	console.log('[BOOT] Retrieving results from couch...');
	api.boot(function() {
	    var boot_end = new Date().getTime();
	    var diff = (boot_end - boot_start)/1000;
	    console.log('[BOOT] Finished in ' + diff + ' seconds. READY TO ROCK!');

	    summary();
	});
    });
}

function startMidNightBuildInterval(){
    doNightlyTestReport();
    setInterval( function(){
        doNightlyTestReport();
    }, 1000 * 60 * 60 * 24);
}


setTimeout(startMidNightBuildInterval, untilMidnight);
