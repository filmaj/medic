# medic

continuous integration setup for Apache Cordova

## Getting Started

1. Customize the parameters laid out in the `./config.json` file in this
   directory.
2. `node server.js`
3. Make a GET request to http://yourserver/go

## Contents

- Small node.js server that aggregates (*cough* logs out) Jasmine test results
- script (`./src/create_mobile_spec_app.js`) that modifies [mobile-spec](http://github.com/apache/incubator-cordova-mobile-spec) to POST results to above node server
   - injects jasmine reporter that creates JUnit XML test result output
- iterates through the `./src/makers` scripts to create Cordova apps for each platform based on the modified mobile-spec app made above, then deploys to any connected devices

## Supported Platforms

- Android
- iOS

## TODO

- show the results in a meaningful way
- queue of builds
- better error handling (what if create / debug scripts die? etc)
- tests?
