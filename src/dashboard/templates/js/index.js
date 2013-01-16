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
function createMaster(platform, data, shas) {
    var container = document.createElement('div');
    container.setAttribute('id', 'container-' + platform);
    var master_container = document.createElement('div');
    master_container.setAttribute('id', 'master-' + platform);
    master_container.setAttribute('style',"min-width: 400px; max-width:1000px; height:200px;");
    container.appendChild(master_container);
    var detail_container = document.createElement('div');
    detail_container.setAttribute('id', 'detail-' + platform);
    container.appendChild(detail_container);
    $('container').appendChild(container);

    charts['cordova-'+platform].master = new Highcharts.Chart({
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
        title:{text:'cordova-' + platform + ' tested commits'},
        xAxis:{
            type:'datetime',
            showLastTickLabel:true,
            maxZoom:24*60*60*1000, //1 day
            plotBands:[{
                id:'mask-before',
                from:data[0][0],
                to:((new Date().getTime()) - 7*24*60*60*1000), // show most recent week by default
                color: 'rgba(0,0,0,0.2)'
            }],
            title:{text:null}
        },
        yAxis:{
            gridLineWidth:0,
            labels:{enabled:true},
            title:{text:'Devices run on'},
            min:0,
            max:10,
            showFirstLabel:false
        },
        tooltip:{
            formatter:function() { 
                var stamp = this.x;
                return '<a href="https://git-wip-us.apache.org/repos/asf?p=cordova-' + platform + '.git;a=commit;h=' + shas[stamp] + '">' + shas[stamp].substr(0,7) + '</a>';
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
        createDetail(masterChart);
    });
}
function createDetail(masterChart) {
    var div = document.createElement('div');
    div.style = "min-width: 400px; max-width:1000px; min-height: 400px;max-height:800px;"
}
function go() {
    XHR("/api/commits/tested", function(err, commits) {
       XHR("/api/results", function(err, results) {
           libraries.forEach(function(lib) {
               var platform = lib.substr(8);
               var data = [];
               var shas = {};
               for (var i = commits[lib].shas.length-1; i >= 0; i--) {
                   var sha = commits[lib].shas[i];
                   var stamp = parseInt(commits[lib].dates[i],10) * 1000;
                   shas[stamp] = sha;
                   var rs = results[platform][sha];
                   console.log(platform, sha, rs);
                   var num_devices = 0;
                   for (var version in rs) if (rs.hasOwnProperty(version)) {
                       var models = rs[version];
                       for (var model in models) if (models.hasOwnProperty(model)) {
                           num_devices++;
                       }
                   }
                   data.push([stamp,num_devices]);
               }
               createMaster(platform, data, shas);
           });
       });
    });
}
