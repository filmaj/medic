var request = require('request'),
    couch = require('../couchdb');

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
    couch.clobber(sha, doc, function(resp) {
        if (resp.error) {
            console.error('[COUCH ERROR] Saving ' + sha);
        }
    });
}
