var first_ios_commit = {
    sha:'6e60c222f8194bb43de6b52c5ea9ff84cc92e040',
    timestamp:1352505397000
};
var first_android_commit = {
    sha:'538e90f23aaeebe4cc08ad87d17d0ab2dde6185d',
    timestamp:1353515245000
};

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
