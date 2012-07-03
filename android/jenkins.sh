#/bin/sh
set -e

PWD=`pwd`
MOBILE_SPEC=$PWD/../temp/mobile-spec

source ../config

# package name of the parent android test application
PACKAGE="org.apache.cordova.test"

ANDROID_TEST=$ANDROID_REPO/test
ADB=$ANDROID_SDK/platform-tools/adb
VERSION=`cat $ANDROID_REPO/VERSION`
TEST_PACKAGE="$PACKAGE/android.test.InstrumentationTestRunner"

# List of connected android devices
IDs=`$ADB devices | grep device$ | awk '{print $1}'`

# clean up the workspace. these are Jenkins environment variables
rm -rf $WORKSPACE/$JOB_NAME/xmls

# TODO: clone android repo

# compile the Android Cordova .jar
cd $ANDROID_REPO/framework && ant jar > /dev/null

# clean up the modified mobile-spec used in the test. we want to pull the latest every time.
rm -rf $ANDROID_TEST/assets/www/mobilespec
mkdir $ANDROID_TEST/assets/www/mobilespec

# Copy the jar into the test directory
rm -f $ANDROID_TEST/libs/*
cp -f $ANDROID_REPO/framework/cordova-$VERSION.jar $ANDROID_TEST/libs/.

# Copy the JS
cp -f $ANDROID_REPO/framework/assets/js/cordova.android.js $ANDROID_TEST/assets/www/.

# .. also into the mobilespec directory
cp -f $ANDROID_REPO/framework/assets/js/cordova.android.js $ANDROID_TEST/assets/www/mobilespec/cordova-$VERSION.js

# Copy modified mobile-spec into our test project
cp -rf $MOBILE_SPEC/a* $MOBILE_SPEC/b* $MOBILE_SPEC/c* $MOBILE_SPEC/e* $MOBILE_SPEC/i* $MOBILE_SPEC/l* $MOBILE_SPEC/m* $MOBILE_SPEC/n* $MOBILE_SPEC/s* $ANDROID_TEST/assets/www/mobilespec/. 

# Modify the whitelist
cp -f $PWD/../src/cordova.xml $ANDROID_TEST/res/xml/.

# Compile the app
cd $ANDROID_TEST && ant clean && ant debug > /dev/null

for i in $IDs
do
  echo "Running on device $i"
  # make a directory for the device id
  mkdir -p $WORKSPACE/$JOB_NAME/xmls/$i
  # uninstall if its there already
  $ADB -s $i uninstall $PACKAGE > /dev/null
  # install the test apk to each device
  $ADB -s $i install $ANDROID_TEST/bin/tests-debug.apk > /dev/null
  # run on each device
  $ADB -s $i shell am instrument -w $TEST_PACKAGE > /dev/null
done

