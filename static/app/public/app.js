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
    urlRoot: '/json/moves/',
    defaults: {
        time: moment()
    }
});

var GroupedMoves = Backbone.Collection.extend({
    comparator: function(model){
        var moves = model.get('moves');
        return moves ? -moves.length : 0;
    }
});

var Moves = Backbone.Collection.extend({
    model: Move,
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
var LoadingView = require('app/views').LoadingView;
var LayoutView = require('app/views').LayoutView;

var Move = require('app/entities').Move;
var channel = Backbone.Radio.channel('global');

var regionManager = new Marionette.RegionManager({
    regions: {
        main: '#app',
    }
});

var Router = Backbone.Router.extend({
    routes: {
        "": "showMove",
        "moves": "showMoves",
    },

    showMoves: function() {
        regionManager.get('main').show(new LoadingView());
        var move = channel.request('entities:move');
        var moves = channel.request('entities:moves');
        var spots = channel.request('entities:spots');

        $.when(moves.fetch(), spots.fetch()).done(function(){
            var layoutView = new LayoutView({
                model: move,
                collection: moves.groupBySpot()
            });

            regionManager.get('main').show(layoutView);
        });
    }

});

module.exports = Router;

},{"app/entities":3,"app/views":5}],5:[function(require,module,exports){

var LayoutTpl = "<div data-region=\"form\"></div>\n<div data-region=\"moves\"></div>\n";
var EmptyTpl = "<div class=\"col-md-12 text-center\">\n    No one's going anywhere, just quite yet.\n</div>\n";
var LunchMoveTpl = "<div class=\"spot-name col-md-3\">\n    <span><%= spotName %></span>\n</div>\n<div class=\"spot-moves col-md-9\">\n    <% moves.each(function(move){ %>\n        <div class=\"move\">\n            <div class=\"move-time\">\n                <span><%= move.get('time').format('h:mm') %></span>\n            </div>\n            <div class=\"move-name\">\n                <span><%= isOwnMove(move) ? 'You' : move.get('user') %></span>\n            </div>\n        </div>\n    <% }) %>\n    <% if (!hasOwnMove) { %>\n        <div class=\"move move-new\" data-ui=\"addMove\">\n            <div class=\"move-icon\">\n                <span class=\"glyphicon glyphicon-plus\"></span>\n            </div>\n            <div class=\"move-name\">\n                <span>Go Here</span>\n            </div>\n        </div>\n    <% } %>\n</div>\n";
var LunchMovesTpl = "<div class=\"container moves-container\"></div>\n";
var LoadingTpl = "<div class=\"container\">\n    <div class=\"row loading-container\">\n        <div class=\"sk-spinner sk-spinner-rotating-plane\"></div>\n    </div>\n</div>\n";
var MoveFormTpl = "<header id=\"header\" class='navbar navbar-static-top main-header'>\n    <div class=\"container\">\n        <div class=\"navbar-header\">\n            <form class=\"navbar-form navbar-left lunch-move-form\">\n                <div class=\"form-group\">\n                    <p class=\"form-control-static\">You are eating</p>\n                </div>\n                <div class=\"form-group\">\n                    <input class=\"form-control spot-field\" type=\"text\" name=\"spot\" placeholder=\"place\">\n                    <input type=\"hidden\" name=\"spot_id\">\n                </div>\n            </form>\n        </div>\n        <nav id=\"navbar\" class=\"collapse navbar-collapse\"></nav>\n    </div>\n</header>\n";
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

var LayoutView = Marionette.LayoutView.extend({
    template: _.template(LayoutTpl),
    regions: {
        'form': '[data-region="form"]',
        'moves': '[data-region="moves"]'
    },
    onShow: function(){
        this.showChildView('form', new MoveFormView({
            model: this.model
        }));

        this.showChildView('moves', new LunchMovesView({
            model: this.model,
            collection: this.collection
        }));
    }
});


var LoadingView = Marionette.ItemView.extend({
    template: _.template(LoadingTpl)
});



module.exports = {
    LunchMovesView: LunchMovesView,
    LoadingView: LoadingView,
    MoveFormView: MoveFormView,
    LayoutView: LayoutView
}

},{"app/entities":3}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvYXBwLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9jb25zdGFudHMuanMiLCJub2RlX21vZHVsZXMvYXBwL2VudGl0aWVzLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9yb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvYXBwL3ZpZXdzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwicmVxdWlyZSgnYXBwL2NvbnN0YW50cycpO1xuXG52YXIgUm91dGVyID0gcmVxdWlyZSgnYXBwL3JvdXRlcicpO1xudmFyIFNwb3RzID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuU3BvdHM7XG52YXIgTW92ZXMgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5Nb3ZlcztcbnZhciBNb3ZlID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuTW92ZTtcbnZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciBzcG90cyA9IG5ldyBTcG90cygpO1xudmFyIG1vdmVzID0gbmV3IE1vdmVzKCk7XG52YXIgbW92ZSA9IG5ldyBNb3ZlKGx1bmNobW92ZS5yZWNlbnRfbW92ZSk7XG5cbmNoYW5uZWwucmVwbHkoJ2VudGl0aWVzOnNwb3RzJywgZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gc3BvdHM7XG59KTtcblxuY2hhbm5lbC5yZXBseSgnZW50aXRpZXM6bW92ZXMnLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBtb3Zlcztcbn0pO1xuXG5jaGFubmVsLnJlcGx5KCdlbnRpdGllczptb3ZlJywgZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gbW92ZTtcbn0pO1xuXG5uZXcgUm91dGVyKCk7XG5cbkJhY2tib25lLmhpc3Rvcnkuc3RhcnQoe3B1c2hTdGF0ZTogdHJ1ZX0pO1xuIiwidmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxudmFyIENvbnN0YW50cyA9IHtcbiAgICBSRUNFTlRfVEhSRVNIT0xEOiBtb21lbnQoKS5zdWJ0cmFjdCg2LCAnaG91cnMnKVxufTtcblxuY2hhbm5lbC5jb21wbHkoJ2dldDpjb25zdGFudCcsIGZ1bmN0aW9uKG5hbWUpe1xuICAgIHJldHVybiBDb25zdGFudHNbbmFtZV07XG59KVxuIiwidmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxuXG5cbnZhciBNb3ZlID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgICB1cmxSb290OiAnL2pzb24vbW92ZXMvJyxcbiAgICBkZWZhdWx0czoge1xuICAgICAgICB0aW1lOiBtb21lbnQoKVxuICAgIH1cbn0pO1xuXG52YXIgR3JvdXBlZE1vdmVzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIGNvbXBhcmF0b3I6IGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgdmFyIG1vdmVzID0gbW9kZWwuZ2V0KCdtb3ZlcycpO1xuICAgICAgICByZXR1cm4gbW92ZXMgPyAtbW92ZXMubGVuZ3RoIDogMDtcbiAgICB9XG59KTtcblxudmFyIE1vdmVzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIG1vZGVsOiBNb3ZlLFxuICAgIHVybDogJy9qc29uL21vdmVzLycsXG4gICAgcGFyc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJlc3VsdHM7XG4gICAgfSxcbiAgICBncm91cEJ5U3BvdDogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVkdWNlKGZ1bmN0aW9uKGNvbGxlY3Rpb24sIG1vdmUpe1xuICAgICAgICAgICAgdmFyIG1vZGVsID0gY29sbGVjdGlvbi5hZGQoe2lkOiBtb3ZlLmdldCgnc3BvdCcpfSk7XG5cbiAgICAgICAgICAgIGlmICghbW9kZWwuaGFzKCdtb3ZlcycpKXtcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoJ21vdmVzJywgbmV3IE1vdmVzKCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtb2RlbC5nZXQoJ21vdmVzJykuYWRkKG1vdmUpO1xuXG4gICAgICAgICAgICByZXR1cm4gY29sbGVjdGlvbjtcbiAgICAgICAgfSwgbmV3IEdyb3VwZWRNb3ZlcygpKTtcbiAgICB9XG59KTtcblxudmFyIFNwb3QgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgIHVybFJvb3Q6ICcvanNvbi9zcG90cy8nXG59KTtcblxudmFyIFNwb3RzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIHVybDogJy9qc29uL3Nwb3RzLycsXG4gICAgcGFyc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJlc3VsdHM7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFNwb3RzOiBTcG90cyxcbiAgICBNb3ZlczogTW92ZXMsXG4gICAgTW92ZTogTW92ZSxcbiAgICBTcG90OiBTcG90XG59XG4iLCJ2YXIgTHVuY2hNb3Zlc1ZpZXcgPSByZXF1aXJlKCdhcHAvdmlld3MnKS5MdW5jaE1vdmVzVmlldztcbnZhciBNb3ZlRm9ybVZpZXcgPSByZXF1aXJlKCdhcHAvdmlld3MnKS5Nb3ZlRm9ybVZpZXc7XG52YXIgTG9hZGluZ1ZpZXcgPSByZXF1aXJlKCdhcHAvdmlld3MnKS5Mb2FkaW5nVmlldztcbnZhciBMYXlvdXRWaWV3ID0gcmVxdWlyZSgnYXBwL3ZpZXdzJykuTGF5b3V0VmlldztcblxudmFyIE1vdmUgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5Nb3ZlO1xudmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxudmFyIHJlZ2lvbk1hbmFnZXIgPSBuZXcgTWFyaW9uZXR0ZS5SZWdpb25NYW5hZ2VyKHtcbiAgICByZWdpb25zOiB7XG4gICAgICAgIG1haW46ICcjYXBwJyxcbiAgICB9XG59KTtcblxudmFyIFJvdXRlciA9IEJhY2tib25lLlJvdXRlci5leHRlbmQoe1xuICAgIHJvdXRlczoge1xuICAgICAgICBcIlwiOiBcInNob3dNb3ZlXCIsXG4gICAgICAgIFwibW92ZXNcIjogXCJzaG93TW92ZXNcIixcbiAgICB9LFxuXG4gICAgc2hvd01vdmVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVnaW9uTWFuYWdlci5nZXQoJ21haW4nKS5zaG93KG5ldyBMb2FkaW5nVmlldygpKTtcbiAgICAgICAgdmFyIG1vdmUgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmUnKTtcbiAgICAgICAgdmFyIG1vdmVzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlcycpO1xuICAgICAgICB2YXIgc3BvdHMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJyk7XG5cbiAgICAgICAgJC53aGVuKG1vdmVzLmZldGNoKCksIHNwb3RzLmZldGNoKCkpLmRvbmUoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciBsYXlvdXRWaWV3ID0gbmV3IExheW91dFZpZXcoe1xuICAgICAgICAgICAgICAgIG1vZGVsOiBtb3ZlLFxuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IG1vdmVzLmdyb3VwQnlTcG90KClcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZWdpb25NYW5hZ2VyLmdldCgnbWFpbicpLnNob3cobGF5b3V0Vmlldyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gUm91dGVyO1xuIiwiXG52YXIgTGF5b3V0VHBsID0gXCI8ZGl2IGRhdGEtcmVnaW9uPVxcXCJmb3JtXFxcIj48L2Rpdj5cXG48ZGl2IGRhdGEtcmVnaW9uPVxcXCJtb3Zlc1xcXCI+PC9kaXY+XFxuXCI7XG52YXIgRW1wdHlUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbC1tZC0xMiB0ZXh0LWNlbnRlclxcXCI+XFxuICAgIE5vIG9uZSdzIGdvaW5nIGFueXdoZXJlLCBqdXN0IHF1aXRlIHlldC5cXG48L2Rpdj5cXG5cIjtcbnZhciBMdW5jaE1vdmVUcGwgPSBcIjxkaXYgY2xhc3M9XFxcInNwb3QtbmFtZSBjb2wtbWQtM1xcXCI+XFxuICAgIDxzcGFuPjwlPSBzcG90TmFtZSAlPjwvc3Bhbj5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJzcG90LW1vdmVzIGNvbC1tZC05XFxcIj5cXG4gICAgPCUgbW92ZXMuZWFjaChmdW5jdGlvbihtb3ZlKXsgJT5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmVcXFwiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmUtdGltZVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuPjwlPSBtb3ZlLmdldCgndGltZScpLmZvcm1hdCgnaDptbScpICU+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmUtbmFtZVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuPjwlPSBpc093bk1vdmUobW92ZSkgPyAnWW91JyA6IG1vdmUuZ2V0KCd1c2VyJykgJT48L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPCUgfSkgJT5cXG4gICAgPCUgaWYgKCFoYXNPd25Nb3ZlKSB7ICU+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlIG1vdmUtbmV3XFxcIiBkYXRhLXVpPVxcXCJhZGRNb3ZlXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlLWljb25cXFwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1wbHVzXFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZS1uYW1lXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4+R28gSGVyZTwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8JSB9ICU+XFxuPC9kaXY+XFxuXCI7XG52YXIgTHVuY2hNb3Zlc1RwbCA9IFwiPGRpdiBjbGFzcz1cXFwiY29udGFpbmVyIG1vdmVzLWNvbnRhaW5lclxcXCI+PC9kaXY+XFxuXCI7XG52YXIgTG9hZGluZ1RwbCA9IFwiPGRpdiBjbGFzcz1cXFwiY29udGFpbmVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicm93IGxvYWRpbmctY29udGFpbmVyXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInNrLXNwaW5uZXIgc2stc3Bpbm5lci1yb3RhdGluZy1wbGFuZVxcXCI+PC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xudmFyIE1vdmVGb3JtVHBsID0gXCI8aGVhZGVyIGlkPVxcXCJoZWFkZXJcXFwiIGNsYXNzPSduYXZiYXIgbmF2YmFyLXN0YXRpYy10b3AgbWFpbi1oZWFkZXInPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjb250YWluZXJcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwibmF2YmFyLWhlYWRlclxcXCI+XFxuICAgICAgICAgICAgPGZvcm0gY2xhc3M9XFxcIm5hdmJhci1mb3JtIG5hdmJhci1sZWZ0IGx1bmNoLW1vdmUtZm9ybVxcXCI+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3M9XFxcImZvcm0tY29udHJvbC1zdGF0aWNcXFwiPllvdSBhcmUgZWF0aW5nPC9wPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XFxcImZvcm0tY29udHJvbCBzcG90LWZpZWxkXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJzcG90XFxcIiBwbGFjZWhvbGRlcj1cXFwicGxhY2VcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImhpZGRlblxcXCIgbmFtZT1cXFwic3BvdF9pZFxcXCI+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvZm9ybT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPG5hdiBpZD1cXFwibmF2YmFyXFxcIiBjbGFzcz1cXFwiY29sbGFwc2UgbmF2YmFyLWNvbGxhcHNlXFxcIj48L25hdj5cXG4gICAgPC9kaXY+XFxuPC9oZWFkZXI+XFxuXCI7XG52YXIgRW1wdHlRdWVyeVRwbCA9IFwiPGRpdiBjbGFzcz1cXFwidHQtZW1wdHlcXFwiPlxcbiAgICA8YnV0dG9uIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCIgZGF0YS1hY3Rpb249XFxcImFkZFNwb3RcXFwiPkFkZCBcXFwiPCU9IHF1ZXJ5ICU+XFxcIjwvYnV0dG9uPlxcbjwvZGl2PlxcblwiO1xudmFyIFNwb3QgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5TcG90O1xuXG52YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgTHVuY2hNb3ZlVmlldyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICBtb2RlbEV2ZW50czoge1xuICAgICAgICAnY2hhbmdlOm1vdmVzJzogJ3JlbmRlcidcbiAgICB9LFxuICAgIGVkaXQ6IGZ1bmN0aW9uKGUpe1xuICAgICAgICBCYWNrYm9uZS5oaXN0b3J5Lm5hdmlnYXRlKCcnLCB7dHJpZ2dlcjogdHJ1ZX0pO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgICAgJ2NsaWNrIEB1aS5hZGRNb3ZlJzogJ2FkZE1vdmUnXG4gICAgfSxcbiAgICB1aToge1xuICAgICAgICAnYWRkTW92ZSc6ICdbZGF0YS11aT1cImFkZE1vdmVcIl0nXG4gICAgfSxcbiAgICBhZGRNb3ZlOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgdmlldyA9IHRoaXM7XG4gICAgICAgIHZhciBvd25Nb3ZlID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlJylcbiAgICAgICAgb3duTW92ZS5zYXZlKHtcbiAgICAgICAgICAgIHNwb3Q6IHRoaXMubW9kZWwuaWRcbiAgICAgICAgfSkuZG9uZShmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIG1vdmVzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlcycpO1xuICAgICAgICAgICAgbW92ZXMuYWRkKG93bk1vdmUsIHttZXJnZTogdHJ1ZX0pO1xuICAgICAgICAgICAgb3duTW92ZS50cmlnZ2VyKCd1cGRhdGUnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBjbGFzc05hbWU6ICdyb3cgbW92ZS1yb3cnLFxuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKEx1bmNoTW92ZVRwbCksXG4gICAgdGVtcGxhdGVIZWxwZXJzOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgb3duTW92ZSA9ICBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmUnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNwb3ROYW1lOiBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykuZ2V0KHRoaXMubW9kZWwuaWQpLmdldCgnbmFtZScpLFxuICAgICAgICAgICAgaXNPd25Nb3ZlOiBmdW5jdGlvbihtb3ZlKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3duTW92ZS5pZCA9PT0gbW92ZS5pZDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBoYXNPd25Nb3ZlOiAhIXRoaXMubW9kZWwuZ2V0KCdtb3ZlcycpLmdldChvd25Nb3ZlLmlkKVxuICAgICAgICB9XG4gICAgfVxufSk7XG5cbnZhciBFbXB0eVZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgY2xhc3NOYW1lOiAncm93JyxcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShFbXB0eVRwbClcbn0pO1xuXG52YXIgTHVuY2hNb3Zlc1ZpZXcgPSBNYXJpb25ldHRlLkNvbXBvc2l0ZVZpZXcuZXh0ZW5kKHtcbiAgICBtb2RlbEV2ZW50czoge1xuICAgICAgICAndXBkYXRlJzogJ3JlY2FsY3VsYXRlTW92ZXMnXG4gICAgfSxcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShMdW5jaE1vdmVzVHBsKSxcbiAgICBjaGlsZFZpZXc6IEx1bmNoTW92ZVZpZXcsXG4gICAgZW1wdHlWaWV3OiBFbXB0eVZpZXcsXG4gICAgY2hpbGRWaWV3Q29udGFpbmVyOiAnLm1vdmVzLWNvbnRhaW5lcicsXG4gICAgcmVjYWxjdWxhdGVNb3ZlczogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHByZXZpb3VzU3BvdDtcblxuICAgICAgICB0aGlzLmNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgICAgICBtb2RlbC5nZXQoJ21vdmVzJykuZWFjaChmdW5jdGlvbihtb3ZlKXtcbiAgICAgICAgICAgICAgICBpZiAobW92ZS5pZCA9PT0gdGhpcy5tb2RlbC5pZCkge1xuICAgICAgICAgICAgICAgICAgICBwcmV2aW91c1Nwb3QgPSBtb2RlbC5pZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgaWYgKHByZXZpb3VzU3BvdCkge1xuICAgICAgICAgICAgdmFyIHByZXZpb3VzTW9kZWwgPSB0aGlzLmNvbGxlY3Rpb24uZ2V0KHByZXZpb3VzU3BvdCk7XG4gICAgICAgICAgICBwcmV2aW91c01vZGVsLmdldCgnbW92ZXMnKS5yZW1vdmUodGhpcy5tb2RlbC5pZCk7XG4gICAgICAgICAgICBwcmV2aW91c01vZGVsLnRyaWdnZXIoJ2NoYW5nZTptb3ZlcycpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG5ld01vZGVsID0gdGhpcy5jb2xsZWN0aW9uLmdldCh0aGlzLm1vZGVsLmdldCgnc3BvdCcpKTtcbiAgICAgICAgbmV3TW9kZWwuZ2V0KCdtb3ZlcycpLmFkZCh0aGlzLm1vZGVsKTtcbiAgICAgICAgbmV3TW9kZWwudHJpZ2dlcignY2hhbmdlOm1vdmVzJyk7XG4gICAgfVxufSk7XG5cbnZhciBNb3ZlRm9ybVZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTW92ZUZvcm1UcGwpLFxuICAgIHVpOiB7XG4gICAgICAgICdmb3JtJzogJ2Zvcm0nLFxuICAgICAgICAnc3BvdCc6ICdbbmFtZT1cInNwb3RcIl0nLFxuICAgICAgICAnc3BvdElkJzogJ1tuYW1lPVwic3BvdF9pZFwiXScsXG4gICAgICAgICd1c2VyJzogJ1tuYW1lPVwidXNlclwiXSdcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgICAndHlwZWFoZWFkOnNlbGVjdCBAdWkuc3BvdCc6ICdvblR5cGVhaGVhZFNlbGVjdCcsXG4gICAgICAgICdjbGljayBbZGF0YS1hY3Rpb249XCJhZGRTcG90XCJdJzogJ2FkZFNwb3QnLFxuICAgICAgICAnY2hhbmdlIEB1aS5mb3JtJzogJ29uRm9ybUNoYW5nZScsXG4gICAgICAgICdibHVyIEB1aS5zcG90JzogJ29uU3BvdEJsdXInLFxuICAgICAgICAna2V5ZG93biBpbnB1dCc6IGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgaWYgKGUua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgJChlLmN1cnJlbnRUYXJnZXQpLmJsdXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgYWRkU3BvdDogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNwb3QgPSBuZXcgU3BvdCh7XG4gICAgICAgICAgICBuYW1lOiB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnKVxuICAgICAgICB9KTtcblxuICAgICAgICBzcG90LnNhdmUoe30sIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IF8uYmluZChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS5hZGQoc3BvdCk7XG4gICAgICAgICAgICAgICAgdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJywgc3BvdC5nZXQoJ25hbWUnKSkuYmx1cigpO1xuICAgICAgICAgICAgfSwgdGhpcylcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBkZXNlcmlhbGl6ZU1vZGVsOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgdXNlciA9IHRoaXMubW9kZWwuZ2V0KCd1c2VyJyk7XG4gICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLnVpLnVzZXIudmFsKHVzZXIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzcG90ID0gdGhpcy5tb2RlbC5nZXQoJ3Nwb3QnKVxuICAgICAgICBpZiAoc3BvdCkge1xuICAgICAgICAgICAgdmFyIHNwb3ROYW1lID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLmdldChzcG90KS5nZXQoJ25hbWUnKTtcbiAgICAgICAgICAgIHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcsIHNwb3ROYW1lKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgb25TaG93OiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLnJlbmRlclR5cGVhaGVhZCgpO1xuICAgICAgICB0aGlzLmRlc2VyaWFsaXplTW9kZWwoKTtcbiAgICB9LFxuICAgIHJlbmRlclR5cGVhaGVhZDogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNwb3RzID0gbmV3IEJsb29kaG91bmQoe1xuICAgICAgICAgICAgZGF0dW1Ub2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy5vYmoud2hpdGVzcGFjZSgnbmFtZScpLFxuICAgICAgICAgICAgcXVlcnlUb2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy53aGl0ZXNwYWNlLFxuICAgICAgICAgICAgbG9jYWw6IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS50b0pTT04oKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKHtcbiAgICAgICAgICAgIGhpbnQ6IHRydWUsXG4gICAgICAgICAgICBoaWdobGlnaHQ6IHRydWUsXG4gICAgICAgICAgICBtaW5MZW5ndGg6IDFcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgZGlzcGxheTogJ25hbWUnLFxuICAgICAgICAgICAgbmFtZTogJ3Nwb3RzJyxcbiAgICAgICAgICAgIHNvdXJjZTogc3BvdHMsXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBlbXB0eTogXy50ZW1wbGF0ZShFbXB0eVF1ZXJ5VHBsKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIG9uRm9ybUNoYW5nZTogZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMuX2Rpc2FibGVTYXZpbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzcG90SWQgPSB0aGlzLnVpLnNwb3RJZC52YWwoKTtcbiAgICAgICAgdmFyIHVzZXIgPSB0aGlzLnVpLnVzZXIudmFsKCk7XG5cbiAgICAgICAgaWYgKHNwb3RJZCAmJiB1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLl9kaXNhYmxlU2F2aW5nID0gdHJ1ZTtcblxuICAgICAgICAgICAgdGhpcy5tb2RlbC5zYXZlKHtcbiAgICAgICAgICAgICAgICBzcG90OiBzcG90SWQsXG4gICAgICAgICAgICAgICAgdXNlcjogdXNlclxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIEJhY2tib25lLmhpc3RvcnkubmF2aWdhdGUoJy9tb3ZlcycsIHt0cmlnZ2VyOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIG9uU3BvdEJsdXI6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzcG90cyA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKTtcbiAgICAgICAgdmFyIHNwb3RJZCA9IHRoaXMudWkuc3BvdElkLnZhbCgpO1xuXG4gICAgICAgIGlmICghc3BvdElkKSB7XG4gICAgICAgICAgICB2YXIgc3BvdFZhbCA9IHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcpO1xuICAgICAgICAgICAgdmFyIHNlbGVjdGVkU3BvdCA9IHNwb3RzLmZpbmQoZnVuY3Rpb24oc3BvdCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNwb3QuZ2V0KCduYW1lJykudG9Mb3dlckNhc2UoKSA9PSBzcG90VmFsLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHNlbGVjdGVkU3BvdCkge1xuICAgICAgICAgICAgICAgIHRoaXMudWkuc3BvdElkLnZhbChzZWxlY3RlZFNwb3QuaWQpLmNoYW5nZSgpO1xuICAgICAgICAgICAgICAgIHNwb3RJZCA9IHNlbGVjdGVkU3BvdC5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcsIHNwb3RJZCA/IHNwb3RzLmdldCgrc3BvdElkKS5nZXQoJ25hbWUnKSA6ICcnKTtcbiAgICB9LFxuICAgIG9uVHlwZWFoZWFkU2VsZWN0OiBmdW5jdGlvbihlLCBvYmope1xuICAgICAgICB0aGlzLnVpLnNwb3RJZC52YWwob2JqLmlkKS5jaGFuZ2UoKTtcbiAgICB9LFxuICAgIHRlbXBsYXRlSGVscGVyczogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNwb3RzOiBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykudG9KU09OKClcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG52YXIgTGF5b3V0VmlldyA9IE1hcmlvbmV0dGUuTGF5b3V0Vmlldy5leHRlbmQoe1xuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKExheW91dFRwbCksXG4gICAgcmVnaW9uczoge1xuICAgICAgICAnZm9ybSc6ICdbZGF0YS1yZWdpb249XCJmb3JtXCJdJyxcbiAgICAgICAgJ21vdmVzJzogJ1tkYXRhLXJlZ2lvbj1cIm1vdmVzXCJdJ1xuICAgIH0sXG4gICAgb25TaG93OiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLnNob3dDaGlsZFZpZXcoJ2Zvcm0nLCBuZXcgTW92ZUZvcm1WaWV3KHtcbiAgICAgICAgICAgIG1vZGVsOiB0aGlzLm1vZGVsXG4gICAgICAgIH0pKTtcblxuICAgICAgICB0aGlzLnNob3dDaGlsZFZpZXcoJ21vdmVzJywgbmV3IEx1bmNoTW92ZXNWaWV3KHtcbiAgICAgICAgICAgIG1vZGVsOiB0aGlzLm1vZGVsLFxuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5jb2xsZWN0aW9uXG4gICAgICAgIH0pKTtcbiAgICB9XG59KTtcblxuXG52YXIgTG9hZGluZ1ZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTG9hZGluZ1RwbClcbn0pO1xuXG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgTHVuY2hNb3Zlc1ZpZXc6IEx1bmNoTW92ZXNWaWV3LFxuICAgIExvYWRpbmdWaWV3OiBMb2FkaW5nVmlldyxcbiAgICBNb3ZlRm9ybVZpZXc6IE1vdmVGb3JtVmlldyxcbiAgICBMYXlvdXRWaWV3OiBMYXlvdXRWaWV3XG59XG4iXX0=
