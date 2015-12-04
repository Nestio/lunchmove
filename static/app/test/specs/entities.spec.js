// Test
var assert = require('chai').assert;
var sinon = require('sinon');
var Factory = require('factory_girl');

// Dependencies
var Radio = require('backbone.radio');

// App
var EntitiesAPI = require('app/entities').API;
var Move = require('app/entities').Move;
var channel = Radio.channel('global');

describe('Entities', function(){
    describe('API', function(){
        describe('initialization', function(){
            
            it('registers an entities:spots request handler', function(){
                var entitiesAPI = new EntitiesAPI();
                var spots = "something";
                this.replySpotsStub = sinon.stub(EntitiesAPI.prototype, 'replySpots', function(){ return spots });
                var result = channel.request('entities:spots');
                assert.isTrue(this.replySpotsStub.calledOnce, 'replySpots is called');
                assert.equal(spots, result, 'the request handler returns the result of replySpots');
                entitiesAPI.destroy();
                this.replySpotsStub.restore();
            });
            it('registers an entities:moves request handler', function(){
                var entitiesAPI = new EntitiesAPI();
                var moves = "something";
                this.replyMovesStub = sinon.stub(EntitiesAPI.prototype, 'replyMoves', function(){ return moves });
                var result = channel.request('entities:moves');
                assert.isTrue(this.replyMovesStub.calledOnce, 'replyMoves is called');
                assert.equal(moves, result, 'the request handled returns the result of replyMoves');
                entitiesAPI.destroy();
                this.replyMovesStub.restore();
            });
            it('registers an entities:move request handler', function(){
                var entitiesAPI = new EntitiesAPI();
                var move = "something";
                this.replyMoveStub = sinon.stub(EntitiesAPI.prototype, 'replyMove', function(){ return move });
                var result = channel.request('entities:move');
                assert.isTrue(this.replyMoveStub.calledOnce, 'replyMove is called');
                assert.equal(move, result, 'the request handler returns the result of replyMove');
                entitiesAPI.destroy();
                this.replyMoveStub.restore();
            });
            it('registers an entities:move:reset request handler', function(){
                var entitiesAPI = new EntitiesAPI();
                this.resetMoveStub = sinon.stub(EntitiesAPI.prototype, 'resetMove', function(){});
                entitiesAPI.resetMove();
                assert.isTrue(this.resetMoveStub.calledOnce, 'resetMove is called');
                this.resetMoveStub.restore();
            });
        });
        
        describe('destroy', function(){
            it('unregisters entities:spots request handler', function(){
                var entitiesAPI = new EntitiesAPI();
                entitiesAPI.destroy();
                var result = channel.request('entities:spots');
                assert.isUndefined(result, 'entities:spots returns nothing');
            });
            it('unregisters entities:moves request handler', function(){
                var entitiesAPI = new EntitiesAPI();
                entitiesAPI.destroy();
                var result = channel.request('entities:moves');
                assert.isUndefined(result, 'entities:moves returns nothing');
            });
            it('unregisters entities:move request handler', function(){
                var entitiesAPI = new EntitiesAPI();
                entitiesAPI.destroy();
                var result = channel.request('entities:move');
                assert.isUndefined(result, 'entities:move returns nothing');
            });
            it('unregisters entities:move:reset request handler', function(){
                var entitiesAPI = new EntitiesAPI();
                entitiesAPI.destroy();
                var result = channel.request('entities:move:reset');
                assert.isUndefined(result, 'entitites:move:reset');
            });
        });

        describe('resetMove', function(){
            it('destroys the current moves and passes options to move.destroy', function(){
                var entitiesAPI = new EntitiesAPI();                
                var move = channel.request('entities:move');
                var options = {something: "something"};
                var moveDestroySpy = sinon.spy(move, 'destroy');

                entitiesAPI.resetMove(options);
                assert.isTrue(moveDestroySpy.called, 'resetMove calls move.destroy');
                assert.isTrue(moveDestroySpy.calledWith(options), 'resetMove passes options to move.destroy');
            });
            it('resets move with a new move', function(){
                var entitiesAPI = new EntitiesAPI();
                var move = channel.request('entities:move');
                this.resetMoveStub = sinon.stub(EntitiesAPI.prototype, 'resetMove', function(){
                    move.destroy();
                    return new Move({ user: move.get('user') });
                });
                
                var result = entitiesAPI.resetMove();
                assert.notEqual(move, result, 'resetMove resets with a new move');
                this.resetMoveStub.restore();
            });
        });
    });
});