var request = require('request'),
    config = require('../../config');

var couch = config.couchdb.host + '/medic';

function log(msg) {
    console.log('[COUCH] ' + msg);
}

log('Using host ' + couch);

module.exports = {
    clobber:function(sha, document, callback) {
        // Overwrites a sha result

        function e(msg, err) {
            console.error('[COUCH ERROR] ' + msg, err);
            callback({error:true,status:err});
        }

        // Form doc id + url for couch
        var url = couch + '/';
        var doc_id_array = [document.platform, sha]; 
        if (document.version) doc_id_array.push(document.version);
        if (document.model) doc_id_array.push(document.model);
        doc_id_array = doc_id_array.map(encodeURIComponent);
        url += doc_id_array.join('__');
        
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
