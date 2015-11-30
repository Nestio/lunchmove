// Test
var assert = require('chai').assert;
var sinon = require('sinon');
var Factory = require('factory_girl');

// Dependencies
var Marionette = require('backbone.marionette');
var Radio = require('backbone.radio');

// Fixtures
var fs = require('fs');
var fixtures = require('fixtures');
var BaseRegionsFixt = fs.readFileSync(__dirname + '/../fixtures/base-regions.html', 'utf8');

// App
var Controller = require('app/controller');
var EntitiesAPI = require('app/entities').API;
var LayoutView = require('app/list/views').LayoutView;
var LoadingView = require('app/common/views').LoadingView;
var Move = require('app/entities').Move;
var Moves = require('app/entities').Moves;
var Spots = require('app/entities').Spots;

var channel = Radio.channel('global');

describe('Controller', function(){
    before(function(){
        fixtures.append(BaseRegionsFixt);

        channel.reply('get:region', function(name){
            if (name === 'main'){
                return this.mainRegion;
            }
        }, this);

        this.mainRegion = new Marionette.Region({
            el: '#main-region'
        });

        this.entitiesAPI = new EntitiesAPI();
    });

    beforeEach(function(){
        var moves = this.moves = new Moves();
        this.replyMovesStub = sinon.stub(this.entitiesAPI, 'replyMoves', function(){
            return moves;
        });

        var move = this.move = new Move();
        this.replyMoveStub = sinon.stub(this.entitiesAPI, 'replyMove', function(){
            return move;
        });

        var spots = this.spots = new Spots();
        this.replySpotsStub = sinon.stub(this.entitiesAPI, 'replySpots', function(){
            return spots;
        });

        this.server = sinon.fakeServer.create();
        this.server.respondWith(moves.url, JSON.stringify({results: []}));
        this.server.respondWith(spots.url, JSON.stringify({results: []}));
    });

    after(function(){
        channel.stopReplying('get:region');
    });

    afterEach(function(){
        this.replyMovesStub.restore();
        this.replyMoveStub.restore();
        this.replySpotsStub.restore();
        this.server.restore();
        this.mainRegion.empty();
    });

    after(function(){
        fixtures.cleanup();
    });

    describe('initialize', function(){
        it('registers call:method request handler');
    });

    describe('destroy', function(){
        it('unregisters call:method request handler');
    });

    describe('list', function(){
        it('shows loading view before view is loaded', function(){
            var controller = new Controller();
            assert.isFalse(this.mainRegion.hasView(), 'no view shown yet');
            controller.list();
            assert.isTrue(this.mainRegion.hasView(), 'a view in the mainRegion');
            assert.isTrue(this.mainRegion.currentView instanceof LoadingView, 'view in mainRegion is LoadingView');
        });

        it('shows list LayoutView after moves and spots are fetched', function(){
            var controller = new Controller();
            controller.list();
            this.server.respond();
            assert.isTrue(this.mainRegion.hasView(), 'a view in the mainRegion');
            assert.isTrue(this.mainRegion.currentView instanceof LayoutView, 'view in mainRegion is LayoutView');
        });

        it('passes saveAlert to LayoutView as recentSave option', function(){
            var controller = new Controller();
            controller.list(true);
            this.server.respond();
            assert.isTrue(this.mainRegion.currentView.getOption('recentSave'), 'passes true if save alert');
        });
    });

    describe('edit', function(){
        it('inserts view immediately if spots have already been fetched');
        it('inserts loading view first if spots have not already been fetched');
        it('inserts NameView if move does not a have user name');
        it('inserts MoveFormView if move does have a name');
    });
});
