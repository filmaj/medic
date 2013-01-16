var libraries = ['cordova-android','cordova-ios'];
var charts = {};
libraries.forEach(function(lib) {
    charts[lib] = {
        master:null,
        detail:null
    };
});

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
function createMaster(platform, data, shas, results) {
    var container = document.createElement('div');
    container.setAttribute('id', 'container-' + platform);
    container.setAttribute('style', 'height:555px;position:relative;');
    var master_container = document.createElement('div');
    master_container.setAttribute('id', 'master-' + platform);
    master_container.setAttribute('style',"width: 1000px;height:175px;position:absolute;top:300px;");
    var detail_container = document.createElement('div');
    detail_container.setAttribute('id', 'detail-' + platform);
    detail_container.setAttribute('style', "width:1000px;;height:400px;");
    container.appendChild(detail_container);
    container.appendChild(master_container);
    $('container').appendChild(container);

    charts['cordova-'+platform].master = new Highcharts.Chart({
        chart:{
            renderTo:'master-' + platform,
            reflow:false,
            borderWidth:0,
            backgroundColor:null,
            marginLeft:50,
            marginRight:15,
            zoomType:'x',
            events:{
                selection:function(event) {
                    // Listen to the selection event on the master chart to update the extremes on the detail chart.
                    var extremes = event.xAxis;
                    if (!extremes) return;
                    extremes = extremes[0],
                        min = extremes.min,
                        max = extremes.max,
                        detailData = [],
                        xAxis = this.xAxis[0];

                    // look at master chart data to come up with detail chart data
                    this.series[0].data.forEach(function(point) {
                        if (point.x > min && point.x < max) {
                            var stamp = point.x;
                            var sha = shas[stamp];
                            var rs = results[sha];
                            var total_tests = 0;
                            var total_fails = 0;
                            for (var version in rs) if (rs.hasOwnProperty(version)) {
                                var models = rs[version];
                                for (var model in models) if (models.hasOwnProperty(model)) {
                                    var numbers = models[model];
                                    var assertions = numbers.fails;
                                    total_fails += numbers.num_fails;
                                    total_tests += numbers.tests;
                                }
                            }
                            detailData.push({
                                x:stamp,
                                y:total_tests ? ((total_tests - total_fails)/total_tests)*100 : 0
                            });
                        }
                    });

                    // move plot bands
                    xAxis.removePlotBand('mask-before');
                    xAxis.addPlotBand({
                        id: 'mask-before',
                        from:this.series[0].data[0].x,
                        to:min,
                        color:'rgba(0,0,0,0.2)'
                    });
                    xAxis.removePlotBand('mask-after');
                    xAxis.addPlotBand({
                        id:'mask-after',
                        from:max,
                        to:this.series[0].data[this.series[0].data.length-1].x,
                        color:'rgba(0,0,0,0.2)'
                    });

                    charts['cordova-' + platform].detail.series[0].setData(detailData);

                    return false;
                }
            }
        },
        title:{text:'cordova-' + platform + ' tested commits'},
        xAxis:{
            type:'datetime',
            dateTimeLabelFormats:{
                day:'%e/%m/%y',
                hour:''
            },
            showLastTickLabel:true,
            maxZoom:24*60*60*1000, //1 day
            plotBands:[{
                id:'mask-before',
                from:data[0][0],
                to:((new Date().getTime()) - 7*24*60*60*1000), // show most recent week by default
                color: 'rgba(0,0,0,0.2)'
            }, {
                id:'mask-after',
                from:data[0][0],
                to:data[1][0],
                color:'rgba(0,0,0,0.2)'
            }],
            title:{text:null}
        },
        yAxis:{
            gridLineWidth:0,
            labels:{enabled:true},
            title:{text:'Devices run on'},
            min:0,
            showFirstLabel:false
        },
        tooltip:{
            formatter:function() { 
                var stamp = this.x;
                return '<a target="_blank" href="https://git-wip-us.apache.org/repos/asf?p=cordova-' + platform + '.git;a=commit;h=' + shas[stamp] + '">' + shas[stamp].substr(0,7) + '</a>';
            }
        },
        legend:{enabled:false},
        credits:{enabled:false},
        plotOptions:{
            series:{
                fillColor:{
                    linearGradient:[0,0,0,70],
                    stops:[
                        [0, '#4572A7'],
                        [1, 'rgba(0,0,0,0)']
                    ]
                },
                lineWidth:1,
                marker:{enabled:false},
                shadow:false,
                states:{hover:{lineWidth:1}},
                enableMoustTracking:false
            }
        },
        series:[{
            type:'column',
            name:platform + ' Test Results',
            pointInterval:24*60*60*1000,
            pointStart:data[0][0],
            data:data
        }],
        exporting:{enabled:false}
    }, function(masterChart) {
        createDetail(masterChart, platform, shas, results);
    });
}
function createDetail(masterChart, platform, shas, results) {
    // prepare detail chart
    var detailData = [],
        detailStart = ((new Date().getTime()) - 7*24*60*60*1000); // show most recent week by default

    // initial graph
    masterChart.series[0].data.forEach(function(d) {
        if (d.x >= detailStart) {
            var sha = shas[d.x];
            var rs = results[sha];
            if (rs) {
                var total_tests = 0;
                var total_fails = 0;
                for (var version in rs) if (rs.hasOwnProperty(version)) {
                    var models = rs[version];
                    for (var model in models) if (models.hasOwnProperty(model)) {
                        var numbers = models[model];
                        var assertions = numbers.fails;
                        total_tests += numbers.tests;
                        total_fails += numbers.num_fails;
                    }
                }
                detailData.push([d.x, ((total_tests - total_fails)/total_tests)*100]);
            }
        }
    });

    charts['cordova-' + platform].detail = new Highcharts.Chart({
        chart:{
            type:'spline',
            marginBottom:120,
            renderTo:'detail-' + platform,
            reflow:false,
            marginLeft:25,
            marginRight:10,
            style:{position:'absolute'}
        },
        credits:{enabled:false},
        title:{text:platform + ' Avg. Test Pass %'},
        subtitle:{text:'Select an area by dragging across the lower chart'},
        xAxis:{type:'datetime'},
        yAxis:{
            title:{text:null},
            min:90,
            max:100
        },
        tooltip:{
            formatter:function() {
                var point = this.points[0];
                var sha = shas[point.x];
                return '<b>' + point.y.toFixed(2) + '%</b><br/>' + 
                       '<a target="_blank" href="https://git-wip-us.apache.org/repos/asf?p=cordova-' + platform + '.git;a=commit;h=' + sha + '">' + sha.substr(0,7) + '</a>';
            },
            shared:true
        },
        legend:{enabled:false},
        plotOptions:{
            series:{
                cursor:'pointer',
                point:{
                    events:{
                        click:function() {
                        }
                    }
                },
                marker:{
                    radius:3,
                    states:{
                        hover:{
                            enabled:true,
                            radius:5
                        }
                    }
                }
            }
        },
        series:[{
            name: platform + ' mobile-spec results',
            pointStart:detailStart,
            data:detailData
        }],
        exporting:{enabled:false}
    });
}
function go() {
    XHR("/api/commits/tested", function(err, commits) {
       XHR("/api/results", function(err, results) {
           $('load').style.display = 'none';
           libraries.forEach(function(lib) {
               var platform = lib.substr(8);
               var data = [];
               var shas = {};
               for (var i = commits[lib].shas.length-1; i >= 0; i--) {
                   var sha = commits[lib].shas[i];
                   var stamp = parseInt(commits[lib].dates[i],10) * 1000;
                   shas[stamp] = sha;
                   var rs = results[platform][sha];
                   var num_devices = 0;
                   for (var version in rs) if (rs.hasOwnProperty(version)) {
                       var models = rs[version];
                       for (var model in models) if (models.hasOwnProperty(model)) {
                           num_devices++;
                       }
                   }
                   data.push([stamp,num_devices]);
               }
               createMaster(platform, data, shas, results[platform]);
           });
       });
    });
}
