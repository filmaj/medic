var path = require('path');

module.exports = {
    paths:{
        'cordova-android':path.join(__dirname, 'lib', 'cordova-android'),
        'cordova-ios':path.join(__dirname, 'lib', 'cordova-ios'),
        'cordova-blackberry':path.join(__dirname, 'lib', 'cordova-blackberry'),
        'cordova-mobile-spec':path.join(__dirname, 'lib', 'cordova-mobile-spec')
    },
    output:{
        'cordova-android':path.join(__dirname, 'temp', 'android'),
        'cordova-ios':path.join(__dirname, 'temp', 'ios'),
        'cordova-blackberry':path.join(__dirname, 'temp', 'blackberry'),
        'cordova-mobile-spec':path.join(__dirname, 'temp', 'mobspec')
    }
};
