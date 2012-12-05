// final html
var html = '';

// top-level template template for the dashboard
var template = '<html><head></head><body><h1>ghetto cordova dashboard</h1>';
template    += '<div style="position:fixed;margin-left:600px;;max-height:600px;overflow:scroll;"><h3>Errors (click on fail links)</h3><p id="errors"></p></div>';
template    += '<h2>cordova-android</h2>';
template    += '{android}';
template    += '<h2>cordova-ios</h2>';
template    += '{ios}';
template    += '<h2>cordova-blackberry</h2>';
template    += '{blackberry}';
template    += '<script type="text/javascript">var _gaq = _gaq || [];_gaq.push([\'_setAccount\', \'UA-36811541-1\']);_gaq.push([\'_trackPageview\']);(function() {var ga = document.createElement(\'script\'); ga.type = \'text/javascript\'; ga.async = true;ga.src = (\'https:\' == document.location.protocol ? \'https://ssl\' : \'http://www\') + \'.google-analytics.com/ga.js\';var s = document.getElementsByTagName(\'script\')[0]; s.parentNode.insertBefore(ga, s);})();</script>';
template    += '</body></html>';

// template for the commit table
var commit_table_template = '<table id="{platform}"><tr><td>commit</td><td>mobile-spec results</td><td>build errors</td></tr>{rows}</table>';
var commit_row_template = '<tr><td id="{sha}"><a href="http://git-wip-us.apache.org/repos/asf?p=cordova-{platform}.git;a=commit;h={sha}">{shortsha}</a></td><td class="results">{results}</td><td class="errors">{errors}</td></tr>';

// template for the mobspec results
var results_template = '<table><tr><td>version</td><td>model/name</td><td>results</td></tr>{rows}</table>';
var results_row_template = '<tr><td>{version}</td><td>{model}</td><td>{mobspec}</td></tr>';

// template for build errors
var errors_template = '<table><tr><td>message</td><td>details</td></tr>{rows}</table>';
var errors_row_template = '<tr><td>{message></td><td>{details}</td></tr>';

// simple templating
function interpolate_template(tmpl, object) {
    for (var token in object) if (object.hasOwnProperty(token)) {
        tmpl = tmpl.replace(new RegExp("{" + token + "}", "g"), object[token]);
    }
    return tmpl;
}

function create_results_table(sha_list, result, build_errors) {
    var data = {
        'android':null,
        'ios':null,
        'blackberry':null
    };

    for (var lib in sha_list) if (sha_list.hasOwnProperty(lib)) {
        var platform = lib.substr('cordova-'.length);
        var platform_table = commit_table_template;
        var platform_data = {
            platform:platform,
            rows:''
        }

        var recent_shas = sha_list[lib];
        if (recent_shas) {
            var sha_rows = [];
            recent_shas.forEach(function(sha) {
                var sha_template = commit_row_template;
                var sha_data = {
                    platform:platform,
                    sha:sha,
                    shortsha:sha.substr(0,7),
                    results:'',
                    errors:''
                };
                if (result && result[platform] && result[platform][sha]) {
                    // Get Mobile Spec Results
                    var versions = result[platform][sha];
                    var result_table = results_template;
                    var result_rows = [];

                    for (var version in versions) if (versions.hasOwnProperty(version)) {
                        var models = versions[version];
                        for (var model in models) if (models.hasOwnProperty(model)) {
                            var result_row = results_row_template;
                            var result_data = {
                                version:version,
                                model:model,
                                mobspec:''
                            };
                            var results = models[model];
                            var pass = (results.tests - results.num_fails);
                            var percent = ((pass / results.tests)*100).toFixed(2);
                            var error_table = '<div>';
                            for (var i = 0, l = results.fails.length; i < l; i++) {
                                var f = results.fails[i];
                                error_table += '<h4 style=\'text-decoration:underline\'>' + f.spec + '</h4>';
                                for (var j = 0, m = f.assertions.length; j < m; j++) {
                                    var a = f.assertions[j];
                                    error_table += '<b>' + a.exception + '</b>';
                                    if (a.trace && a.trace.length > 0) {
                                        var traces = a.trace.split('\n');
                                        for (var k = 0, n = traces.length; k < n; k++) {
                                            error_table += '<p style=\'font-size:11px\'>';
                                            var t = traces[k].replace(/</g,'').replace(/>/g,'');
                                            error_table += t + '</p>';
                                        }
                                    }
                                }
                            }
                            error_table += '</div>';
                            error_table = error_table.replace(/\n/g,'\\n').replace(/'/g,"\\'").replace(/"/g,"\\'");
                            var show = 'document.getElementById(\'errors\').innerHTML = \'' + error_table + '\';return false;';
                            result_data.mobspec = 'pass: ' + pass + ', fail: <a href="#" onclick="'+show+'">' + results.num_fails + '</a>, %: ' + percent;
                            result_rows.push(interpolate_template(result_row, result_data));
                        }
                    }
                    result_table = interpolate_template(result_table, {
                        rows:result_rows.join('')
                    });
                    sha_data.results = result_table; 
                }

                // get build error results
                if (build_errors[platform] && build_errors[platform][sha])  {
                    var sha_errors = build_errors[platform][sha];
                    var error_table = errors_template;
                    var error_rows = [];
                    sha_errors.forEach(function(doc) {
                        var msg = doc.failure;
                        var deets = doc.details;
                        var err_row_template = errors_row_template;
                        if (doc.model) msg = 'Model: ' + doc.model + ', ' + msg;
                        if (doc.version) msg = 'Version: ' + doc.version + ', ' + msg;
                        error_rows.push(interpolate_template(err_row_template, {
                            message:msg,
                            details:deets
                        }));
                    });
                    sha_data.errors = interpolate_template(error_table, {
                        rows:error_rows.join('')
                    });
                }
                sha_rows.push(interpolate_template(sha_template, sha_data));
            });
            platform_data.rows = sha_rows.join('');
        }
        data[platform] = interpolate_template(platform_table, platform_data);
    }
    console.log('[TEMPLATES] Rendered.');
    return data;
}


module.exports = function render(shas, results, errors) {
    return interpolate_template(template, create_results_table(shas, results, errors));
}
