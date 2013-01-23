# medic

Continuous integration setup for [Apache Cordova](http://cordova.io)

## Giv'er 

1. **VERY IMPORTANT**: Customize the parameters laid out in the `./config.json` file, especially the couch endpoint. If you're keen on getting to the data, contact me (@filmaj).
2. `sudo npm install`
3. `node build.js` to run the builds and listen for Cordova commits
4. `node dashboard.js` to run the dashboard server summarizing test results

## Requirements

Only tested on Mac OS 10.7.5.

- git
- node + npm
- Necessary SDKs for the platforms you are building
- Any provisioning profiles or certificates for the various platforms you want to test on
  - iOS stuff both installed locally for Xcode and Keychain, as well as the profiles deployed to the test devices. Fill out your keychain location (login.keychain) and your keychain password too!
  - Debug tokens installed to each BlackBerry Playbook or BB10 device (sorry, no OS 7 and earlier support)

## How This Works

There are three components in this system: a build process, a web server acting as dashboard, and a couchdb.

- a couchdb full of medic result docs, with currently three databases: `mobilespec_results`, `cordova_commits` and `build_errors`
- **dashboard.js**: small node web server that aggregates data from the above couch
- **build.js**: a node process that pings the git apache servers for updates to the [Apache Cordova](http://cordova.io) project repositories.
  - when it detects a new commit, it will run through and wrap up the Cordova test suite, [mobile-spec](http://github.com/apache/cordova-mobile-spec), in each platform implementation currently supported
  - this version of [mobile-spec](http://github.com/apache/cordova-mobile-spec) will save results to couchdb

## Usage

### build.js

- Run `node build.js` without parameters to listen to new commits coming into the Apache Cordova project and build tests for these new commits. Will also scan your machine for all connected and supported mobile devices and compare with the couch datastore, and queue any builds for any device+library commit combination that is missing from the datastore.
- Run `node build.js --force=<platform>@<sha>`, where `<platform>` equals one of `android` or `ios`, and `<sha>` is a valid commit SHA, tag or branch for that platform's git repository.

## Supported Platforms

- Android
- iOS
- BlackBerry (Playbook and BlackBerry 10)

# License

MIT LICENSE
