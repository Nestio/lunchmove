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
    parse: function(response){
        response.time = moment(response.time || undefined);
        return response;
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
var MoveFormTpl = "<header id=\"header\" class='navbar navbar-static-top main-header'>\n    <div class=\"container\">\n        <div class=\"navbar-header\">\n            <form class=\"navbar-form navbar-left lunch-move-form\">\n                <div class=\"form-group\">\n                    <p class=\"form-control-static\">You are eating</p>\n                </div>\n                <div class=\"form-group\">\n                    <input class=\"form-control spot-field\" type=\"text\" name=\"spot\" placeholder=\"place\">\n                    <input type=\"hidden\" name=\"spot_id\">\n                </div>\n                <div class=\"form-group\">\n                    <p class=\"form-control-static\">at</p>\n                </div>\n                <div class=\"form-group\">\n                    <input class=\"form-control time-field\" type=\"text\" name=\"time\" placeholder=\"time\">\n                </div>\n                <button type='submit' class='btn btn-success'>Save</button>\n            </form>\n        </div>\n        <nav id=\"navbar\" class=\"collapse navbar-collapse\"></nav>\n    </div>\n</header>\n";
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
        'time': '[name="time"]',
        'submit': '[type="submit"]'
    },
    events: {
        'typeahead:select @ui.spot': 'onTypeaheadSelect',
        'click [data-action="addSpot"]': 'addSpot',
        'submit @ui.form': 'onFormSubmit',
        'blur @ui.spot': 'onSpotBlur',
        'change @ui.form': 'toggleSaveButton',
        'input input[type="text"]': 'toggleSaveButton'
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
        var spot = this.model.get('spot');
        if (spot) {
            var spotName = channel.request('entities:spots').get(spot).get('name');
            this.ui.spot.typeahead('val', spotName);
            this.ui.spotId.val(spot);
        }
        var time = this.model.get('time');

        if (time) {
            this.ui.time.val( moment(time).format('h:mm') );
        }
    },
    serializeForm: function(){
        var data = {};
        var spotId = this.ui.spotId.val();
        if (spotId) {
            data.spot = spotId;
        }
        var time = this.parseTime();
        if (time) {
            data.time = time;
        }
        return data;
    },
    onShow: function(){
        this.renderTypeahead();
        this.deserializeModel();
        this.toggleSaveButton();
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
    toggleSaveButton: function(){
        var data = this.serializeForm();
        var isComplete = _.has(data, 'time') && _.has(data, 'spot')
        this.ui.submit.toggleClass('disabled', !isComplete);
    },
    onFormSubmit: function(e){
        e.preventDefault();
        var data = this.serializeForm();
        if (!_.isEmpty(data)){
            this.model.save(data, {
                success: _.bind(function(){
                    this.model.trigger('update');
                }, this)
            });
        }
    },
    parseTime: function(){
        var string = this.ui.time.val();
        if (!string || !string.match(/\d{1,2}:\d{2}/)){ return ''; }

        var split = string.split(':').map(function(num){return +num; });
        if (split[0] < 6) {
            split[0] += 12;
        }

        return moment(split.join(':'), 'hh:mm').format();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvYXBwLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9jb25zdGFudHMuanMiLCJub2RlX21vZHVsZXMvYXBwL2VudGl0aWVzLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9yb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvYXBwL3ZpZXdzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInJlcXVpcmUoJ2FwcC9jb25zdGFudHMnKTtcblxudmFyIFJvdXRlciA9IHJlcXVpcmUoJ2FwcC9yb3V0ZXInKTtcbnZhciBTcG90cyA9IHJlcXVpcmUoJ2FwcC9lbnRpdGllcycpLlNwb3RzO1xudmFyIE1vdmVzID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuTW92ZXM7XG52YXIgTW92ZSA9IHJlcXVpcmUoJ2FwcC9lbnRpdGllcycpLk1vdmU7XG52YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgc3BvdHMgPSBuZXcgU3BvdHMoKTtcbnZhciBtb3ZlcyA9IG5ldyBNb3ZlcygpO1xudmFyIG1vdmUgPSBuZXcgTW92ZShsdW5jaG1vdmUucmVjZW50X21vdmUpO1xuXG5jaGFubmVsLnJlcGx5KCdlbnRpdGllczpzcG90cycsIGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHNwb3RzO1xufSk7XG5cbmNoYW5uZWwucmVwbHkoJ2VudGl0aWVzOm1vdmVzJywgZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gbW92ZXM7XG59KTtcblxuY2hhbm5lbC5yZXBseSgnZW50aXRpZXM6bW92ZScsIGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIG1vdmU7XG59KTtcblxubmV3IFJvdXRlcigpO1xuXG5CYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHtwdXNoU3RhdGU6IHRydWV9KTtcbiIsInZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciBDb25zdGFudHMgPSB7XG4gICAgUkVDRU5UX1RIUkVTSE9MRDogbW9tZW50KCkuc3VidHJhY3QoNiwgJ2hvdXJzJylcbn07XG5cbmNoYW5uZWwuY29tcGx5KCdnZXQ6Y29uc3RhbnQnLCBmdW5jdGlvbihuYW1lKXtcbiAgICByZXR1cm4gQ29uc3RhbnRzW25hbWVdO1xufSlcbiIsInZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciBNb3ZlID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgICB1cmxSb290OiAnL2pzb24vbW92ZXMvJyxcbiAgICBwYXJzZTogZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICByZXNwb25zZS50aW1lID0gbW9tZW50KHJlc3BvbnNlLnRpbWUgfHwgdW5kZWZpbmVkKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgIH1cbn0pO1xuXG52YXIgR3JvdXBlZE1vdmVzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIGNvbXBhcmF0b3I6IGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgdmFyIG1vdmVzID0gbW9kZWwuZ2V0KCdtb3ZlcycpO1xuICAgICAgICByZXR1cm4gbW92ZXMgPyAtbW92ZXMubGVuZ3RoIDogMDtcbiAgICB9XG59KTtcblxudmFyIE1vdmVzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIG1vZGVsOiBNb3ZlLFxuICAgIHVybDogJy9qc29uL21vdmVzLycsXG4gICAgcGFyc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJlc3VsdHM7XG4gICAgfSxcbiAgICBncm91cEJ5U3BvdDogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVkdWNlKGZ1bmN0aW9uKGNvbGxlY3Rpb24sIG1vdmUpe1xuICAgICAgICAgICAgdmFyIG1vZGVsID0gY29sbGVjdGlvbi5hZGQoe2lkOiBtb3ZlLmdldCgnc3BvdCcpfSk7XG5cbiAgICAgICAgICAgIGlmICghbW9kZWwuaGFzKCdtb3ZlcycpKXtcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoJ21vdmVzJywgbmV3IE1vdmVzKCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtb2RlbC5nZXQoJ21vdmVzJykuYWRkKG1vdmUpO1xuXG4gICAgICAgICAgICByZXR1cm4gY29sbGVjdGlvbjtcbiAgICAgICAgfSwgbmV3IEdyb3VwZWRNb3ZlcygpKTtcbiAgICB9XG59KTtcblxudmFyIFNwb3QgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgIHVybFJvb3Q6ICcvanNvbi9zcG90cy8nXG59KTtcblxudmFyIFNwb3RzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIHVybDogJy9qc29uL3Nwb3RzLycsXG4gICAgcGFyc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJlc3VsdHM7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFNwb3RzOiBTcG90cyxcbiAgICBNb3ZlczogTW92ZXMsXG4gICAgTW92ZTogTW92ZSxcbiAgICBTcG90OiBTcG90XG59XG4iLCJ2YXIgTHVuY2hNb3Zlc1ZpZXcgPSByZXF1aXJlKCdhcHAvdmlld3MnKS5MdW5jaE1vdmVzVmlldztcbnZhciBNb3ZlRm9ybVZpZXcgPSByZXF1aXJlKCdhcHAvdmlld3MnKS5Nb3ZlRm9ybVZpZXc7XG52YXIgTG9hZGluZ1ZpZXcgPSByZXF1aXJlKCdhcHAvdmlld3MnKS5Mb2FkaW5nVmlldztcbnZhciBMYXlvdXRWaWV3ID0gcmVxdWlyZSgnYXBwL3ZpZXdzJykuTGF5b3V0VmlldztcblxudmFyIE1vdmUgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5Nb3ZlO1xudmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxudmFyIHJlZ2lvbk1hbmFnZXIgPSBuZXcgTWFyaW9uZXR0ZS5SZWdpb25NYW5hZ2VyKHtcbiAgICByZWdpb25zOiB7XG4gICAgICAgIG1haW46ICcjYXBwJyxcbiAgICB9XG59KTtcblxudmFyIFJvdXRlciA9IEJhY2tib25lLlJvdXRlci5leHRlbmQoe1xuICAgIHJvdXRlczoge1xuICAgICAgICBcIlwiOiBcInNob3dNb3ZlXCIsXG4gICAgICAgIFwibW92ZXNcIjogXCJzaG93TW92ZXNcIixcbiAgICB9LFxuXG4gICAgc2hvd01vdmVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVnaW9uTWFuYWdlci5nZXQoJ21haW4nKS5zaG93KG5ldyBMb2FkaW5nVmlldygpKTtcbiAgICAgICAgdmFyIG1vdmUgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmUnKTtcbiAgICAgICAgdmFyIG1vdmVzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlcycpO1xuICAgICAgICB2YXIgc3BvdHMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJyk7XG5cbiAgICAgICAgJC53aGVuKG1vdmVzLmZldGNoKCksIHNwb3RzLmZldGNoKCkpLmRvbmUoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciBsYXlvdXRWaWV3ID0gbmV3IExheW91dFZpZXcoe1xuICAgICAgICAgICAgICAgIG1vZGVsOiBtb3ZlLFxuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IG1vdmVzLmdyb3VwQnlTcG90KClcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZWdpb25NYW5hZ2VyLmdldCgnbWFpbicpLnNob3cobGF5b3V0Vmlldyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gUm91dGVyO1xuIiwiXG52YXIgTGF5b3V0VHBsID0gXCI8ZGl2IGRhdGEtcmVnaW9uPVxcXCJmb3JtXFxcIj48L2Rpdj5cXG48ZGl2IGRhdGEtcmVnaW9uPVxcXCJtb3Zlc1xcXCI+PC9kaXY+XFxuXCI7XG52YXIgRW1wdHlUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbC1tZC0xMiB0ZXh0LWNlbnRlclxcXCI+XFxuICAgIE5vIG9uZSdzIGdvaW5nIGFueXdoZXJlLCBqdXN0IHF1aXRlIHlldC5cXG48L2Rpdj5cXG5cIjtcbnZhciBMdW5jaE1vdmVUcGwgPSBcIjxkaXYgY2xhc3M9XFxcInNwb3QtbmFtZSBjb2wtbWQtM1xcXCI+XFxuICAgIDxzcGFuPjwlPSBzcG90TmFtZSAlPjwvc3Bhbj5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJzcG90LW1vdmVzIGNvbC1tZC05XFxcIj5cXG4gICAgPCUgbW92ZXMuZWFjaChmdW5jdGlvbihtb3ZlKXsgJT5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmVcXFwiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmUtdGltZVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuPjwlPSBtb3ZlLmdldCgndGltZScpLmZvcm1hdCgnaDptbScpICU+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmUtbmFtZVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuPjwlPSBpc093bk1vdmUobW92ZSkgPyAnWW91JyA6IG1vdmUuZ2V0KCd1c2VyJykgJT48L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPCUgfSkgJT5cXG4gICAgPCUgaWYgKCFoYXNPd25Nb3ZlKSB7ICU+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlIG1vdmUtbmV3XFxcIiBkYXRhLXVpPVxcXCJhZGRNb3ZlXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlLWljb25cXFwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1wbHVzXFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZS1uYW1lXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4+R28gSGVyZTwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8JSB9ICU+XFxuPC9kaXY+XFxuXCI7XG52YXIgTHVuY2hNb3Zlc1RwbCA9IFwiPGRpdiBjbGFzcz1cXFwiY29udGFpbmVyIG1vdmVzLWNvbnRhaW5lclxcXCI+PC9kaXY+XFxuXCI7XG52YXIgTG9hZGluZ1RwbCA9IFwiPGRpdiBjbGFzcz1cXFwiY29udGFpbmVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicm93IGxvYWRpbmctY29udGFpbmVyXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInNrLXNwaW5uZXIgc2stc3Bpbm5lci1yb3RhdGluZy1wbGFuZVxcXCI+PC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xudmFyIE1vdmVGb3JtVHBsID0gXCI8aGVhZGVyIGlkPVxcXCJoZWFkZXJcXFwiIGNsYXNzPSduYXZiYXIgbmF2YmFyLXN0YXRpYy10b3AgbWFpbi1oZWFkZXInPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjb250YWluZXJcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwibmF2YmFyLWhlYWRlclxcXCI+XFxuICAgICAgICAgICAgPGZvcm0gY2xhc3M9XFxcIm5hdmJhci1mb3JtIG5hdmJhci1sZWZ0IGx1bmNoLW1vdmUtZm9ybVxcXCI+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3M9XFxcImZvcm0tY29udHJvbC1zdGF0aWNcXFwiPllvdSBhcmUgZWF0aW5nPC9wPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XFxcImZvcm0tY29udHJvbCBzcG90LWZpZWxkXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJzcG90XFxcIiBwbGFjZWhvbGRlcj1cXFwicGxhY2VcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImhpZGRlblxcXCIgbmFtZT1cXFwic3BvdF9pZFxcXCI+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2wtc3RhdGljXFxcIj5hdDwvcD5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJmb3JtLWNvbnRyb2wgdGltZS1maWVsZFxcXCIgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwidGltZVxcXCIgcGxhY2Vob2xkZXI9XFxcInRpbWVcXFwiPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPSdzdWJtaXQnIGNsYXNzPSdidG4gYnRuLXN1Y2Nlc3MnPlNhdmU8L2J1dHRvbj5cXG4gICAgICAgICAgICA8L2Zvcm0+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxuYXYgaWQ9XFxcIm5hdmJhclxcXCIgY2xhc3M9XFxcImNvbGxhcHNlIG5hdmJhci1jb2xsYXBzZVxcXCI+PC9uYXY+XFxuICAgIDwvZGl2PlxcbjwvaGVhZGVyPlxcblwiO1xudmFyIEVtcHR5UXVlcnlUcGwgPSBcIjxkaXYgY2xhc3M9XFxcInR0LWVtcHR5XFxcIj5cXG4gICAgPGJ1dHRvbiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHRcXFwiIGRhdGEtYWN0aW9uPVxcXCJhZGRTcG90XFxcIj5BZGQgXFxcIjwlPSBxdWVyeSAlPlxcXCI8L2J1dHRvbj5cXG48L2Rpdj5cXG5cIjtcbnZhciBTcG90ID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuU3BvdDtcblxudmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxudmFyIEx1bmNoTW92ZVZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgbW9kZWxFdmVudHM6IHtcbiAgICAgICAgJ2NoYW5nZTptb3Zlcyc6ICdyZW5kZXInXG4gICAgfSxcbiAgICBlZGl0OiBmdW5jdGlvbihlKXtcbiAgICAgICAgQmFja2JvbmUuaGlzdG9yeS5uYXZpZ2F0ZSgnJywge3RyaWdnZXI6IHRydWV9KTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICAgICdjbGljayBAdWkuYWRkTW92ZSc6ICdhZGRNb3ZlJ1xuICAgIH0sXG4gICAgdWk6IHtcbiAgICAgICAgJ2FkZE1vdmUnOiAnW2RhdGEtdWk9XCJhZGRNb3ZlXCJdJ1xuICAgIH0sXG4gICAgYWRkTW92ZTogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHZpZXcgPSB0aGlzO1xuICAgICAgICB2YXIgb3duTW92ZSA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZScpXG4gICAgICAgIG93bk1vdmUuc2F2ZSh7XG4gICAgICAgICAgICBzcG90OiB0aGlzLm1vZGVsLmlkXG4gICAgICAgIH0pLmRvbmUoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciBtb3ZlcyA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZXMnKTtcbiAgICAgICAgICAgIG1vdmVzLmFkZChvd25Nb3ZlLCB7bWVyZ2U6IHRydWV9KTtcbiAgICAgICAgICAgIG93bk1vdmUudHJpZ2dlcigndXBkYXRlJyk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgY2xhc3NOYW1lOiAncm93IG1vdmUtcm93JyxcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShMdW5jaE1vdmVUcGwpLFxuICAgIHRlbXBsYXRlSGVscGVyczogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIG93bk1vdmUgPSAgY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlJyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzcG90TmFtZTogY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLmdldCh0aGlzLm1vZGVsLmlkKS5nZXQoJ25hbWUnKSxcbiAgICAgICAgICAgIGlzT3duTW92ZTogZnVuY3Rpb24obW92ZSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG93bk1vdmUuaWQgPT09IG1vdmUuaWQ7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaGFzT3duTW92ZTogISF0aGlzLm1vZGVsLmdldCgnbW92ZXMnKS5nZXQob3duTW92ZS5pZClcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG52YXIgRW1wdHlWaWV3ID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuICAgIGNsYXNzTmFtZTogJ3JvdycsXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoRW1wdHlUcGwpXG59KTtcblxudmFyIEx1bmNoTW92ZXNWaWV3ID0gTWFyaW9uZXR0ZS5Db21wb3NpdGVWaWV3LmV4dGVuZCh7XG4gICAgbW9kZWxFdmVudHM6IHtcbiAgICAgICAgJ3VwZGF0ZSc6ICdyZWNhbGN1bGF0ZU1vdmVzJ1xuICAgIH0sXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTHVuY2hNb3Zlc1RwbCksXG4gICAgY2hpbGRWaWV3OiBMdW5jaE1vdmVWaWV3LFxuICAgIGVtcHR5VmlldzogRW1wdHlWaWV3LFxuICAgIGNoaWxkVmlld0NvbnRhaW5lcjogJy5tb3Zlcy1jb250YWluZXInLFxuICAgIHJlY2FsY3VsYXRlTW92ZXM6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBwcmV2aW91c1Nwb3Q7XG5cbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgbW9kZWwuZ2V0KCdtb3ZlcycpLmVhY2goZnVuY3Rpb24obW92ZSl7XG4gICAgICAgICAgICAgICAgaWYgKG1vdmUuaWQgPT09IHRoaXMubW9kZWwuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNTcG90ID0gbW9kZWwuaWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAgIGlmIChwcmV2aW91c1Nwb3QpIHtcbiAgICAgICAgICAgIHZhciBwcmV2aW91c01vZGVsID0gdGhpcy5jb2xsZWN0aW9uLmdldChwcmV2aW91c1Nwb3QpO1xuICAgICAgICAgICAgcHJldmlvdXNNb2RlbC5nZXQoJ21vdmVzJykucmVtb3ZlKHRoaXMubW9kZWwuaWQpO1xuICAgICAgICAgICAgcHJldmlvdXNNb2RlbC50cmlnZ2VyKCdjaGFuZ2U6bW92ZXMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBuZXdNb2RlbCA9IHRoaXMuY29sbGVjdGlvbi5nZXQodGhpcy5tb2RlbC5nZXQoJ3Nwb3QnKSk7XG4gICAgICAgIG5ld01vZGVsLmdldCgnbW92ZXMnKS5hZGQodGhpcy5tb2RlbCk7XG4gICAgICAgIG5ld01vZGVsLnRyaWdnZXIoJ2NoYW5nZTptb3ZlcycpO1xuICAgIH1cbn0pO1xuXG52YXIgTW92ZUZvcm1WaWV3ID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKE1vdmVGb3JtVHBsKSxcbiAgICB1aToge1xuICAgICAgICAnZm9ybSc6ICdmb3JtJyxcbiAgICAgICAgJ3Nwb3QnOiAnW25hbWU9XCJzcG90XCJdJyxcbiAgICAgICAgJ3Nwb3RJZCc6ICdbbmFtZT1cInNwb3RfaWRcIl0nLFxuICAgICAgICAndGltZSc6ICdbbmFtZT1cInRpbWVcIl0nLFxuICAgICAgICAnc3VibWl0JzogJ1t0eXBlPVwic3VibWl0XCJdJ1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICAgICd0eXBlYWhlYWQ6c2VsZWN0IEB1aS5zcG90JzogJ29uVHlwZWFoZWFkU2VsZWN0JyxcbiAgICAgICAgJ2NsaWNrIFtkYXRhLWFjdGlvbj1cImFkZFNwb3RcIl0nOiAnYWRkU3BvdCcsXG4gICAgICAgICdzdWJtaXQgQHVpLmZvcm0nOiAnb25Gb3JtU3VibWl0JyxcbiAgICAgICAgJ2JsdXIgQHVpLnNwb3QnOiAnb25TcG90Qmx1cicsXG4gICAgICAgICdjaGFuZ2UgQHVpLmZvcm0nOiAndG9nZ2xlU2F2ZUJ1dHRvbicsXG4gICAgICAgICdpbnB1dCBpbnB1dFt0eXBlPVwidGV4dFwiXSc6ICd0b2dnbGVTYXZlQnV0dG9uJ1xuICAgIH0sXG4gICAgYWRkU3BvdDogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNwb3QgPSBuZXcgU3BvdCh7XG4gICAgICAgICAgICBuYW1lOiB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnKVxuICAgICAgICB9KTtcblxuICAgICAgICBzcG90LnNhdmUoe30sIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IF8uYmluZChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS5hZGQoc3BvdCk7XG4gICAgICAgICAgICAgICAgdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJywgc3BvdC5nZXQoJ25hbWUnKSkuYmx1cigpO1xuICAgICAgICAgICAgfSwgdGhpcylcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBkZXNlcmlhbGl6ZU1vZGVsOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3BvdCA9IHRoaXMubW9kZWwuZ2V0KCdzcG90Jyk7XG4gICAgICAgIGlmIChzcG90KSB7XG4gICAgICAgICAgICB2YXIgc3BvdE5hbWUgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykuZ2V0KHNwb3QpLmdldCgnbmFtZScpO1xuICAgICAgICAgICAgdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJywgc3BvdE5hbWUpO1xuICAgICAgICAgICAgdGhpcy51aS5zcG90SWQudmFsKHNwb3QpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0aW1lID0gdGhpcy5tb2RlbC5nZXQoJ3RpbWUnKTtcblxuICAgICAgICBpZiAodGltZSkge1xuICAgICAgICAgICAgdGhpcy51aS50aW1lLnZhbCggbW9tZW50KHRpbWUpLmZvcm1hdCgnaDptbScpICk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHNlcmlhbGl6ZUZvcm06IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBkYXRhID0ge307XG4gICAgICAgIHZhciBzcG90SWQgPSB0aGlzLnVpLnNwb3RJZC52YWwoKTtcbiAgICAgICAgaWYgKHNwb3RJZCkge1xuICAgICAgICAgICAgZGF0YS5zcG90ID0gc3BvdElkO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0aW1lID0gdGhpcy5wYXJzZVRpbWUoKTtcbiAgICAgICAgaWYgKHRpbWUpIHtcbiAgICAgICAgICAgIGRhdGEudGltZSA9IHRpbWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSxcbiAgICBvblNob3c6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMucmVuZGVyVHlwZWFoZWFkKCk7XG4gICAgICAgIHRoaXMuZGVzZXJpYWxpemVNb2RlbCgpO1xuICAgICAgICB0aGlzLnRvZ2dsZVNhdmVCdXR0b24oKTtcbiAgICB9LFxuICAgIHJlbmRlclR5cGVhaGVhZDogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNwb3RzID0gbmV3IEJsb29kaG91bmQoe1xuICAgICAgICAgICAgZGF0dW1Ub2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy5vYmoud2hpdGVzcGFjZSgnbmFtZScpLFxuICAgICAgICAgICAgcXVlcnlUb2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy53aGl0ZXNwYWNlLFxuICAgICAgICAgICAgbG9jYWw6IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS50b0pTT04oKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKHtcbiAgICAgICAgICAgIGhpbnQ6IHRydWUsXG4gICAgICAgICAgICBoaWdobGlnaHQ6IHRydWUsXG4gICAgICAgICAgICBtaW5MZW5ndGg6IDFcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgZGlzcGxheTogJ25hbWUnLFxuICAgICAgICAgICAgbmFtZTogJ3Nwb3RzJyxcbiAgICAgICAgICAgIHNvdXJjZTogc3BvdHMsXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBlbXB0eTogXy50ZW1wbGF0ZShFbXB0eVF1ZXJ5VHBsKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHRvZ2dsZVNhdmVCdXR0b246IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBkYXRhID0gdGhpcy5zZXJpYWxpemVGb3JtKCk7XG4gICAgICAgIHZhciBpc0NvbXBsZXRlID0gXy5oYXMoZGF0YSwgJ3RpbWUnKSAmJiBfLmhhcyhkYXRhLCAnc3BvdCcpXG4gICAgICAgIHRoaXMudWkuc3VibWl0LnRvZ2dsZUNsYXNzKCdkaXNhYmxlZCcsICFpc0NvbXBsZXRlKTtcbiAgICB9LFxuICAgIG9uRm9ybVN1Ym1pdDogZnVuY3Rpb24oZSl7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIGRhdGEgPSB0aGlzLnNlcmlhbGl6ZUZvcm0oKTtcbiAgICAgICAgaWYgKCFfLmlzRW1wdHkoZGF0YSkpe1xuICAgICAgICAgICAgdGhpcy5tb2RlbC5zYXZlKGRhdGEsIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBfLmJpbmQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RlbC50cmlnZ2VyKCd1cGRhdGUnKTtcbiAgICAgICAgICAgICAgICB9LCB0aGlzKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHBhcnNlVGltZTogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHN0cmluZyA9IHRoaXMudWkudGltZS52YWwoKTtcbiAgICAgICAgaWYgKCFzdHJpbmcgfHwgIXN0cmluZy5tYXRjaCgvXFxkezEsMn06XFxkezJ9LykpeyByZXR1cm4gJyc7IH1cblxuICAgICAgICB2YXIgc3BsaXQgPSBzdHJpbmcuc3BsaXQoJzonKS5tYXAoZnVuY3Rpb24obnVtKXtyZXR1cm4gK251bTsgfSk7XG4gICAgICAgIGlmIChzcGxpdFswXSA8IDYpIHtcbiAgICAgICAgICAgIHNwbGl0WzBdICs9IDEyO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1vbWVudChzcGxpdC5qb2luKCc6JyksICdoaDptbScpLmZvcm1hdCgpO1xuICAgIH0sXG4gICAgb25TcG90Qmx1cjogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNwb3RzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpO1xuICAgICAgICB2YXIgc3BvdElkID0gdGhpcy51aS5zcG90SWQudmFsKCk7XG5cbiAgICAgICAgaWYgKCFzcG90SWQpIHtcbiAgICAgICAgICAgIHZhciBzcG90VmFsID0gdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJyk7XG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWRTcG90ID0gc3BvdHMuZmluZChmdW5jdGlvbihzcG90KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3BvdC5nZXQoJ25hbWUnKS50b0xvd2VyQ2FzZSgpID09IHNwb3RWYWwudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWRTcG90KSB7XG4gICAgICAgICAgICAgICAgdGhpcy51aS5zcG90SWQudmFsKHNlbGVjdGVkU3BvdC5pZCkuY2hhbmdlKCk7XG4gICAgICAgICAgICAgICAgc3BvdElkID0gc2VsZWN0ZWRTcG90LmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJywgc3BvdElkID8gc3BvdHMuZ2V0KCtzcG90SWQpLmdldCgnbmFtZScpIDogJycpO1xuICAgIH0sXG4gICAgb25UeXBlYWhlYWRTZWxlY3Q6IGZ1bmN0aW9uKGUsIG9iail7XG4gICAgICAgIHRoaXMudWkuc3BvdElkLnZhbChvYmouaWQpLmNoYW5nZSgpO1xuICAgIH0sXG4gICAgdGVtcGxhdGVIZWxwZXJzOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3BvdHM6IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS50b0pTT04oKVxuICAgICAgICB9XG4gICAgfVxufSk7XG5cbnZhciBMYXlvdXRWaWV3ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTGF5b3V0VHBsKSxcbiAgICByZWdpb25zOiB7XG4gICAgICAgICdmb3JtJzogJ1tkYXRhLXJlZ2lvbj1cImZvcm1cIl0nLFxuICAgICAgICAnbW92ZXMnOiAnW2RhdGEtcmVnaW9uPVwibW92ZXNcIl0nXG4gICAgfSxcbiAgICBvblNob3c6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuc2hvd0NoaWxkVmlldygnZm9ybScsIG5ldyBNb3ZlRm9ybVZpZXcoe1xuICAgICAgICAgICAgbW9kZWw6IHRoaXMubW9kZWxcbiAgICAgICAgfSkpO1xuXG4gICAgICAgIHRoaXMuc2hvd0NoaWxkVmlldygnbW92ZXMnLCBuZXcgTHVuY2hNb3Zlc1ZpZXcoe1xuICAgICAgICAgICAgbW9kZWw6IHRoaXMubW9kZWwsXG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb25cbiAgICAgICAgfSkpO1xuICAgIH1cbn0pO1xuXG5cbnZhciBMb2FkaW5nVmlldyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShMb2FkaW5nVHBsKVxufSk7XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBMdW5jaE1vdmVzVmlldzogTHVuY2hNb3Zlc1ZpZXcsXG4gICAgTG9hZGluZ1ZpZXc6IExvYWRpbmdWaWV3LFxuICAgIE1vdmVGb3JtVmlldzogTW92ZUZvcm1WaWV3LFxuICAgIExheW91dFZpZXc6IExheW91dFZpZXdcbn1cbiJdfQ==
