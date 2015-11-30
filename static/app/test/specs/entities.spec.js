// Test
var assert = require('chai').assert;
var sinon = require('sinon');
var Factory = require('factory_girl');

// Dependencies
var Radio = require('backbone.radio');

// App
var EntitiesAPI = require('app/entities').API;
var channel = Radio.channel('global');

describe('Entities', function(){
    describe('API', function(){
        describe('initialization', function(){
            it('registers an entities:spots request handler');
            it('registers an entities:moves request handler');
            it('registers an entities:move request handler');
            it('registers an entities:move:reset request handler');
        });

        describe('destroy', function(){
            it('unregisters entities:spots request handler');
            it('unregisters entities:moves request handler');
            it('unregisters entities:move request handler');
            it('unregisters entities:move:reset request handler');
        });

        describe('resetMove', function(){
            it('destroys the current moves and passes options to move.destroy');
            it('resets move with a new move');
        });
    });
});
