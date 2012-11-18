// TODO: determine which commits have no results and queue them
module.exports = function process_results(posts) {
    // Identify which commits have test results
    fs.readdir(posts, function(err, platforms) {
        if (err) throw ('Could not read posts directory (' + posts + ')');
        platforms.forEach(function(platform) {
            var resDir = path.join(posts, platform);
            fs.readdir(resDir, function(err, resultsBySha) {
                if (err) throw ('Could not read results lib directory (' + resDir + ')');
                resultsBySha.forEach(function(sha) {
                    var testDir = path.join(resDir, sha);

                    var templates = require('../templates');

                    // recursively read test dirs and grab xml
                    // xml are mobile-spec results
                    var xmlStream = readdirp({
                        root:testDir,
                        fileFilter:'*.xml'
                    }).on('data', function(entry) {
                        var version = entry.path.substr(0, entry.path.indexOf('/'));
                        var model = entry.name.substr(0, entry.name.indexOf('_'));
                        fs.readFile(entry.fullPath, 'utf-8', function(e, data) {
                            if (e) throw ('Could not read result file ' + entry.fullPath);
                            templates.add_mobile_spec_result(platform, sha, version, model, data);
                        });
                    });

                    // recursively grab .json files
                    // these are build/compile/other errors
                    var jsonStream = readdirp({
                        root:testDir,
                        fileFilter:'*.json'
                    }).on('data', function(entry) {
                        // figure out if version + model are in the path tree. if so, these are version/model-specific errors
                        var dir = entry.fullParentDir;
                        var extras = dir.substring(testDir.length);
                        var version = null, model = null;
                        if (extras.length) {
                            extras = extras.substring(1);
                            if (extras.indexOf('/') > -1) {
                                // both version and model
                                var both = extras.split('/');
                                version = both[0];
                                model = both[1];
                            } else {
                                // only version
                                version = extras;
                            }
                        }
                        fs.readFile(entry.fullPath, 'utf-8', function(err, data) {
                            if (err) throw ('Could not read error file ' + entry.fullPath);
                            var json = JSON.parse(data);
                            if (model && version) {
                                templates.add_build_failure(platform, sha, version, model, json.failure, json.details);
                            } else if (version) {
                                templates.add_build_failure(platform, sha, version, json.failure, json.details);
                            } else {
                                templates.add_build_failure(platform, sha, json.failure, json.details);
                            }
                        });
                    });
                });
            });
        });
    });
};
