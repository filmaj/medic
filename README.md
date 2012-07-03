# medic

continuous integration setup for Apache Cordova

## Getting Started

1. Customize the parameters laid out in the `./config` file in this
   directory.
2. Inside Jenkins, create a job for each platform. In each job's
   configuration, add a shell script build action composed of the
   following:
        
        sh /path/to/medic/setupspec.sh
        sh /path/to/medic/<platform>/jenkins.sh

3. In each job's configuration, add a post-build action "Publish
   JUnit test result report" and specify `**/*.xml` as the Test report
   XMLs field.
4. Run the bundled node server via `node server.js`. Make sure you have
   all of the dependencies installed by running `npm install` first.

## Contents

- Small node.js server that aggregates Jasmine test results
- Shell script (`./setupspec.sh`) that modifies [mobile-spec](http://github.com/apache/incubator-cordova-mobile-spec) to POST results to above node server
   - injects jasmine reporter that creates JUnit XML test result output

## Supported Platforms

- Android

### Android

- Jenkins-compatible shell script that
  - modifies the Android test project's domain whitelist
  - launches tests on connected Android devices
