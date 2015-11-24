// Test
var assert = require('chai').assert;
var sinon = require('sinon');
var Factory = require('factory_girl');

// Dependencies
var Radio = require('backbone.radio');

// App
var ConstantsAPI = require('app/constants').API;
var channel = Radio.channel('global');

describe('Constants', function(){
    beforeEach(function(){
        this.replyConstantsStub = sinon.stub(ConstantsAPI.prototype, 'replyConstants', function(name){
            return name;
        });
        /* We want to test out the request handler is working, but it doesn't matter what
        constant specifically is being returned. In fact, replying on the name of the specific
        constant would make this test too brittle if the constant changes. So we stub out
        replyConstants, which is called internally within the request handler. That lets
        us check that the handler is working properly but ignore the actual value */

    });

    afterEach(function(){
        this.replyConstantsStub.restore();
    });

    describe('initialize', function(){
        it('creates a request handler on get:constant', function(){
            var constantsAPI = new ConstantsAPI();
            var name = 'something';
            var result = channel.request('get:constant', name);
            assert.isTrue(this.replyConstantsStub.calledOnce, 'replyConstants is called');
            assert.isTrue(this.replyConstantsStub.calledWith(name), 'replyConstants is passed argument');
            assert.equal(name, result, 'the request handler returns the result of replyConstants');
        });
    });

    describe('destroy', function(){
        it('removes the request handler on get:constant', function(){
            var constantsAPI = new ConstantsAPI();
            constantsAPI.destroy();
            var name = 'something';
            var result = channel.request('get:constant', name);
            assert.isUndefined(result, 'get:constant returns nothing');
        });
    });
});
