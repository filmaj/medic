var couch = require('../../couchdb/interface');

/* send error to couch
 * accepts:
 *   error_writer(platform, sha, failure, details)
 *   error_writer(platform, sha, version, failure details);
 *   error_writer(platform, sha, version, model, failure, details);
 */
module.exports = function error_writer(platform, sha, failure, details) {
    // massage args
    var version, model;
    if (arguments.length == 5) {
        version = failure;
        failure = details;
        details = arguments[4];
    } else if (arguments.length == 6) {
        version = failure;
        model = details;
        failure = arguments[4];
        details = arguments[5];
    }

    // generate couch doc
    var doc = {
        sha:sha,
        timestamp:(new Date().getTime() / 1000),
        platform:platform.toLowerCase(),
        failure:failure,
        details:details
    };
    if (version) doc.version = version.toLowerCase();
    if (model) doc.model = model;

    // build error, be noisy
    console.error('[' + platform.toUpperCase() + ' ERROR]: (sha: ' + sha.substr(0,7) +')');
    console.error(failure + '\n' + details);

    // fire off to couch
    var doc_id_array = [doc.platform, sha]; 
    if (version) doc_id_array.push(doc.version);
    if (model) doc_id_array.push(doc.model);
    doc_id_array = doc_id_array.map(encodeURIComponent);
    var doc_id = doc_id_array.join('__');
    couch.build_errors.clobber(doc_id, doc, function(resp) {
        if (resp.error) {
            console.error('[COUCH ERROR] Saving doc with id ' + doc_id);
        }
    });
}
