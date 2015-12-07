// Test
var assert = require('chai').assert;
var sinon = require('sinon');
var Factory = require('factory_girl');

// Dependencies
var _ = require('underscore');
var Marionette = require('backbone.marionette');
var Radio = require('backbone.radio');

// Fixtures
var fs = require('fs');
var fixtures = require('fixtures');
var BaseRegionsFixt = fs.readFileSync(__dirname + '/../../fixtures/base-regions.html', 'utf8');

// App
var Controller = require('app/controller');
var EntitiesAPI = require('app/entities').API;
var NameView = require('app/edit/views').NameView;
var MoveFormView = require('app/edit/views').MoveFormView;
var Move = require('app/entities').Move;
var Moves = require('app/entities').Moves;
var Spots = require('app/entities').Spots;
var Spot = require('app/entities').Spot;

var channel = Radio.channel('global');

describe('Edit', function(){
    describe('Views', function(){
        before(function(){
            fixtures.append(BaseRegionsFixt);

            this.mainRegion = new Marionette.Region({
                el: '#main-region'
            });

            this.entitiesAPI = new EntitiesAPI();
        });

        beforeEach(function(){
            var spotsData = _.times(10, function(){
                return Factory.create('Spot').toJSON();
            });
            var spots = this.spots = new Spots(spotsData);
            var moves = this.moves = new Moves();
            
            this.replySpotsStub = sinon.stub(this.entitiesAPI, 'replySpots', function(){
                return spots;
            });

            this.server = sinon.fakeServer.create();
            this.server.respondWith(moves.url, JSON.stringify({results:[]}));
            this.server.respondWith(spots.url, JSON.stringify({ "name":"new place","id":2 }));
        });

        afterEach(function(){
            this.replySpotsStub.restore();
            this.server.restore();
            this.mainRegion.empty();
        });

        after(function(){
            fixtures.cleanup();
        });

        describe('NameView', function(){
            beforeEach(function(){
                this.model = new Move();

                this.view = new NameView({
                    model: this.model
                });

                this.mainRegion.show(this.view);
            });

            it('enables the submit button when user name is filled in', function(){
                assert.isTrue(this.view.ui.saveButton.hasClass('disabled'));
                this.view.getInputEl('user').val('User Name').trigger('input');
                assert.isFalse(this.view.ui.saveButton.hasClass('disabled'));
            });

            it('sets the user name on the model when it is submitted', function(){
                var userName = 'User Name';
                this.view.getInputEl('user').val(userName).trigger('input');
                assert.notOk(this.model.get('user'));
                this.view.ui.form.submit();
                assert.equal(this.model.get('user'), userName);
            });

            it('triggers the edit route when it is submitted', function(){
                var triggerSpy = sinon.spy(channel, 'trigger');
                this.view.getInputEl('user').val('user name').trigger('input');
                assert.notOk(triggerSpy.called);
                this.view.ui.form.submit();
                assert.isTrue(triggerSpy.called);
                assert.isTrue(triggerSpy.calledWith('edit'));
                triggerSpy.restore();
            });
        });

        describe('MoveFormView', function(){
            beforeEach(function(){
                this.model = new Move({
                    user: 'User Name',
                });

                this.view = new MoveFormView({
                    model: this.model
                });
                
                var spot = new Spot({
                    id: 1,
                    name: 'something'
                });
                this.spots.add(spot);
            });

            it('enables the submit button when spot and time are filled in', function(){
                this.mainRegion.show(this.view);
                assert.isTrue(this.view.ui.saveButton.hasClass('disabled'));
                this.view.getInputEl('spot').val('Somewhere').trigger('input');
                this.view.getInputEl('time').val('11:00').trigger('input');
                assert.isFalse(this.view.ui.saveButton.hasClass('disabled'));
            });
            
            it('calls render typeahead on show', function(){
                var renderTypeaheadStub = sinon.spy(this.view, 'renderTypeahead');
                this.mainRegion.show(this.view);
                assert.isTrue(renderTypeaheadStub.called, 'renderTypeahead is called');
            });

            it('sets the value of spotName on deserialize if spotId has a value', function(){
                this.model.set({spot: '1'});
                this.mainRegion.show(this.view);
                assert.isTrue(this.view.ui.spotName.val() === 'something');
            });

            //NOTE: you'll need to create a fakeServer response for this to work. See http://sinonjs.org/docs/#server
            it('triggers list on submit', function(){
                var triggerSpy = sinon.spy(channel, 'trigger');
                this.mainRegion.show(this.view);
                this.view.getInputEl('spot').val('1').trigger('input');
                this.view.getInputEl('time').val('11:00').trigger('input');
                
                this.view.ui.form.submit();
                this.server.respond();

                assert.isTrue(triggerSpy.called);
            });

            describe('onSpotBlur', function(){
                beforeEach(function(){
                    this.mainRegion.show(this.view);
                });
                it('sets spotId if there is no spotId but val of spotName matches the name of a spot ', function(){
                    assert.equal(this.view.ui.spot.val(), '');
                    this.view.ui.spotName.val('something').trigger('input');
                    this.view.onSpotBlur();
                    assert.equal(this.view.ui.spot.val(), '1');
                });
                it('clears spotName if there is no spotId and the val of spotName does not match the name of a spot', function(){
                    this.view.ui.spotName.val('somethin').trigger('input');
                    this.view.onSpotBlur();
                    assert.equal(this.view.ui.spotName.val(), '');
                });
                it('sets spotName if there is a spotId', function(){
                    this.view.ui.spot.val('1');
                    this.view.onSpotBlur();
                    assert.equal(this.view.ui.spotName.val(), 'something');
                });
            });

            describe('addSpot', function(){
                //NOTE: you'll need to create a fakeServer response for these to work. See http://sinonjs.org/docs/#server
                beforeEach(function(){
                    this.mainRegion.show(this.view);
                    this.view.ui.spotName.val("new place").trigger('input');
                    var addSpot = this.view.$('[data-action="addSpot"]');
                    addSpot.click();
                    this.server.respond();
                });
                it('adds a new spot to the spots collection with the name of the value of spotName', function(){
                    var newSpot = channel.request('entities:spots').findWhere({name: "new place"});
                    assert.equal(newSpot.get('name'), "new place");
                });
                it('sets spotId to be the value of the newly created spot', function(){
                    var newSpot = channel.request('entities:spots').findWhere({name: "new place"});
                    assert.equal(newSpot.id, this.view.ui.spot.val());
                });
            });
        });
    });
});
