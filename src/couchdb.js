var request = require('request'),
    config = require('../config');

var couch = config.couchdb.host + '/medic';
console.log(couch);

function log(msg) {
    console.log('[COUCH] ' + msg);
}

module.exports = {
    clobber:function(sha, document, callback) {
        function e(msg, err) {
            console.error('[COUCH ERROR] ' + msg, err);
            callback({error:true,status:err});
        }

        // Overwrites a sha result
        var url = couch + '/' + sha;
        request.put({
            url:url,
            json:document
        }, function(error, response, body) {
            if (error)  e('PUT ' + url, error);
            else {
                var status = response.statusCode;
                if (status == 201) callback(body);
                else if (status == 409) {
                    request.get(url, function(err, resp, bod) {
                        if (err) e('GET ' + url, err);
                        else {
                            if (resp.statusCode == 200) {
                                var existing = JSON.parse(bod);
                                var rev = existing._rev;
                                request.delete({
                                    url:url + '?rev=' + rev,
                                }, function(er, res, boday) {
                                    if (er) e('DELETE ' + url, er);
                                    else {
                                        if (res.statusCode == 200) {
                                            request.put({
                                                url:url,
                                                json:document
                                            }, function(argh, r, bodee) {
                                                if (r.statusCode == 201) callback(bodee);
                                                else e('RE-PUT unexpected status', r.statusCode);
                                            });
                                        } else e('DELETE unexpected status', res.statusCode);
                                    }
                                });
                            } else e('GET unexpected status', resp.statusCode);
                        }
                    });
                } else e('PUT unexpected status', response);
            }
        });
    }
};
