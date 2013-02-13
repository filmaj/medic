var path = require('path');

module.exports = {
    list:['android','blackberry','ios'],
    paths:{
        'cordova-android':path.join(__dirname, 'lib', 'cordova-android'),
        'cordova-ios':path.join(__dirname, 'lib', 'cordova-ios'),
        'cordova-blackberry':path.join(__dirname, 'lib', 'cordova-blackberry'),
        'test':path.join(__dirname, 'lib', 'test')
    },
    output:{
        'cordova-android':path.join(__dirname, 'temp', 'android'),
        'cordova-ios':path.join(__dirname, 'temp', 'ios'),
        'cordova-blackberry':path.join(__dirname, 'temp', 'blackberry'),
        'test':path.join(__dirname, 'temp', 'test')
    },
    first_tested_commit:{
        'cordova-android':'538e90f23aaeebe4cc08ad87d17d0ab2dde6185d',
        'cordova-ios':'6e60c222f8194bb43de6b52c5ea9ff84cc92e040',
        'cordova-blackberry':'4506e7d48071213653771007970bb86276c2d9d9'
    }
};
