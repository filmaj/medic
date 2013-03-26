# medic

> Continuous integration setup for [Apache Cordova](http://cordova.io)

- medic will deploy to real iOS, Android and BlackBerry 10 devices and run JavaScript test suites in a hybrid application container (Apache Cordova).
- medic aggregates test run data, categorizing by device characters, into a single document store, powered by [Apache CouchDB](http://couchdb.apache.org), and comes with a dashboard so you can see these results.
- medic will scan your machine for all connected mobile devices and queue builds for any device that is missing from your Couch.
- medic supports automating most JavaScript test suites. By default it runs the Apache Cordova test suite ([mobile-spec](http://git-wip-us.apache.org/repos/asf/cordova-mobile-spec.git)), but allows for customizing the test suite application.
- medic, by default, runs the Apache Cordova test suite, but can be configured to run any JavaScript test page.

Apache 2.0 License!

## Supported Platforms

- Android
- iOS
- BlackBerry (Playbook and BlackBerry 10)

## Giv'er 

1. **VERY IMPORTANT**: Customize the parameters laid out in the `./config.json` file.
2. `(sudo) npm install` to get the dependencies sorted.
3. `node build.js` to run builds of the cordova test suite (mobile-spec), listening to latest commits for all supported cordova platforms. Lots of customization available. For custimzation, see usage section below.
4. `node dashboard.js` to run the dashboard server summarizing test results

## Requirements

Only tested on Mac OS 10.7.5.

- git
- node + npm
- Necessary SDKs for the platforms you are building
- Any provisioning profiles or certificates for the various platforms you want to test on
  - iOS stuff both installed locally for Xcode and Keychain, as well as the profiles deployed to the test devices. Fill out your keychain location (login.keychain) and your keychain password too! Tested with Xcode 4.5.2 and 4.6.
  - Debug tokens installed to each BlackBerry Playbook or BB10 device (sorry, no OS 7 and earlier support)

## How This Works

There are three components in this system: a build process, a web server acting as dashboard, and a couchdb.

- a couchdb full of medic result docs, with currently two databases: `mobilespec_results` and `build_errors`
- **dashboard.js**: small node web server that aggregates data from the above couch
- **build.js**: a node process that pings the git apache servers for updates to the [Apache Cordova](http://cordova.io) project repositories.
  - when it detects a new commit, it will run through and wrap up the Cordova test suite, [mobile-spec](http://github.com/apache/cordova-mobile-spec), in each platform implementation currently supported
  - this version of [mobile-spec](http://github.com/apache/cordova-mobile-spec) will save results to couchdb

## Usage

### Setup couchdb

* Install couch db
* Edit the local.ini to accept request from external host.

```javascript
bind_address = 0.0.0.0
```

#### Setup database:

##### Create two databases
* bulid_errors
* mobilespec_results

##### Create a document in mobilespec_results

```javascript
{
   "_id": "_design/results",
   "views": {
       "android": {
           "map": "function(doc){if (doc.platform == 'android' && doc.mobilespec) {emit(doc.sha, {\"total\":doc.mobilespec.total,\"passed\":(doc.mobilespec.total - doc.mobilespec.failed),\"version\":doc.version,\"model\":doc.model,\"fails\":doc.mobilespec.failures});}}"
       },
       "blackberry": {
           "map": "function(doc){if (doc.platform == 'blackberry' && doc.mobilespec) {emit(doc.sha, {\"total\":doc.mobilespec.total,\"passed\":(doc.mobilespec.total - doc.mobilespec.failed),\"version\":doc.version,\"model\":doc.model,\"fails\":doc.mobilespec.failures});}}"
       },
       "ios": {
           "map": "function(doc){if (doc.platform == 'ios' && doc.mobilespec) {emit(doc.sha, {\"total\":doc.mobilespec.total,\"passed\":(doc.mobilespec.total - doc.mobilespec.failed),\"version\":doc.version,\"model\":doc.model,\"fails\":doc.mobilespec.failures});}}"
       }
   }
}
```

##### Create a document in buid_errors
```javascript
{
   "_id": "_design/errors",
   "views": {
       "android": {
           "map": "function(doc){if (doc.platform == 'android' && doc.failure) {emit(doc.sha, {\"timestamp\":doc.timestamp,\"failure\":doc.failure,\"details\":doc.details,\"version\":doc.version,\"model\":doc.model});}}"
       },
       "blackberry": {
           "map": "function(doc){if (doc.platform == 'blackberry' && doc.failure) {emit(doc.sha, {\"timestamp\":doc.timestamp,\"failure\":doc.failure,\"details\":doc.details,\"version\":doc.version,\"model\":doc.model});}}"
       },
       "ios": {
           "map": "function(doc){if (doc.platform == 'ios' && doc.failure) {emit(doc.sha, {\"timestamp\":doc.timestamp,\"failure\":doc.failure,\"details\":doc.details,\"version\":doc.version,\"model\":doc.model});}}"
       }
   }
}
```

### build.js

Run `node build.js` without parameters to listen to new commits coming into the Apache Cordova project and build tests for these new commits. 
You can customize various parameters by either providing them as parameters to the CLI, or by filling out the corresponding sections in `config.json`.

#### Customizing

- `--app, -a <path>`: Relative path from root of this project to a static application you want to deploy to devices. `config.json` parameter: `app.static.path`. Defaults to `null` as Cordova uses a dynamic application for testing.
- `--entry, -e <path>`: The entry page for the test application, relative to app bundle root. Most applications use `index.html`, but Cordova test suite has a page for all tests located at `autotest/pages/all.html`. `config.json` parameter: `app.entry`.
- `--builder, -b <path>`: Relative path from root of this project to a compatible module capable of building the test application. See below for more information, or `src/build/makers/mobile_spec.js` for an example.
- `--hook, -h <path>`: Relative path from root of this project to a compatible module capable of notifying medic when commits for your custom test suite get pushed. See below for more information. Only applies to dynamic testing applications.
- `--platforms, -p [platform(s)]`: A comma-separated list of supported platforms. A supported platform string can be followed by an `@` and then either a tag or SHA. If a tag or SHA is provided, versions of the app will only be built against that tag or SHA for the specified platform. If not specified, medic will listen for new commits to Cordova for the provided platforms and queue builds of the app for platforms as new commits come in.

##### Dynamic Test Application Builder

This module should be defined as a function that takes five parameters:

    module.exports = function(output_location, sha, devices, entry_point, callback) {
    }

The parameters:

- `output_location`: A full path string to the location of where the test application should be built. It should compose a directory full of HTML, CSS and JavaScript assets that make up your test application.
- `sha`: The SHA or tag that should be built. For dynamic test app generation, this string is useful for identifying and keeping track of results.
- `devices`: not applicable
- `entry_point`: the entry point into the app as defined by configuration. not applicable to authors of dynamic test application builders, really. Dun worry 'bout it.
- `callback`: This one you should worry about! Fire this callback off once you are done building the app. Optionally, pass a truthy value as first parameter to let medic know some bad shit happened.

For a real-world example, check out the mobile-spec builder (right here: `src/build/makers/mobile_spec.js`).

##### Dynamic Test Application Commit Hook

This module should be defined as a function that takes a single callback. The callback should be fired whenever your test application receives a new commit. How this is done is up to. 

A short example:

    module.exports = function(callback) {
        setTimeout(callback, 2000);
    };

The above will fire the callback after 2 seconds - it is trivial for example purposes.

For a real-world example of how Cordova implements its commit hook for medic, look at `src/build/makers/mobile_spec/commit_hook.js`.

### Examples of Use

#### Build latest Apache Cordova test suite, listening to commits, queuing builds of recent commits to libraries

    $ node build.js

#### Build a Static Application with Local Assets

In this example I am using [Pivotal's Jasmine BDD JavaScript test framework](https://github.com/pivotal/jasmine)'s [test suite](https://github.com/pivotal/jasmine/blob/master/spec/runner.html), cloned locally under `../jasmine`, telling medic to launch the page located at `../jasmine/spec/runner.html` on application run.

    $ node build.js -a ../jasmine -e spec/runner.html

#### Build a Static Application with a Remote URL

In this example, I tell medic to use a test suite located online ([Backbone](http://backbonejs.org)'s [test suite](http://backbonejs.org/test)) and deploy it to devices.

    $ node build.js -e http://backbonejs.org/test/index.html
