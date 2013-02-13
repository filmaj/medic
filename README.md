# medic

> Continuous integration setup for [Apache Cordova](http://cordova.io)

medic will deploy to real iOS, Android and BlackBerry 10 devices and run JavaScript test suites in a hybrid application container (Apache Cordova).
medic aggregates test run data, categorizing by device characters, into a single document store, powered by [Apache CouchDB](http://couchdb.apache.org), and comes with a dashboard so you can see these results.
medic will scan your machine for all connected mobile devices and queue builds for any device that is missing from your Couch.
medic supports automating most JavaScript test suites. By default it runs the Apache Cordova test suite ([mobile-spec](http://git-wip-us.apache.org/repos/asf/cordova-mobile-spec.git)), but allows for customizing the test suite application.


## Giv'er 

1. **VERY IMPORTANT**: Customize the parameters laid out in the `./config.json` file.
2. `sudo npm install`
3. `node build.js` to run builds of the cordova test suite (mobile-spec), listening to latest commits for all supported cordova platforms. Lots of customization availab le. For custimzation, see usage section below.
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

- a couchdb full of medic result docs, with currently two databases: `mobilespec_results` and `build_errors`
- **dashboard.js**: small node web server that aggregates data from the above couch
- **build.js**: a node process that pings the git apache servers for updates to the [Apache Cordova](http://cordova.io) project repositories.
  - when it detects a new commit, it will run through and wrap up the Cordova test suite, [mobile-spec](http://github.com/apache/cordova-mobile-spec), in each platform implementation currently supported
  - this version of [mobile-spec](http://github.com/apache/cordova-mobile-spec) will save results to couchdb

## Usage

### build.js

Run `node build.js` without parameters to listen to new commits coming into the Apache Cordova project and build tests for these new commits. 
You can customize various parameters by either providing them as parameters to the CLI, or by filling out the corresponding sections in `config.json`.

#### Customizing

- `--app, -a <path>`: Relative path from root of this project to a compatible app bundle (see below). `config.json` parameter: `app.path`. Defaults to `src/build/makers/mobile_spec`.
- `--entry, -e <path>`: The entry page for the test application, relative to app bundle root. Most applications use `index.html`, but Cordova test suite has a page for all tests located at `autotest/pages/all.html`. `config.json` parameter: `app.entry`.
- `--hook, -h <path>`: Relative path from root of this project to a compatible module capable of notifying medic when commits for your custom test suite get pushed. See below for more information.
- `--platforms, -p [platform(s)]`: A comma-separated list of supported platforms. A supported platform string can be followed by an `@` and then either a tag or SHA. If a tag or SHA is provided, versions of the app will only be built against that tag or SHA for the specified platform. If not specified, medic will listen for new commits to Cordova for the provided platforms and queue builds of the app for platforms as new commits come in.

##### Application Bundle

To work with medic, the path to your test app must follow a particular structure.

## Supported Platforms

- Android
- iOS
- BlackBerry (Playbook and BlackBerry 10)

# License

MIT LICENSE
