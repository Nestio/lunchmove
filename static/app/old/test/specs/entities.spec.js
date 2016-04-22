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
        beforeEach(function(){
            this.entitiesAPI = new EntitiesAPI();
        });
        
        afterEach(function(){
            this.entitiesAPI.destroy();
        });
        
        describe('initialization', function(){
            
            it('registers an entities:spots request handler', function(){
                var spots = "something";
                var replySpotsStub = sinon.stub(this.entitiesAPI, 'replySpots', function(){ return spots; });
                var result = channel.request('entities:spots');
                assert.isTrue(replySpotsStub.calledOnce, 'replySpots is called');
                assert.equal(spots, result, 'the request handler returns the result of replySpots');
                replySpotsStub.restore();
            });
            it('registers an entities:moves request handler', function(){
                var moves = "something";
                var replyMovesStub = sinon.stub(this.entitiesAPI, 'replyMoves', function(){ return moves; });
                var result = channel.request('entities:moves');
                assert.isTrue(replyMovesStub.calledOnce, 'replyMoves is called');
                assert.equal(moves, result, 'the request handled returns the result of replyMoves');
                replyMovesStub.restore();
            });
            it('registers an entities:move request handler', function(){
                var move = "something";
                var replyMoveStub = sinon.stub(this.entitiesAPI, 'replyMove', function(){ return move; });
                var result = channel.request('entities:move');
                assert.isTrue(replyMoveStub.calledOnce, 'replyMove is called');
                assert.equal(move, result, 'the request handler returns the result of replyMove');
                replyMoveStub.restore();
            });
            it('registers an entities:move:reset request handler', function(){
                var resetMoveStub = sinon.stub(this.entitiesAPI, 'resetMove', function(){});
                this.entitiesAPI.resetMove();
                assert.isTrue(resetMoveStub.calledOnce, 'resetMove is called');
                resetMoveStub.restore();
            });
        });
        
        describe('destroy', function(){
            it('unregisters entities:spots request handler', function(){
                this.entitiesAPI.destroy();
                var result = channel.request('entities:spots');
                assert.isUndefined(result, 'entities:spots returns nothing');
            });
            it('unregisters entities:moves request handler', function(){
                this.entitiesAPI.destroy();
                var result = channel.request('entities:moves');
                assert.isUndefined(result, 'entities:moves returns nothing');
            });
            it('unregisters entities:move request handler', function(){
                this.entitiesAPI.destroy();
                var result = channel.request('entities:move');
                assert.isUndefined(result, 'entities:move returns nothing');
            });
            it('unregisters entities:move:reset request handler', function(){
                this.entitiesAPI.destroy();
                var result = channel.request('entities:move:reset');
                assert.isUndefined(result, 'entitites:move:reset');
            });
        });

        describe('resetMove', function(){
            it('destroys the current moves and passes options to move.destroy', function(){                
                var move = channel.request('entities:move');
                var options = {something: "something"};
                var moveDestroySpy = sinon.spy(move, 'destroy');

                this.entitiesAPI.resetMove(options);
                assert.isTrue(moveDestroySpy.called, 'resetMove calls move.destroy');
                assert.isTrue(moveDestroySpy.calledWith(options), 'resetMove passes options to move.destroy');
            });
            it('resets move with a new move', function(){
                var move = channel.request('entities:move');
                var resetMoveStub = sinon.stub(this.entitiesAPI, 'resetMove', function(){
                    move.destroy();
                    return new Move({ user: move.get('user') });
                });
                
                var result = this.entitiesAPI.resetMove();
                assert.notEqual(move, result, 'resetMove resets with a new move');
                resetMoveStub.restore();
            });
        });
    });
});
