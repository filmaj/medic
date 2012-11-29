/*
  This file is part of the Jasmine JSReporter project from Ivan De Marino.

  Copyright (C) 2011 Ivan De Marino (aka detro, aka detronizator), http://blog.ivandemarino.me, ivan.de.marino@gmail.com

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the <organization> nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL IVAN DE MARINO BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

(function () {
    // Ensure that Jasmine library is loaded first
    if (!jasmine) {
        throw new Exception("[Jasmine JSReporter] 'Jasmine' library not found");
    }

    /**
     * Calculate elapsed time, in Seconds.
     * @param startMs Start time in Milliseconds
     * @param finishMs Finish time in Milliseconds
     * @return Elapsed time in Seconds */
    function elapsedSec (startMs, finishMs) {
        return (finishMs - startMs) / 1000;
    }

    var platformMap = {
        'ipod touch':'ios',
        'iphone':'ios'
    };

    var JSReporter =  function (server) {
        this.server = server;
    };

    JSReporter.prototype = {
        reportRunnerStarting: function (runner) {
            // Attach results to the "jasmine" object to make those results easy to scrap/find
            jasmine.runnerResults = {
                failures: [],
                durationSec : 0,
                passed : true,
                total: 0,
                failed: 0
            };
        },

        reportSpecStarting: function (spec) {
            // Start timing this spec
            spec.startedAt = new Date();
        },

        reportSpecResults: function (spec) {
            // Finish timing this spec and calculate duration/delta (in sec)
            spec.finishedAt = new Date();
            spec.durationSec = elapsedSec(spec.startedAt.getTime(), spec.finishedAt.getTime());
            jasmine.runnerResults.durationSec += spec.durationSec;
            jasmine.runnerResults.total++;
            var results = spec.results();
            var failed = !(results.passed());
            if (failed) {
                var failure = {spec:spec.getFullName(),assertions:[]};
                jasmine.runnerResults.failed++;
                var items = results.getItems();
                for (var i = 0, l = items.length; i < l; i++) {
                    var item = items[i];
                    if (!item.passed_) {
                        failure.assertions.push({exception:item.message,trace:(item.trace && item.trace.stack ? item.trace.stack : "")});
                    }
                }
                jasmine.runnerResults.failures.push(failure);
            }
        },

        reportSuiteResults: function (suite) {
            // Nothing to do
        },

        reportRunnerResults: function (runner) {
            var p = device.platform.toLowerCase();

            this.postTests({
                mobilespec:jasmine.runnerResults,
                sha:library_sha,
                platform:(platformMap.hasOwnProperty(p) ? platformMap[p] : p),
                version:device.version.toLowerCase(),
                timestamp:Math.round(Math.floor((new Date()).getTime() / 1000)),
                model:device.model || device.name
            });
        },
        postTests: function(json) {
            console.log('posting tests');
            var xhr = new XMLHttpRequest();
            var doc_id = [json.platform, library_sha, json.version, json.model].map(encodeURIComponent).join('__');
            var doc_url = this.server + '/mobilespec_results/' + doc_id;
            xhr.open("PUT", doc_url, true);
            xhr.onreadystatechange=function() {
                console.log('onreadystatechange');
                if (xhr.readyState==4) {
                    console.log('readystate==4, status: ' + xhr.status);
                    if (xhr.status==201) {
                        // HTTP 201 Created
                        // we added the doc, hooray
                        console.log('>>> DONE <<<');
                    } else if (xhr.status == 409) {
                        console.log('conflict on couch');
                        // HTTP 409 Conflict
                        // doc already exists. now let's GET it, grab the rev, delete it, and try again.
                        var exehar = new XMLHttpRequest();
                        exehar.open('GET', doc_url, true);
                        exehar.onreadystatechange=function() {
                            if (exehar.readyState==4) {
                                if (exehar.status==200) {
                                    var existing_doc = JSON.parse(exehar.responseText);
                                    var rev = existing_doc._rev;
                                    var eksatschargh = new XMLHttpRequest();
                                    eksatschargh.open('DELETE', doc_url + '?rev=' + rev, true);
                                    eksatschargh.onreadystatechange=function() {
                                        if (eksatschargh.readyState==4) {
                                            if (eksatschargh.status==200) {
                                                var x_h_r = new XMLHttpRequest();
                                                x_h_r.open('PUT', doc_url, true);
                                                x_h_r.onreadystatechange=function() {
                                                    if (x_h_r.readyState==4) {
                                                        if (x_h_r.status==201) {
                                                            console.log('>>> DONE <<<');
                                                        } else {
                                                            console.log('the round trip delete+create failed. i give up. status was: ' + x_h_r.status);
                                                            console.log(x_h_r.responseText);
                                                        }
                                                    }
                                                };
                                                x_h_r.send(JSON.stringify(json));
                                            } else {
                                                console.log('look, we tried to add the results to couch. it said it alrady exists. now im trying to DELETE it. it fucked up. wtf. status on the DELETE: ' + eksatschargh.status);
                                            }
                                        }
                                    };
                                    eksatschargh.send(null);
                                } else {
                                    console.log('look, we tried to add the results to couch. it said it alrady exists. now im trying to GET it so i can DELETE it. it fucked up. wtf. status on the GET: ' + exehar.status);
                                }
                            }
                        };
                        exehar.send(null);
                    } else {
                        console.log('some crazy shit happened. couch returned some balltastic info. status code: ' + xhr.status);
                        console.log(xhr.responseText);
                        console.log('>>> DONE <<<');
                    }
                }
            };
            xhr.send(JSON.stringify(json));
        },
    };

    // export public
    jasmine.JSReporter = JSReporter;
})();

