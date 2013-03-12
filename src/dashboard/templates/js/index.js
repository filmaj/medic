var libraries = ['forte_android_framework', 'cordova-android','cordova-ios'];
var tested_commits, results;

function $(id) { return document.getElementById(id); }
function XHR(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange=function() {
       if (xhr.readyState==4) {
           if (xhr.status==200) {
               cb(false, JSON.parse(xhr.responseText));
           } else {
               cb(true, xhr);
           }
       }
    };
    xhr.send(null);
}
function popup_close(el) {
    el.parentNode.style.display = 'none';
}
function popup_show(title, html) {
    $('popup_html').innerHTML = html;
    $('popup_title').innerText = title;
    $('popup').style.display = '';
}
function show(id) {
    $(id).style.display = '';
}
function getFailures(results) {
    var fs = [];
    if (results.fails && results.fails.length) {
        fs = fs.concat(results.fails);
    } else {
        for (var sub in results) if (results.hasOwnProperty(sub)) {
            fs = fs.concat(getFailures(results[sub]));
        }
    }
    return fs;
}
function getPercentage(results) {
    if (results.tests) {
        var total = results.tests;
        var failed = results.num_fails;
        return ((total-failed)/total)*100;
    } else {
        var ps = [];
        for (var sub in results) if (results.hasOwnProperty(sub)) {
            ps.push(getPercentage(results[sub]));
        }
        return (ps.reduce(function(a,b) { return a+b; }) / ps.length);
    }
}
function renderDashboardRow(platform, date, lastSha, lastResults, secondSha, secondResults) {
    var colors = Highcharts.getOptions().colors;
    var lib = 'cordova-' + platform;
    // date column
    $(platform + '_commit_date').innerText = date;
    var date_anchor = $(platform + '_last_commit');
    date_anchor.innerText = lastSha.substr(0,7);
    date_anchor.setAttribute('href', 'https://git-wip-us.apache.org/repos/asf?p=' + lib + '.git;a=commit;h=' + lastSha);
    // pass column
    var current_percent = getPercentage(lastResults);
    var last_percent = getPercentage(secondResults);
    var p = $(platform + '_last_percentage');
    p.innerText = current_percent.toFixed(2) + '%';
    var arrow = document.createElement('img');
    var updown = current_percent >= last_percent ? 'up' : 'down';
    arrow.src='/img/' + updown + '.png';
    arrow.alt='Current commit ' + updown + ' from previous (' + last_percent.toFixed(2) + '%)';
    p.appendChild(arrow);
    // pie chart goodness
    var versionData = [];
    var modelData = [];
    var total_devices = 0;
    var version_info = {};
    var v_counter = 0;
    for (var version in lastResults) if (lastResults.hasOwnProperty(version)) {
        var models = lastResults[version];
        var version_devices = 0;
        var model_info = {};
        for (var model in models) if (models.hasOwnProperty(model)) {
            var numbers = models[model];
            total_devices++;
            version_devices++;
            model_info[model] = numbers;
        }
        version_info[version] = {
            num:version_devices,
            details:model_info,
            color:colors[v_counter]
        };
        v_counter++;
    }
    for (var vee in version_info) if (version_info.hasOwnProperty(vee)) (function(v) {
        var y = (version_info[v].num / total_devices)*100;
        versionData.push({
            name:v,
            y:y,
            color:version_info[v].color,
            sha:lastSha,
            mobilespecpercentage:getPercentage(lastResults[v])
        });
        var details = version_info[v].details;
        var model_counter = 0;
        for (var em in details) if (details.hasOwnProperty(em)) (function(m) {
            var y = (1/total_devices)*100;
            var brightness = 0.2 - ((model_counter/total_devices) / 5);
            modelData.push({
                name:m,
                y:y,
                color:(Highcharts.Color(version_info[v].color).brighten(brightness).get()),
                sha:lastSha,
                mobilespecpercentage:getPercentage(lastResults[v][m]),
                events:{
                    click:function() {
                        var fails = getFailures(lastResults[v][m]);
                        var html = '';
                        fails.forEach(function(fail) {
                            html += '<p class="spec">' + fail.spec + '</p>';
                            fail.assertions.forEach(function(assertion) {
                                html += '<code class="exception">' + assertion.exception + '</code>';
                                if (assertion.trace) {
                                    html += '<pre><code>' + assertion.trace + '</code></pre>';
                                }
                            });
                        });
                        popup_show('Failed Assertions for ' + m + ', ' + v, html);
                    }
                }
            });
            model_counter++;
        })(em)
    })(vee);
    var pie = new Highcharts.Chart({
        chart:{
            renderTo:platform + '_last_pie',
            type:'pie'
        },
        title:{text:null},
        tooltip:{
            formatter:function() {
                return this.point.name + '<br/>' + 
                        this.point.mobilespecpercentage.toFixed(2) + '%' + 
                        (this.point.events && this.point.events.click ? '<br/><i style="font-size:9px;">Hint: click to see failures</i>' : ''); 
            }
        },
        plotOptions:{pie:{
            shadow:false
        }},
        series:[{
            name:'Versions',
            data:versionData,
            size:'60%',
            dataLabels:{
                enabled:false
            },
            showInLegend:true
        },{
            name:'Models',
            data:modelData,
            innerSize:'60%'
        }]
    });
}
function go() {
    XHR("/api/commits/recent", function(err, commits) {
        if (err) {
            // if api isnt ready just reload in 5 seconds :P
            setTimeout(function() {
                window.location.reload();
            }, 5000);
        } else {
            for (var repo in commits) if (commits.hasOwnProperty(repo)) (function(lib) {
                var platform = lib;
                if(lib.indexOf('cordova-') === 0){
                    platform = lib.substr('cordova-'.length);
                }
                var most_recent_sha = commits[lib].shas[0];
                var second_recent_sha = commits[lib].shas[1];
                var most_recent_date = moment(parseInt(commits[lib].dates[0])*1000).fromNow();
                XHR("api/results?platform=" + platform + "&sha=" + most_recent_sha, function(err, last_results) {
                    XHR("api/results?platform=" + platform + "&sha=" + second_recent_sha, function(err, second_results) {
                        renderDashboardRow(platform, most_recent_date, most_recent_sha, last_results, second_recent_sha, second_results);
                    });
                });
            }(repo));
        }
    });
    XHR("/api/commits/tested", function(err, commits) {
        tested_commits = commits;
        XHR("/api/results", function(err, res) {
            results = res;
            // render('cordova-ios');
            render('cordova-android');
            render('forte_android_framework');
        });
    });
}
