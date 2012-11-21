var path = require('path');

module.exports = {
    paths:{
        'incubator-cordova-android':path.join(__dirname, 'lib', 'incubator-cordova-android'),
        'incubator-cordova-ios':path.join(__dirname, 'lib', 'incubator-cordova-ios'),
        'incubator-cordova-blackberry-webworks':path.join(__dirname, 'lib', 'incubator-cordova-blackberry-webworks'),
        'incubator-cordova-mobile-spec':path.join(__dirname, 'lib', 'incubator-cordova-mobile-spec')
    },
    output:{
        'incubator-cordova-android':path.join(__dirname, 'temp', 'android'),
        'incubator-cordova-ios':path.join(__dirname, 'temp', 'ios'),
        'incubator-cordova-blackberry-webworks':path.join(__dirname, 'temp', 'blackberry'),
        'incubator-cordova-mobile-spec':path.join(__dirname, 'temp', 'mobspec')
    }
};
