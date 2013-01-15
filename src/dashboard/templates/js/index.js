// holds info on first tracked commit in medic, so we can set baselines for graphing
var info = {
    ios:{
        sha:'6e60c222f8194bb43de6b52c5ea9ff84cc92e040',
        timestamp:1352505397000,
        masterChart:null,
        detailChart:null
    },
    android:{
        sha:'538e90f23aaeebe4cc08ad87d17d0ab2dde6185d',
        timestamp:1353515245,
        masterChart:null,
        detailChart:null
    }
};
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
function createMaster(platform) {
    var container = document.createElement('div');
    container.setAttribute('id', 'container-' + platform);
    var master_container = document.createElement('div');
    master_container.setAttribute('id', 'master-' + platform);
    master_container.style = "min-width: 400px; max-width:1000px; height:100px;"
    container.appendChild(master_container);
    var detail_container = document.createElement('div');
    detail_container.setAttribute('id', 'detail-' + platform);
    container.appendChild(detail_container);
    $('container').appendChild(container);


    data = [];
    info[platform].masterChart = new Highcharts.Chart({
        chart:{
            renderTo:'master-' + platform,
            reflow:false,
            borderWidth:0,
            backgroundColor:null,
            marginLeft:25,
            marginRight:15,
            zoomType:'x',
            events:{
            }
        },
        title:{text:null},
        xAxis:{
            type:'datetime',
            showLastTickLabel:true,
            maxZoom:24*60*60*1000, //1 day
            plotBands:[{
                id:'mask-before',
                from:info[platform].timestamp,
                to:((new Date().getTime()) - 7*24*60*60*1000), // show most recent week by default
                color: 'rgba(0,0,0,0.2)'
            }],
            title:{text:null}
        },
        yAxis:{
            gridLineWidth:0,
            labels:{enabled:false},
            title:{text:null},
            min:80,
            max:100,
            showFirstLabel:false
        },
        tooltip:{
            formatter:function() { return false; }
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
            type:'area',
            name:platform + ' Test Results',
            pointInterval:24*60*60*1000,
            pointStart:info[platform].timestamp,
            data:data
        }],
        exporting:{enabled:false}
    }, function(masterChart) {
        createDetail(masterChart);
    });
}
function createDetail(platform) {
    var div = document.createElement('div');
    div.style = "min-width: 400px; max-width:1000px; min-height: 400px;max-height:800px;"
}
function go() {
    var chart;
    var chart_options = {
       chart:{
           renderTo:"container",
           zoomType:"x"
       },
       title:{
           text: "Test Suite Results"
       },
       xAxis:{
           type: "datetime",
           tickInterval: 24 * 3600000, //1 day
           maxZoom: 2 * 3600000, // 2 hours
       },
       yAxis:{
           title:{
               text:null
           },
           labels:{
               align: 'left',
               x: -3,
               y: 16
           },
           min:75,
           max:100
       },
       series:[{
           name:'Android',
       }, {
           name:'iOS'
       }]
    };
    XHR("/api/commits", function(err, commits) {
       var data = {};
       XHR("/api/results", function(err, results) {
           ['cordova-android', 'cordova-ios'].forEach(function(lib) {
               data[lib] = [];
               var platform = lib.substr(8);
               for (var i = commits[lib].shas.length-1; i >= 0; i--) {
                   var sha = commits[lib].shas[i];
                   var stamp = parseInt(commits[lib].dates[i],10) * 1000;
                   var rs = results[platform][sha];
                   var total_tests = 0;
                   var total_fails = 0;
                   for (var version in rs) if (rs.hasOwnProperty(version)) {
                       var models = rs[version];
                       for (var model in models) if (models.hasOwnProperty(model)) {
                           var numbers = models[model];
                           var fail_objects = numbers.fails;
                           total_fails += parseInt(numbers.num_fails,10);
                           total_tests += parseInt(numbers.tests,10);
                       }
                   }
                   var percent = total_tests ? parseFloat((((total_tests-total_fails)/total_tests)*100).toFixed(3)) : 0;
                   data[lib].push([stamp,percent]);
               }
           });
           chart_options.series[0].data = data['cordova-android'];
           chart_options.series[1].data = data['cordova-ios'];
           chart = new Highcharts.Chart(chart_options);
       });
    });
}
