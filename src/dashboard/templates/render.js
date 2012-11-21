// html template for the dashboard
var html = '<html><head></head><body><h1>ghetto cordova dashboard</h1>';
html    += '<h2>cordova-android</h2>';
html    += '{android}';
html    += '<h2>cordova-ios</h2>';
html    += '{ios}';
html    += '<h2>cordova-blackberry-webworks</h2>';
html    += '{blackberry}';
html    += '</body></html>';

function create_results_table(sha_list, result) {
    var data = {
        'android':null,
        'ios':null,
        'blackberry':null
    };
    for (var lib in sha_list) if (sha_list.hasOwnProperty(lib)) {
        var platform = lib.substr(18);
        if (platform.indexOf('-') > -1) platform = platform.substring(0, platform.indexOf('-'));
        var platform_table = '<table><tr><td>commit</td><td>test results</td></tr>';
        var recent_shas = sha_list[lib];
        if (recent_shas) {
            recent_shas.forEach(function(sha) {
                platform_table += '<tr><td><a href="http://git-wip-us.apache.org/repos/asf?p=' + lib + '.git;a=commit;h='+sha+'">' + sha.substring(0,7)  + '</a></td><td>';
                if (result && result[platform] && result[platform][sha]) {
                    if (result[platform][sha].failure) {
                        platform_table += '<a href="#" style="color:red" onclick="alert(\'' + result[platform][sha].details.replace(/'/g, "\\'").replace(/\n/g,'\\n') + '\');return false;">' + result[platform][sha].failure + '</a>';
                    } else {
                        var versions = result[platform][sha];
                        var result_table = '<p>mobile-spec result</p><table><tr><td>version</td><td>model/name</td><td>result</td></tr>';
                        for (var version in versions) if (versions.hasOwnProperty(version)) {
                            var models = versions[version];
                            if (models.failure) {
                                result_table += '<tr><td>'+version+'</td><td colspan="2"><a href="#" style="color:red" onclick="alert(\''+models.details.replace(/'/g,"\\'").replace(/\n/g, '\\n')+'\');return false;">' + models.failure + '</a></td></tr>';
                            } else {
                                for (var model in models) if (models.hasOwnProperty(model)) {
                                    var results = models[model];
                                    if (results.failure) {
                                        result_table += '<tr><td>'+version+'</td><td>' + model + '</td><td><a href="#" style="color:red" onclick="alert(\''+results.details.replace(/'/g,"\\'").replace(/\n/g, '\\n')+'\');return false;">' + results.failure + '</a></td></tr>';
                                    } else {
                                        var pass = (results.tests - results.num_fails);
                                        var percent = ((pass / results.tests)*100).toFixed(2);
                                        result_table += '<tr><td>' + version + '</td><td>' + model + '</td><td>pass: ' + pass + ', fail: <a href="#" onclick="alert(\'' + results.fails.map(function(f) {return f.spec + '\\n' + f.assertions.map(function(a) {return a.exception + '\\n' + a.trace + '\\n----';}).join('\\n') + '====\\n';}).join('\\n').replace(/'/g,"\\'") + '\');return false;">' + results.num_fails + '</a>, %: ' + percent + '</td></tr>';
                                    }
                                }
                            }
                        }
                        result_table += '</table>';
                        platform_table += result_table;
                    }
                }
                platform_table += '</td></tr>';
            });
        }
        platform_table += '<table>';
        data[platform] = platform_table;
    }
    console.log('[TEMPLATES] Rendered.');
    return data;
}

function interpolate_template(tmpl, object) {
    for (var token in object) if (object.hasOwnProperty(token)) {
        tmpl = tmpl.replace(new RegExp("{" + token + "}", "g"), object[token]);
    }
    return tmpl;
}

module.exports = function renderer(shas, rs) {
    return interpolate_template(html, create_results_table(shas, rs));
};
