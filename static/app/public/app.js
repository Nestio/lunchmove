(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
require('app/constants');

var Router = require('app/router');
var Spots = require('app/entities').Spots;
var Moves = require('app/entities').Moves;
var Move = require('app/entities').Move;
var channel = Backbone.Radio.channel('global');

var spots = new Spots();
var moves = new Moves();
var move = new Move(lunchmove.recent_move);

channel.reply('entities:spots', function(){
    return spots;
});

channel.reply('entities:moves', function(){
    return moves;
});

channel.reply('entities:move', function(){
    return move;
});

new Router();

Backbone.history.start({pushState: true});

},{"app/constants":2,"app/entities":3,"app/router":4}],2:[function(require,module,exports){
var channel = Backbone.Radio.channel('global');

var Constants = {
    RECENT_THRESHOLD: moment().subtract(6, 'hours')
};

channel.comply('get:constant', function(name){
    return Constants[name];
})

},{}],3:[function(require,module,exports){
var channel = Backbone.Radio.channel('global');



var Move = Backbone.Model.extend({
    urlRoot: '/json/moves/'
});

var GroupedMoves = Backbone.Collection.extend({
    comparator: function(model){
        var moves = model.get('moves');
        return moves ? -moves.length : 0;
    }
});

var Moves = Backbone.Collection.extend({
    url: '/json/moves/',
    parse: function(response){
        return response.results;
    },
    groupBySpot: function(){
        return this.reduce(function(collection, move){
            var model = collection.add({id: move.get('spot')});

            if (!model.has('moves')){
                model.set('moves', new Moves());
            }

            model.get('moves').add(move);

            return collection;
        }, new GroupedMoves());
    }
});

var Spot = Backbone.Model.extend({
    urlRoot: '/json/spots/'
});

var Spots = Backbone.Collection.extend({
    url: '/json/spots/',
    parse: function(response){
        return response.results;
    }
});

module.exports = {
    Spots: Spots,
    Moves: Moves,
    Move: Move,
    Spot: Spot
}

},{}],4:[function(require,module,exports){
var LunchMovesView = require('app/views').LunchMovesView;
var MoveFormView = require('app/views').MoveFormView;
var HeaderView = require('app/views').HeaderView;
var LoadingView = require('app/views').LoadingView;

var Move = require('app/entities').Move;
var channel = Backbone.Radio.channel('global');

var regionManager = new Marionette.RegionManager({
    regions: {
        main: '#app',
    }
});

var headerView = new HeaderView();

var Router = Backbone.Router.extend({
    routes: {
        "": "makeMove",
        "moves": "showMoves",
    },

    makeMove: function() {
        regionManager.get('main').show(new LoadingView());
        var move = channel.request('entities:move');
        var spots = channel.request('entities:spots');

        headerView.activate('makeMove');

        spots.fetch().done(function(){
            var formView = new MoveFormView({
                model: move
            });

            regionManager.get('main').show(formView);
        });
    },

    showMoves: function() {
        regionManager.get('main').show(new LoadingView());
        var move = channel.request('entities:move');
        var moves = channel.request('entities:moves');
        var spots = channel.request('entities:spots');

        headerView.activate('showMoves');

        $.when(moves.fetch(), spots.fetch()).done(function(){
            var listView = new LunchMovesView({
                model: move,
                collection: moves.groupBySpot()
            });
            regionManager.get('main').show(listView);
        });
    }

});

module.exports = Router;

},{"app/entities":3,"app/views":5}],5:[function(require,module,exports){

var EmptyTpl = "<div class=\"col-md-12 text-center\">\n    No one's going anywhere, just quite yet.\n</div>\n";
var LunchMoveTpl = "<div class=\"spot-name col-md-6\">\n    <span><%= spotName %></span>\n</div>\n<div class=\"spot-moves col-md-6\">\n    <% moves.each(function(move){ %>\n        <div class=\"move\">\n            <div class=\"move-icon\">\n                <span class=\"glyphicon glyphicon-user\"></span>\n            </div>\n            <div class=\"move-name\">\n                <span><%= isOwnMove(move) ? 'You' : move.get('user') %></span>\n            </div>\n        </div>\n    <% }) %>\n    <% if (!hasOwnMove) { %>\n        <div class=\"move move-new\" data-ui=\"addMove\">\n            <div class=\"move-icon\">\n                <span class=\"glyphicon glyphicon-plus\"></span>\n            </div>\n            <div class=\"move-name\">\n                <span>Go Here</span>\n            </div>\n        </div>\n    <% } %>\n</div>\n";
var LunchMovesTpl = "<div class=\"container\">\n    <div class=\"row\">\n        <div class=\"col-md-12\">\n            <h1 class=\"text-center\">Lunch Moves!</h1>\n        </div>\n    </div>\n</div>\n<div class=\"container moves-container\">\n</div>\n";
var LoadingTpl = "<div class=\"container\">\n    <div class=\"row loading-container\">\n        <div class=\"sk-spinner sk-spinner-rotating-plane\"></div>\n    </div>\n</div>\n";
var MoveFormTpl = "<div class=\"jumbotron lunch-move-form\">\n    <div class=\"container\">\n        <div class=\"row\">\n            <div class=\"col-md-12 text-center\">\n                <h1 class=\"question\">What's your lunch move?</h1>\n                <form>\n                    <div class=\"form-inline\">\n                        <div class=\"form-group\">\n                            <input type=\"text\" class=\"form-control name-field\" name=\"user\" placeholder=\"you\">\n                        </div>\n                        <div class=\"form-group\">\n                            <p class=\"form-control-static\">is going to</p>\n                        </div>\n                        <div class=\"form-group\">\n                            <input class=\"form-control spot-field\" type=\"text\" name=\"spot\" placeholder=\"place\">\n                            <input type=\"hidden\" name=\"spot_id\">\n                        </div>\n                    </div>\n                </form>\n            </div>\n        </div>\n    </div>\n</div>\n";
var EmptyQueryTpl = "<div class=\"tt-empty\">\n    <button type=\"button\" class=\"btn btn-default\" data-action=\"addSpot\">Add \"<%= query %>\"</button>\n</div>\n";
var Spot = require('app/entities').Spot;

var channel = Backbone.Radio.channel('global');

var LunchMoveView = Marionette.ItemView.extend({
    modelEvents: {
        'change:moves': 'render'
    },
    edit: function(e){
        Backbone.history.navigate('', {trigger: true});
        e.preventDefault();
    },
    events: {
        'click @ui.addMove': 'addMove'
    },
    ui: {
        'addMove': '[data-ui="addMove"]'
    },
    addMove: function(){
        var view = this;
        var ownMove = channel.request('entities:move')
        ownMove.save({
            spot: this.model.id
        }).done(function(){
            var moves = channel.request('entities:moves');
            moves.add(ownMove, {merge: true});
            ownMove.trigger('update');
        });
    },
    className: 'row move-row',
    template: _.template(LunchMoveTpl),
    templateHelpers: function(){
        var ownMove =  channel.request('entities:move');
        return {
            spotName: channel.request('entities:spots').get(this.model.id).get('name'),
            isOwnMove: function(move){
                return ownMove.id === move.id;
            },
            hasOwnMove: !!this.model.get('moves').get(ownMove.id)
        }
    }
});

var EmptyView = Marionette.ItemView.extend({
    className: 'row',
    template: _.template(EmptyTpl)
});

var LunchMovesView = Marionette.CompositeView.extend({
    modelEvents: {
        'update': 'recalculateMoves'
    },
    template: _.template(LunchMovesTpl),
    childView: LunchMoveView,
    emptyView: EmptyView,
    childViewContainer: '.moves-container',
    recalculateMoves: function(){
        var previousSpot;

        this.collection.each(function(model){
            model.get('moves').each(function(move){
                if (move.id === this.model.id) {
                    previousSpot = model.id;
                }
            }, this);
        }, this);

        if (previousSpot) {
            var previousModel = this.collection.get(previousSpot);
            previousModel.get('moves').remove(this.model.id);
            previousModel.trigger('change:moves');
        }

        var newModel = this.collection.get(this.model.get('spot'));
        newModel.get('moves').add(this.model);
        newModel.trigger('change:moves');
    }
});

var MoveFormView = Marionette.ItemView.extend({
    template: _.template(MoveFormTpl),
    ui: {
        'form': 'form',
        'spot': '[name="spot"]',
        'spotId': '[name="spot_id"]',
        'user': '[name="user"]'
    },
    events: {
        'typeahead:select @ui.spot': 'onTypeaheadSelect',
        'click [data-action="addSpot"]': 'addSpot',
        'change @ui.form': 'onFormChange',
        'blur @ui.spot': 'onSpotBlur',
        'keydown input': function(e){
            if (e.keyCode === 13) {
                e.preventDefault();
                $(e.currentTarget).blur();
            }
        }
    },
    addSpot: function(){
        var spot = new Spot({
            name: this.ui.spot.typeahead('val')
        });

        spot.save({}, {
            success: _.bind(function(){
                channel.request('entities:spots').add(spot);
                this.ui.spot.typeahead('val', spot.get('name')).blur();
            }, this)
        });
    },
    deserializeModel: function(){
        var user = this.model.get('user');
        if (user) {
            this.ui.user.val(user);
        }
        var spot = this.model.get('spot')
        if (spot) {
            var spotName = channel.request('entities:spots').get(spot).get('name');
            this.ui.spot.typeahead('val', spotName);
        }
    },
    onShow: function(){
        this.renderTypeahead();
        this.deserializeModel();
    },
    renderTypeahead: function(){
        var spots = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: channel.request('entities:spots').toJSON()
        });

        this.ui.spot.typeahead({
            hint: true,
            highlight: true,
            minLength: 1
        },
        {
            display: 'name',
            name: 'spots',
            source: spots,
            templates: {
                empty: _.template(EmptyQueryTpl)
            }
        });
    },
    onFormChange: function(){
        if (this._disableSaving) {
            return;
        }

        var spotId = this.ui.spotId.val();
        var user = this.ui.user.val();

        if (spotId && user) {
            this._disableSaving = true;

            this.model.save({
                spot: spotId,
                user: user
            }, {
                success: function(){
                    Backbone.history.navigate('/moves', {trigger: true});
                }
            });
        }
    },
    onSpotBlur: function(){
        var spots = channel.request('entities:spots');
        var spotId = this.ui.spotId.val();

        if (!spotId) {
            var spotVal = this.ui.spot.typeahead('val');
            var selectedSpot = spots.find(function(spot){
                return spot.get('name').toLowerCase() == spotVal.toLowerCase();
            });

            if (selectedSpot) {
                this.ui.spotId.val(selectedSpot.id).change();
                spotId = selectedSpot.id;
            }
        }

        this.ui.spot.typeahead('val', spotId ? spots.get(+spotId).get('name') : '');
    },
    onTypeaheadSelect: function(e, obj){
        this.ui.spotId.val(obj.id).change();
    },
    templateHelpers: function(){
        return {
            spots: channel.request('entities:spots').toJSON()
        }
    }
});

