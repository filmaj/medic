# medic

continuous integration setup for Apache Cordova

## Getting Started

1. Customize the parameters laid out in the `./config` file in this
   directory.

## Contents

- Small node.js server that aggregates Jasmine test results
- Shell script that modifies [mobile-spec](http://github.com/apache/incubator-cordova-mobile-spec) to POST results to above node server
  - injects jasmine reporter that creates JUnit XML test result output

## Supported Platforms

- Android

### Android

- Jenkins-compatible shell script that
  - modifies the Android test project's domain whitelist
  - launches tests on connected Android devices
