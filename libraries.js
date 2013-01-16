var path = require('path');

// 'cordova-blackberry':path.join(__dirname, 'lib', 'cordova-blackberry'),
// 'cordova-blackberry':path.join(__dirname, 'temp', 'blackberry'),
module.exports = {
    count:2,
    paths:{
        'cordova-android':path.join(__dirname, 'lib', 'cordova-android'),
        'cordova-ios':path.join(__dirname, 'lib', 'cordova-ios'),
        'cordova-mobile-spec':path.join(__dirname, 'lib', 'cordova-mobile-spec')
    },
    output:{
        'cordova-android':path.join(__dirname, 'temp', 'android'),
        'cordova-ios':path.join(__dirname, 'temp', 'ios'),
        'cordova-mobile-spec':path.join(__dirname, 'temp', 'mobspec')
    },
    first_tested_commit:{
        'cordova-android':'538e90f23aaeebe4cc08ad87d17d0ab2dde6185d',
        'cordova-ios':'6e60c222f8194bb43de6b52c5ea9ff84cc92e040'
    }
};
