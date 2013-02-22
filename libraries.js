/*
Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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
        'cordova-ios':'6e60c222f8194bb43de6b52c5ea9ff84cc92e040'
    }
};
//        'cordova-blackberry':'4506e7d48071213653771007970bb86276c2d9d9'
