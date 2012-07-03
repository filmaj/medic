#!/bin/sh
set -e

PWD=`pwd`
GIT=`which git`
TEMP=$PWD/temp
MOBILE_SPEC_GIT="https://github.com/apache/incubator-cordova-mobile-spec.git"
MOBILE_SPEC_DIR=$TEMP/mobile-spec
ALL_TESTS=$MOBILE_SPEC_DIR/autotest/pages/all.html

source $PWD/config

# Clean up
rm -rf $TEMP
mkdir -p $TEMP

# Get latest mobile-spec
$GIT $MOBILE_SPEC_GIT $MOBILE_SPEC_DIR

# Copy JUnit Jasmine reporter in
cp -f $PWD/src/junit-reporter.js $MOBILE_SPEC_DIR/.

# Edit the autotest "all" page to hook the junit xml reporter into jasmine
# drop in the junit xml reporter
sed -i '' -e "s/<script type=.text.javascript. src=.\.\..html.TrivialReporter\.js.><.script>/<script type=\"text\/javascript\" src=\"..\/html\/TrivialReporter.js\"><\/script><script type=\"text\/javascript\" src=\"..\/..\/junit-reporter.js\"><\/script>/g" $ALL_TESTS
# hook in junit into reporter
sed -i '' -e "s/jasmine.HtmlReporter.../jasmine.HtmlReporter(); var jr = new jasmine.JUnitXmlReporter('$SERVER:$PORT');/g" $ALL_TESTS
sed -i '' -e "s/addReporter.htmlReporter../addReporter(htmlReporter);jasmineEnv.addReporter(jr);/g" $ALL_TESTS

