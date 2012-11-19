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

    /**
     * Round an amount to the given number of Digits.
     * If no number of digits is given, than '2' is assumed.
     * @param amount Amount to round
     * @param numOfDecDigits Number of Digits to round to. Default value is '2'.
     * @return Rounded amount */
    function round (amount, numOfDecDigits) {
        numOfDecDigits = numOfDecDigits || 2;
        return Math.round(amount * Math.pow(10, numOfDecDigits)) / Math.pow(10, numOfDecDigits);
    }

    /**
     * Collect information about a Suite, recursively, and return a JSON result.
     * @param suite The Jasmine Suite to get data from
     */
    function getSuiteData (suite) {
        var suiteData = {
                description : suite.description,
                durationSec : 0,
                specs: [],
                suites: [],
                passed: true,
                total: 0,
                failed: 0
            },
            specs = suite.specs(),
            suites = suite.suites(),
            i, ilen;

        // Loop over all the Suite's Specs
        for (i = 0, ilen = specs.length; i < ilen; ++i) {
            var spec = specs[i];
            var r = spec.results();
            suiteData.specs[i] = {
                description : spec.description,
                durationSec : spec.durationSec,
                passed : r.passedCount === r.totalCount,
                skipped : r.skipped,
                passedCount : r.passedCount,
                failedCount : r.failedCount,
                totalCount : r.totalCount
            };
            if (r.passedCount != r.totalCount) {
                var msgs = [];
                r.getItems().forEach(function(item) {
                    if (!item.passed_) msgs.push(spec.getFullName() + ': ' + item.message);
                });
                suiteData.specs[i].failures = msgs;
            }
            suiteData.total += r.totalCount;
            suiteData.failed += r.failedCount;
            suiteData.passed = !suiteData.specs[i].passed ? false : suiteData.passed;
            suiteData.durationSec += suiteData.specs[i].durationSec;
        }

        // Loop over all the Suite's sub-Suites
        for (i = 0, ilen = suites.length; i < ilen; ++i) {
            suiteData.suites[i] = getSuiteData(suites[i]); //< recursive population
            suiteData.passed = !suiteData.suites[i].passed ? false : suiteData.passed;
            suiteData.durationSec += suiteData.suites[i].durationSec;
            suiteData.total += suiteData.suites[i].total;
            suiteData.failed += suiteData.suites[i].failed;
        }

        // Rounding duration numbers to 3 decimal digits
        suiteData.durationSec = round(suiteData.durationSec, 4);

        return suiteData;
    }

    var platformMap = {
        'ipod touch':'ios'
    };

    var JSReporter =  function (server) {
        this.server = server;
    };

    JSReporter.prototype = {
        reportRunnerStarting: function (runner) {
            // Nothing to do
        },

        reportSpecStarting: function (spec) {
            // Start timing this spec
            spec.startedAt = new Date();
        },

        reportSpecResults: function (spec) {
            // Finish timing this spec and calculate duration/delta (in sec)
            spec.finishedAt = new Date();
            spec.durationSec = elapsedSec(spec.startedAt.getTime(), spec.finishedAt.getTime());
        },

        reportSuiteResults: function (suite) {
            // Nothing to do
        },

        reportRunnerResults: function (runner) {
            var suites = runner.suites(),
                i, ilen;

            // Attach results to the "jasmine" object to make those results easy to scrap/find
            jasmine.runnerResults = {
                suites: [],
                durationSec : 0,
                passed : true,
                total: 0,
                failed: 0
            };

            // Loop over all the Suites
            for (i = 0, ilen = suites.length; i < ilen; ++i) {
                if (suites[i].parentSuite === null) {
                    jasmine.runnerResults.suites.push(getSuiteData(suites[i]));
                    var l = jasmine.runnerResults.suites.length;
                    // If 1 suite fails, the whole runner fails
                    var last = jasmine.runnerResults.suites[l-1];
                    jasmine.runnerResults.passed = !last.passed ? false : jasmine.runnerResults.passed;
                    // Add up all the durations
                    jasmine.runnerResults.durationSec += last.durationSec;
                    jasmine.runnerResults.total += last.total;
                    jasmine.runnerResults.failed += last.failed;
                }
            }

            var p = device.platform.toLowerCase();

            this.postTests({
                mobilespec:jasmine.runnerResults,
                sha:library_sha,
                platform:(platformMap.hasOwnProperty(p) ? platformMap[p] : p),
                version:device.version.toLowerCase(),
                timestamp:Math.floor((new Date()).getTime() / 1000),
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
                    }
                }
            };
            xhr.send(JSON.stringify(json));
        },
    };

    // export public
    jasmine.JSReporter = JSReporter;
})();

