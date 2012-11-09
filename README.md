# medic

continuous integration setup for Apache Cordova

## How This Works

1. Customize the parameters laid out in the `./config.json` file in this
   directory
2. `node server.js`
3. POST to `/commit` with library name + sha pairs as JSON and medic will build and deploy a test suite wrapped in different flavours of Cordova applications to all connected and supported devices.
4. This app swarm will POST test suite results back to `/results`
5. GET `/` to see the results

## Contents

- Small node.js server that aggregates Jasmine test results
- script (`./src/create_mobile_spec_app.js`) that modifies [mobile-spec](http://github.com/apache/incubator-cordova-mobile-spec) to POST results to server
   - injects jasmine reporter that creates JUnit XML test result output
- iterates through the `./src/makers` scripts to create Cordova apps for each platform based on the modified mobile-spec app made above, then deploys to any connected devices

## Supported Platforms

- Android
- iOS

# License

MIT LICENSE
