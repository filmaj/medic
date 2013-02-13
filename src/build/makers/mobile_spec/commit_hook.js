var request       = require('request'),
    apache_parser = require('../../../apache-gitpubsub-parser');

var apache_url = "http://urd.zones.apache.org:2069/json";

module.exports = function(callback) {
    var gitpubsub = request.get(apache_url);
    gitpubsub.pipe(new apache_parser(function(project, sha) {
        if (project.indexOf('mobile-spec') > -1) {
            callback(sha);
        }
    }));
};