var HeaderView = Marionette.ItemView.extend({
    el: '#header',
    events: {
        'click a': 'navigate'
    },
    template: false,
    activate: function(methodName){
        this.$('.navbar-nav li').removeClass('active');
        this.$('[data-action="' + methodName + '"]').addClass('active');
    },
    navigate: function(e){
        e.preventDefault();
        var route = $(e.currentTarget).attr('href').replace('../', '');
        Backbone.history.navigate(route, {trigger: true});
    }
});

var LoadingView = Marionette.ItemView.extend({
    template: _.template(LoadingTpl)
});



module.exports = {
    LunchMovesView: LunchMovesView,
    LoadingView: LoadingView,
    MoveFormView: MoveFormView,
    HeaderView: HeaderView
}

},{"app/entities":3}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvYXBwLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9jb25zdGFudHMuanMiLCJub2RlX21vZHVsZXMvYXBwL2VudGl0aWVzLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9yb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvYXBwL3ZpZXdzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwicmVxdWlyZSgnYXBwL2NvbnN0YW50cycpO1xuXG52YXIgUm91dGVyID0gcmVxdWlyZSgnYXBwL3JvdXRlcicpO1xudmFyIFNwb3RzID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuU3BvdHM7XG52YXIgTW92ZXMgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5Nb3ZlcztcbnZhciBNb3ZlID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuTW92ZTtcbnZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciBzcG90cyA9IG5ldyBTcG90cygpO1xudmFyIG1vdmVzID0gbmV3IE1vdmVzKCk7XG52YXIgbW92ZSA9IG5ldyBNb3ZlKGx1bmNobW92ZS5yZWNlbnRfbW92ZSk7XG5cbmNoYW5uZWwucmVwbHkoJ2VudGl0aWVzOnNwb3RzJywgZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gc3BvdHM7XG59KTtcblxuY2hhbm5lbC5yZXBseSgnZW50aXRpZXM6bW92ZXMnLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBtb3Zlcztcbn0pO1xuXG5jaGFubmVsLnJlcGx5KCdlbnRpdGllczptb3ZlJywgZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gbW92ZTtcbn0pO1xuXG5uZXcgUm91dGVyKCk7XG5cbkJhY2tib25lLmhpc3Rvcnkuc3RhcnQoe3B1c2hTdGF0ZTogdHJ1ZX0pO1xuIiwidmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxudmFyIENvbnN0YW50cyA9IHtcbiAgICBSRUNFTlRfVEhSRVNIT0xEOiBtb21lbnQoKS5zdWJ0cmFjdCg2LCAnaG91cnMnKVxufTtcblxuY2hhbm5lbC5jb21wbHkoJ2dldDpjb25zdGFudCcsIGZ1bmN0aW9uKG5hbWUpe1xuICAgIHJldHVybiBDb25zdGFudHNbbmFtZV07XG59KVxuIiwidmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxuXG5cbnZhciBNb3ZlID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgICB1cmxSb290OiAnL2pzb24vbW92ZXMvJ1xufSk7XG5cbnZhciBHcm91cGVkTW92ZXMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgY29tcGFyYXRvcjogZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICB2YXIgbW92ZXMgPSBtb2RlbC5nZXQoJ21vdmVzJyk7XG4gICAgICAgIHJldHVybiBtb3ZlcyA/IC1tb3Zlcy5sZW5ndGggOiAwO1xuICAgIH1cbn0pO1xuXG52YXIgTW92ZXMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgdXJsOiAnL2pzb24vbW92ZXMvJyxcbiAgICBwYXJzZTogZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVzdWx0cztcbiAgICB9LFxuICAgIGdyb3VwQnlTcG90OiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gdGhpcy5yZWR1Y2UoZnVuY3Rpb24oY29sbGVjdGlvbiwgbW92ZSl7XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSBjb2xsZWN0aW9uLmFkZCh7aWQ6IG1vdmUuZ2V0KCdzcG90Jyl9KTtcblxuICAgICAgICAgICAgaWYgKCFtb2RlbC5oYXMoJ21vdmVzJykpe1xuICAgICAgICAgICAgICAgIG1vZGVsLnNldCgnbW92ZXMnLCBuZXcgTW92ZXMoKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1vZGVsLmdldCgnbW92ZXMnKS5hZGQobW92ZSk7XG5cbiAgICAgICAgICAgIHJldHVybiBjb2xsZWN0aW9uO1xuICAgICAgICB9LCBuZXcgR3JvdXBlZE1vdmVzKCkpO1xuICAgIH1cbn0pO1xuXG52YXIgU3BvdCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgdXJsUm9vdDogJy9qc29uL3Nwb3RzLydcbn0pO1xuXG52YXIgU3BvdHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgdXJsOiAnL2pzb24vc3BvdHMvJyxcbiAgICBwYXJzZTogZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVzdWx0cztcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgU3BvdHM6IFNwb3RzLFxuICAgIE1vdmVzOiBNb3ZlcyxcbiAgICBNb3ZlOiBNb3ZlLFxuICAgIFNwb3Q6IFNwb3Rcbn1cbiIsInZhciBMdW5jaE1vdmVzVmlldyA9IHJlcXVpcmUoJ2FwcC92aWV3cycpLkx1bmNoTW92ZXNWaWV3O1xudmFyIE1vdmVGb3JtVmlldyA9IHJlcXVpcmUoJ2FwcC92aWV3cycpLk1vdmVGb3JtVmlldztcbnZhciBIZWFkZXJWaWV3ID0gcmVxdWlyZSgnYXBwL3ZpZXdzJykuSGVhZGVyVmlldztcbnZhciBMb2FkaW5nVmlldyA9IHJlcXVpcmUoJ2FwcC92aWV3cycpLkxvYWRpbmdWaWV3O1xuXG52YXIgTW92ZSA9IHJlcXVpcmUoJ2FwcC9lbnRpdGllcycpLk1vdmU7XG52YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgcmVnaW9uTWFuYWdlciA9IG5ldyBNYXJpb25ldHRlLlJlZ2lvbk1hbmFnZXIoe1xuICAgIHJlZ2lvbnM6IHtcbiAgICAgICAgbWFpbjogJyNhcHAnLFxuICAgIH1cbn0pO1xuXG52YXIgaGVhZGVyVmlldyA9IG5ldyBIZWFkZXJWaWV3KCk7XG5cbnZhciBSb3V0ZXIgPSBCYWNrYm9uZS5Sb3V0ZXIuZXh0ZW5kKHtcbiAgICByb3V0ZXM6IHtcbiAgICAgICAgXCJcIjogXCJtYWtlTW92ZVwiLFxuICAgICAgICBcIm1vdmVzXCI6IFwic2hvd01vdmVzXCIsXG4gICAgfSxcblxuICAgIG1ha2VNb3ZlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVnaW9uTWFuYWdlci5nZXQoJ21haW4nKS5zaG93KG5ldyBMb2FkaW5nVmlldygpKTtcbiAgICAgICAgdmFyIG1vdmUgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmUnKTtcbiAgICAgICAgdmFyIHNwb3RzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpO1xuXG4gICAgICAgIGhlYWRlclZpZXcuYWN0aXZhdGUoJ21ha2VNb3ZlJyk7XG5cbiAgICAgICAgc3BvdHMuZmV0Y2goKS5kb25lKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgZm9ybVZpZXcgPSBuZXcgTW92ZUZvcm1WaWV3KHtcbiAgICAgICAgICAgICAgICBtb2RlbDogbW92ZVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJlZ2lvbk1hbmFnZXIuZ2V0KCdtYWluJykuc2hvdyhmb3JtVmlldyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBzaG93TW92ZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWdpb25NYW5hZ2VyLmdldCgnbWFpbicpLnNob3cobmV3IExvYWRpbmdWaWV3KCkpO1xuICAgICAgICB2YXIgbW92ZSA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZScpO1xuICAgICAgICB2YXIgbW92ZXMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmVzJyk7XG4gICAgICAgIHZhciBzcG90cyA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKTtcblxuICAgICAgICBoZWFkZXJWaWV3LmFjdGl2YXRlKCdzaG93TW92ZXMnKTtcblxuICAgICAgICAkLndoZW4obW92ZXMuZmV0Y2goKSwgc3BvdHMuZmV0Y2goKSkuZG9uZShmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIGxpc3RWaWV3ID0gbmV3IEx1bmNoTW92ZXNWaWV3KHtcbiAgICAgICAgICAgICAgICBtb2RlbDogbW92ZSxcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiBtb3Zlcy5ncm91cEJ5U3BvdCgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJlZ2lvbk1hbmFnZXIuZ2V0KCdtYWluJykuc2hvdyhsaXN0Vmlldyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gUm91dGVyO1xuIiwiXG52YXIgRW1wdHlUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbC1tZC0xMiB0ZXh0LWNlbnRlclxcXCI+XFxuICAgIE5vIG9uZSdzIGdvaW5nIGFueXdoZXJlLCBqdXN0IHF1aXRlIHlldC5cXG48L2Rpdj5cXG5cIjtcbnZhciBMdW5jaE1vdmVUcGwgPSBcIjxkaXYgY2xhc3M9XFxcInNwb3QtbmFtZSBjb2wtbWQtNlxcXCI+XFxuICAgIDxzcGFuPjwlPSBzcG90TmFtZSAlPjwvc3Bhbj5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJzcG90LW1vdmVzIGNvbC1tZC02XFxcIj5cXG4gICAgPCUgbW92ZXMuZWFjaChmdW5jdGlvbihtb3ZlKXsgJT5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmVcXFwiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmUtaWNvblxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXVzZXJcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlLW5hbWVcXFwiPlxcbiAgICAgICAgICAgICAgICA8c3Bhbj48JT0gaXNPd25Nb3ZlKG1vdmUpID8gJ1lvdScgOiBtb3ZlLmdldCgndXNlcicpICU+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwlIH0pICU+XFxuICAgIDwlIGlmICghaGFzT3duTW92ZSkgeyAlPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZSBtb3ZlLW5ld1xcXCIgZGF0YS11aT1cXFwiYWRkTW92ZVxcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZS1pY29uXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcGx1c1xcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmUtbmFtZVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuPkdvIEhlcmU8L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPCUgfSAlPlxcbjwvZGl2PlxcblwiO1xudmFyIEx1bmNoTW92ZXNUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbnRhaW5lclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInJvd1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjb2wtbWQtMTJcXFwiPlxcbiAgICAgICAgICAgIDxoMSBjbGFzcz1cXFwidGV4dC1jZW50ZXJcXFwiPkx1bmNoIE1vdmVzITwvaDE+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiY29udGFpbmVyIG1vdmVzLWNvbnRhaW5lclxcXCI+XFxuPC9kaXY+XFxuXCI7XG52YXIgTG9hZGluZ1RwbCA9IFwiPGRpdiBjbGFzcz1cXFwiY29udGFpbmVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicm93IGxvYWRpbmctY29udGFpbmVyXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInNrLXNwaW5uZXIgc2stc3Bpbm5lci1yb3RhdGluZy1wbGFuZVxcXCI+PC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xudmFyIE1vdmVGb3JtVHBsID0gXCI8ZGl2IGNsYXNzPVxcXCJqdW1ib3Ryb24gbHVuY2gtbW92ZS1mb3JtXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY29udGFpbmVyXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInJvd1xcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiY29sLW1kLTEyIHRleHQtY2VudGVyXFxcIj5cXG4gICAgICAgICAgICAgICAgPGgxIGNsYXNzPVxcXCJxdWVzdGlvblxcXCI+V2hhdCdzIHlvdXIgbHVuY2ggbW92ZT88L2gxPlxcbiAgICAgICAgICAgICAgICA8Zm9ybT5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0taW5saW5lXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcInRleHRcXFwiIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2wgbmFtZS1maWVsZFxcXCIgbmFtZT1cXFwidXNlclxcXCIgcGxhY2Vob2xkZXI9XFxcInlvdVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2wtc3RhdGljXFxcIj5pcyBnb2luZyB0bzwvcD5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJmb3JtLWNvbnRyb2wgc3BvdC1maWVsZFxcXCIgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwic3BvdFxcXCIgcGxhY2Vob2xkZXI9XFxcInBsYWNlXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImhpZGRlblxcXCIgbmFtZT1cXFwic3BvdF9pZFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPC9mb3JtPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xudmFyIEVtcHR5UXVlcnlUcGwgPSBcIjxkaXYgY2xhc3M9XFxcInR0LWVtcHR5XFxcIj5cXG4gICAgPGJ1dHRvbiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHRcXFwiIGRhdGEtYWN0aW9uPVxcXCJhZGRTcG90XFxcIj5BZGQgXFxcIjwlPSBxdWVyeSAlPlxcXCI8L2J1dHRvbj5cXG48L2Rpdj5cXG5cIjtcbnZhciBTcG90ID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuU3BvdDtcblxudmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxudmFyIEx1bmNoTW92ZVZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgbW9kZWxFdmVudHM6IHtcbiAgICAgICAgJ2NoYW5nZTptb3Zlcyc6ICdyZW5kZXInXG4gICAgfSxcbiAgICBlZGl0OiBmdW5jdGlvbihlKXtcbiAgICAgICAgQmFja2JvbmUuaGlzdG9yeS5uYXZpZ2F0ZSgnJywge3RyaWdnZXI6IHRydWV9KTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICAgICdjbGljayBAdWkuYWRkTW92ZSc6ICdhZGRNb3ZlJ1xuICAgIH0sXG4gICAgdWk6IHtcbiAgICAgICAgJ2FkZE1vdmUnOiAnW2RhdGEtdWk9XCJhZGRNb3ZlXCJdJ1xuICAgIH0sXG4gICAgYWRkTW92ZTogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHZpZXcgPSB0aGlzO1xuICAgICAgICB2YXIgb3duTW92ZSA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZScpXG4gICAgICAgIG93bk1vdmUuc2F2ZSh7XG4gICAgICAgICAgICBzcG90OiB0aGlzLm1vZGVsLmlkXG4gICAgICAgIH0pLmRvbmUoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciBtb3ZlcyA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZXMnKTtcbiAgICAgICAgICAgIG1vdmVzLmFkZChvd25Nb3ZlLCB7bWVyZ2U6IHRydWV9KTtcbiAgICAgICAgICAgIG93bk1vdmUudHJpZ2dlcigndXBkYXRlJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgY2xhc3NOYW1lOiAncm93IG1vdmUtcm93JyxcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShMdW5jaE1vdmVUcGwpLFxuICAgIHRlbXBsYXRlSGVscGVyczogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIG93bk1vdmUgPSAgY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlJyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzcG90TmFtZTogY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLmdldCh0aGlzLm1vZGVsLmlkKS5nZXQoJ25hbWUnKSxcbiAgICAgICAgICAgIGlzT3duTW92ZTogZnVuY3Rpb24obW92ZSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG93bk1vdmUuaWQgPT09IG1vdmUuaWQ7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaGFzT3duTW92ZTogISF0aGlzLm1vZGVsLmdldCgnbW92ZXMnKS5nZXQob3duTW92ZS5pZClcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG52YXIgRW1wdHlWaWV3ID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuICAgIGNsYXNzTmFtZTogJ3JvdycsXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoRW1wdHlUcGwpXG59KTtcblxudmFyIEx1bmNoTW92ZXNWaWV3ID0gTWFyaW9uZXR0ZS5Db21wb3NpdGVWaWV3LmV4dGVuZCh7XG4gICAgbW9kZWxFdmVudHM6IHtcbiAgICAgICAgJ3VwZGF0ZSc6ICdyZWNhbGN1bGF0ZU1vdmVzJ1xuICAgIH0sXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTHVuY2hNb3Zlc1RwbCksXG4gICAgY2hpbGRWaWV3OiBMdW5jaE1vdmVWaWV3LFxuICAgIGVtcHR5VmlldzogRW1wdHlWaWV3LFxuICAgIGNoaWxkVmlld0NvbnRhaW5lcjogJy5tb3Zlcy1jb250YWluZXInLFxuICAgIHJlY2FsY3VsYXRlTW92ZXM6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBwcmV2aW91c1Nwb3Q7XG5cbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgbW9kZWwuZ2V0KCdtb3ZlcycpLmVhY2goZnVuY3Rpb24obW92ZSl7XG4gICAgICAgICAgICAgICAgaWYgKG1vdmUuaWQgPT09IHRoaXMubW9kZWwuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNTcG90ID0gbW9kZWwuaWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAgIGlmIChwcmV2aW91c1Nwb3QpIHtcbiAgICAgICAgICAgIHZhciBwcmV2aW91c01vZGVsID0gdGhpcy5jb2xsZWN0aW9uLmdldChwcmV2aW91c1Nwb3QpO1xuICAgICAgICAgICAgcHJldmlvdXNNb2RlbC5nZXQoJ21vdmVzJykucmVtb3ZlKHRoaXMubW9kZWwuaWQpO1xuICAgICAgICAgICAgcHJldmlvdXNNb2RlbC50cmlnZ2VyKCdjaGFuZ2U6bW92ZXMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBuZXdNb2RlbCA9IHRoaXMuY29sbGVjdGlvbi5nZXQodGhpcy5tb2RlbC5nZXQoJ3Nwb3QnKSk7XG4gICAgICAgIG5ld01vZGVsLmdldCgnbW92ZXMnKS5hZGQodGhpcy5tb2RlbCk7XG4gICAgICAgIG5ld01vZGVsLnRyaWdnZXIoJ2NoYW5nZTptb3ZlcycpO1xuICAgIH1cbn0pO1xuXG52YXIgTW92ZUZvcm1WaWV3ID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKE1vdmVGb3JtVHBsKSxcbiAgICB1aToge1xuICAgICAgICAnZm9ybSc6ICdmb3JtJyxcbiAgICAgICAgJ3Nwb3QnOiAnW25hbWU9XCJzcG90XCJdJyxcbiAgICAgICAgJ3Nwb3RJZCc6ICdbbmFtZT1cInNwb3RfaWRcIl0nLFxuICAgICAgICAndXNlcic6ICdbbmFtZT1cInVzZXJcIl0nXG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgICAgJ3R5cGVhaGVhZDpzZWxlY3QgQHVpLnNwb3QnOiAnb25UeXBlYWhlYWRTZWxlY3QnLFxuICAgICAgICAnY2xpY2sgW2RhdGEtYWN0aW9uPVwiYWRkU3BvdFwiXSc6ICdhZGRTcG90JyxcbiAgICAgICAgJ2NoYW5nZSBAdWkuZm9ybSc6ICdvbkZvcm1DaGFuZ2UnLFxuICAgICAgICAnYmx1ciBAdWkuc3BvdCc6ICdvblNwb3RCbHVyJyxcbiAgICAgICAgJ2tleWRvd24gaW5wdXQnOiBmdW5jdGlvbihlKXtcbiAgICAgICAgICAgIGlmIChlLmtleUNvZGUgPT09IDEzKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICQoZS5jdXJyZW50VGFyZ2V0KS5ibHVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGFkZFNwb3Q6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzcG90ID0gbmV3IFNwb3Qoe1xuICAgICAgICAgICAgbmFtZTogdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJylcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc3BvdC5zYXZlKHt9LCB7XG4gICAgICAgICAgICBzdWNjZXNzOiBfLmJpbmQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykuYWRkKHNwb3QpO1xuICAgICAgICAgICAgICAgIHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcsIHNwb3QuZ2V0KCduYW1lJykpLmJsdXIoKTtcbiAgICAgICAgICAgIH0sIHRoaXMpXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgZGVzZXJpYWxpemVNb2RlbDogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHVzZXIgPSB0aGlzLm1vZGVsLmdldCgndXNlcicpO1xuICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgdGhpcy51aS51c2VyLnZhbCh1c2VyKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3BvdCA9IHRoaXMubW9kZWwuZ2V0KCdzcG90JylcbiAgICAgICAgaWYgKHNwb3QpIHtcbiAgICAgICAgICAgIHZhciBzcG90TmFtZSA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS5nZXQoc3BvdCkuZ2V0KCduYW1lJyk7XG4gICAgICAgICAgICB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnLCBzcG90TmFtZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIG9uU2hvdzogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5yZW5kZXJUeXBlYWhlYWQoKTtcbiAgICAgICAgdGhpcy5kZXNlcmlhbGl6ZU1vZGVsKCk7XG4gICAgfSxcbiAgICByZW5kZXJUeXBlYWhlYWQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzcG90cyA9IG5ldyBCbG9vZGhvdW5kKHtcbiAgICAgICAgICAgIGRhdHVtVG9rZW5pemVyOiBCbG9vZGhvdW5kLnRva2VuaXplcnMub2JqLndoaXRlc3BhY2UoJ25hbWUnKSxcbiAgICAgICAgICAgIHF1ZXJ5VG9rZW5pemVyOiBCbG9vZGhvdW5kLnRva2VuaXplcnMud2hpdGVzcGFjZSxcbiAgICAgICAgICAgIGxvY2FsOiBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykudG9KU09OKClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy51aS5zcG90LnR5cGVhaGVhZCh7XG4gICAgICAgICAgICBoaW50OiB0cnVlLFxuICAgICAgICAgICAgaGlnaGxpZ2h0OiB0cnVlLFxuICAgICAgICAgICAgbWluTGVuZ3RoOiAxXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGRpc3BsYXk6ICduYW1lJyxcbiAgICAgICAgICAgIG5hbWU6ICdzcG90cycsXG4gICAgICAgICAgICBzb3VyY2U6IHNwb3RzLFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgZW1wdHk6IF8udGVtcGxhdGUoRW1wdHlRdWVyeVRwbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBvbkZvcm1DaGFuZ2U6IGZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICh0aGlzLl9kaXNhYmxlU2F2aW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgc3BvdElkID0gdGhpcy51aS5zcG90SWQudmFsKCk7XG4gICAgICAgIHZhciB1c2VyID0gdGhpcy51aS51c2VyLnZhbCgpO1xuXG4gICAgICAgIGlmIChzcG90SWQgJiYgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5fZGlzYWJsZVNhdmluZyA9IHRydWU7XG5cbiAgICAgICAgICAgIHRoaXMubW9kZWwuc2F2ZSh7XG4gICAgICAgICAgICAgICAgc3BvdDogc3BvdElkLFxuICAgICAgICAgICAgICAgIHVzZXI6IHVzZXJcbiAgICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICBCYWNrYm9uZS5oaXN0b3J5Lm5hdmlnYXRlKCcvbW92ZXMnLCB7dHJpZ2dlcjogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBvblNwb3RCbHVyOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3BvdHMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJyk7XG4gICAgICAgIHZhciBzcG90SWQgPSB0aGlzLnVpLnNwb3RJZC52YWwoKTtcblxuICAgICAgICBpZiAoIXNwb3RJZCkge1xuICAgICAgICAgICAgdmFyIHNwb3RWYWwgPSB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnKTtcbiAgICAgICAgICAgIHZhciBzZWxlY3RlZFNwb3QgPSBzcG90cy5maW5kKGZ1bmN0aW9uKHNwb3Qpe1xuICAgICAgICAgICAgICAgIHJldHVybiBzcG90LmdldCgnbmFtZScpLnRvTG93ZXJDYXNlKCkgPT0gc3BvdFZhbC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChzZWxlY3RlZFNwb3QpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVpLnNwb3RJZC52YWwoc2VsZWN0ZWRTcG90LmlkKS5jaGFuZ2UoKTtcbiAgICAgICAgICAgICAgICBzcG90SWQgPSBzZWxlY3RlZFNwb3QuaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnLCBzcG90SWQgPyBzcG90cy5nZXQoK3Nwb3RJZCkuZ2V0KCduYW1lJykgOiAnJyk7XG4gICAgfSxcbiAgICBvblR5cGVhaGVhZFNlbGVjdDogZnVuY3Rpb24oZSwgb2JqKXtcbiAgICAgICAgdGhpcy51aS5zcG90SWQudmFsKG9iai5pZCkuY2hhbmdlKCk7XG4gICAgfSxcbiAgICB0ZW1wbGF0ZUhlbHBlcnM6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzcG90czogY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLnRvSlNPTigpXG4gICAgICAgIH1cbiAgICB9XG59KTtcblxudmFyIEhlYWRlclZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgZWw6ICcjaGVhZGVyJyxcbiAgICBldmVudHM6IHtcbiAgICAgICAgJ2NsaWNrIGEnOiAnbmF2aWdhdGUnXG4gICAgfSxcbiAgICB0ZW1wbGF0ZTogZmFsc2UsXG4gICAgYWN0aXZhdGU6IGZ1bmN0aW9uKG1ldGhvZE5hbWUpe1xuICAgICAgICB0aGlzLiQoJy5uYXZiYXItbmF2IGxpJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB0aGlzLiQoJ1tkYXRhLWFjdGlvbj1cIicgKyBtZXRob2ROYW1lICsgJ1wiXScpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICB9LFxuICAgIG5hdmlnYXRlOiBmdW5jdGlvbihlKXtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgcm91dGUgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignaHJlZicpLnJlcGxhY2UoJy4uLycsICcnKTtcbiAgICAgICAgQmFja2JvbmUuaGlzdG9yeS5uYXZpZ2F0ZShyb3V0ZSwge3RyaWdnZXI6IHRydWV9KTtcbiAgICB9XG59KTtcblxudmFyIExvYWRpbmdWaWV3ID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKExvYWRpbmdUcGwpXG59KTtcblxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIEx1bmNoTW92ZXNWaWV3OiBMdW5jaE1vdmVzVmlldyxcbiAgICBMb2FkaW5nVmlldzogTG9hZGluZ1ZpZXcsXG4gICAgTW92ZUZvcm1WaWV3OiBNb3ZlRm9ybVZpZXcsXG4gICAgSGVhZGVyVmlldzogSGVhZGVyVmlld1xufVxuIl19
