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
var MoveFormTpl = "<div class=\"container\">\n    <div class=\"navbar-header\">\n        <form class=\"navbar-form navbar-left lunch-move-form\">\n            <div class=\"form-group\">\n                <p class=\"form-control-static\">You are eating</p>\n            </div>\n            <div class=\"form-group\">\n                <input class=\"form-control spot-field\" type=\"text\" name=\"spot\" placeholder=\"place\">\n                <input type=\"hidden\" name=\"spot_id\">\n            </div>\n            <div class=\"form-group\">\n                <p class=\"form-control-static\">at</p>\n            </div>\n            <div class=\"form-group\">\n                <input class=\"form-control time-field\" type=\"text\" name=\"time\" placeholder=\"time\">\n            </div>\n            <button type='submit' class='btn btn-success'>Save</button>\n        </form>\n    </div>\n    <nav id=\"navbar\" class=\"collapse navbar-collapse\"></nav>\n</div>\n";
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
    tagName: 'header',
    className: 'navbar navbar-static-top main-header',
    attributes: {
        id: 'header'
    },
    template: _.template(MoveFormTpl),
    ui: {
        'form': 'form',
        'spot': '[name="spot"]',
        'spotId': '[name="spot_id"]',
        'time': '[name="time"]',
        'submit': '[type="submit"]'
    },
    events: {
        'click': 'focusForm',
        'typeahead:select @ui.spot': 'onTypeaheadSelect',
        'click [data-action="addSpot"]': 'addSpot',
        'submit @ui.form': 'onFormSubmit',
        'blur @ui.spot': 'onSpotBlur',
        'change @ui.form': 'toggleSaveButton',
        'input input[type="text"]': 'toggleSaveButton'
    },
    initialize: function(){
        this.listenTo(channel, 'form:focus', this.formFocus);
        this.listenTo(channel, 'form:blur', this.formBlur);
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
        if (!this.model.has('spot')){
            this.formFocus();
        }
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
                    this.blurForm();
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
    },
    focusForm: function(){
        this.$el.addClass('focused');
    },
    blurForm: function(){
        this.$el.removeClass('focused');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvYXBwLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9jb25zdGFudHMuanMiLCJub2RlX21vZHVsZXMvYXBwL2VudGl0aWVzLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9yb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvYXBwL3ZpZXdzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJyZXF1aXJlKCdhcHAvY29uc3RhbnRzJyk7XG5cbnZhciBSb3V0ZXIgPSByZXF1aXJlKCdhcHAvcm91dGVyJyk7XG52YXIgU3BvdHMgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5TcG90cztcbnZhciBNb3ZlcyA9IHJlcXVpcmUoJ2FwcC9lbnRpdGllcycpLk1vdmVzO1xudmFyIE1vdmUgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5Nb3ZlO1xudmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxudmFyIHNwb3RzID0gbmV3IFNwb3RzKCk7XG52YXIgbW92ZXMgPSBuZXcgTW92ZXMoKTtcbnZhciBtb3ZlID0gbmV3IE1vdmUobHVuY2htb3ZlLnJlY2VudF9tb3ZlKTtcblxuY2hhbm5lbC5yZXBseSgnZW50aXRpZXM6c3BvdHMnLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBzcG90cztcbn0pO1xuXG5jaGFubmVsLnJlcGx5KCdlbnRpdGllczptb3ZlcycsIGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIG1vdmVzO1xufSk7XG5cbmNoYW5uZWwucmVwbHkoJ2VudGl0aWVzOm1vdmUnLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBtb3ZlO1xufSk7XG5cbm5ldyBSb3V0ZXIoKTtcblxuQmFja2JvbmUuaGlzdG9yeS5zdGFydCh7cHVzaFN0YXRlOiB0cnVlfSk7XG4iLCJ2YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgQ29uc3RhbnRzID0ge1xuICAgIFJFQ0VOVF9USFJFU0hPTEQ6IG1vbWVudCgpLnN1YnRyYWN0KDYsICdob3VycycpXG59O1xuXG5jaGFubmVsLmNvbXBseSgnZ2V0OmNvbnN0YW50JywgZnVuY3Rpb24obmFtZSl7XG4gICAgcmV0dXJuIENvbnN0YW50c1tuYW1lXTtcbn0pXG4iLCJ2YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgTW92ZSA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgdXJsUm9vdDogJy9qc29uL21vdmVzLycsXG4gICAgcGFyc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgcmVzcG9uc2UudGltZSA9IG1vbWVudChyZXNwb25zZS50aW1lIHx8IHVuZGVmaW5lZCk7XG4gICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICB9XG59KTtcblxudmFyIEdyb3VwZWRNb3ZlcyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICBjb21wYXJhdG9yOiBmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgIHZhciBtb3ZlcyA9IG1vZGVsLmdldCgnbW92ZXMnKTtcbiAgICAgICAgcmV0dXJuIG1vdmVzID8gLW1vdmVzLmxlbmd0aCA6IDA7XG4gICAgfVxufSk7XG5cbnZhciBNb3ZlcyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICBtb2RlbDogTW92ZSxcbiAgICB1cmw6ICcvanNvbi9tb3Zlcy8nLFxuICAgIHBhcnNlOiBmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgIHJldHVybiByZXNwb25zZS5yZXN1bHRzO1xuICAgIH0sXG4gICAgZ3JvdXBCeVNwb3Q6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB0aGlzLnJlZHVjZShmdW5jdGlvbihjb2xsZWN0aW9uLCBtb3ZlKXtcbiAgICAgICAgICAgIHZhciBtb2RlbCA9IGNvbGxlY3Rpb24uYWRkKHtpZDogbW92ZS5nZXQoJ3Nwb3QnKX0pO1xuXG4gICAgICAgICAgICBpZiAoIW1vZGVsLmhhcygnbW92ZXMnKSl7XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KCdtb3ZlcycsIG5ldyBNb3ZlcygpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbW9kZWwuZ2V0KCdtb3ZlcycpLmFkZChtb3ZlKTtcblxuICAgICAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb247XG4gICAgICAgIH0sIG5ldyBHcm91cGVkTW92ZXMoKSk7XG4gICAgfVxufSk7XG5cbnZhciBTcG90ID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgICB1cmxSb290OiAnL2pzb24vc3BvdHMvJ1xufSk7XG5cbnZhciBTcG90cyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICB1cmw6ICcvanNvbi9zcG90cy8nLFxuICAgIHBhcnNlOiBmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgIHJldHVybiByZXNwb25zZS5yZXN1bHRzO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBTcG90czogU3BvdHMsXG4gICAgTW92ZXM6IE1vdmVzLFxuICAgIE1vdmU6IE1vdmUsXG4gICAgU3BvdDogU3BvdFxufVxuIiwidmFyIEx1bmNoTW92ZXNWaWV3ID0gcmVxdWlyZSgnYXBwL3ZpZXdzJykuTHVuY2hNb3Zlc1ZpZXc7XG52YXIgTW92ZUZvcm1WaWV3ID0gcmVxdWlyZSgnYXBwL3ZpZXdzJykuTW92ZUZvcm1WaWV3O1xudmFyIExvYWRpbmdWaWV3ID0gcmVxdWlyZSgnYXBwL3ZpZXdzJykuTG9hZGluZ1ZpZXc7XG52YXIgTGF5b3V0VmlldyA9IHJlcXVpcmUoJ2FwcC92aWV3cycpLkxheW91dFZpZXc7XG5cbnZhciBNb3ZlID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuTW92ZTtcbnZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciByZWdpb25NYW5hZ2VyID0gbmV3IE1hcmlvbmV0dGUuUmVnaW9uTWFuYWdlcih7XG4gICAgcmVnaW9uczoge1xuICAgICAgICBtYWluOiAnI2FwcCcsXG4gICAgfVxufSk7XG5cbnZhciBSb3V0ZXIgPSBCYWNrYm9uZS5Sb3V0ZXIuZXh0ZW5kKHtcbiAgICByb3V0ZXM6IHtcbiAgICAgICAgXCJcIjogXCJzaG93TW92ZVwiLFxuICAgICAgICBcIm1vdmVzXCI6IFwic2hvd01vdmVzXCIsXG4gICAgfSxcblxuICAgIHNob3dNb3ZlczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlZ2lvbk1hbmFnZXIuZ2V0KCdtYWluJykuc2hvdyhuZXcgTG9hZGluZ1ZpZXcoKSk7XG4gICAgICAgIHZhciBtb3ZlID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlJyk7XG4gICAgICAgIHZhciBtb3ZlcyA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZXMnKTtcbiAgICAgICAgdmFyIHNwb3RzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpO1xuXG4gICAgICAgICQud2hlbihtb3Zlcy5mZXRjaCgpLCBzcG90cy5mZXRjaCgpKS5kb25lKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgbGF5b3V0VmlldyA9IG5ldyBMYXlvdXRWaWV3KHtcbiAgICAgICAgICAgICAgICBtb2RlbDogbW92ZSxcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiBtb3Zlcy5ncm91cEJ5U3BvdCgpXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmVnaW9uTWFuYWdlci5nZXQoJ21haW4nKS5zaG93KGxheW91dFZpZXcpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJvdXRlcjtcbiIsIlxudmFyIExheW91dFRwbCA9IFwiPGRpdiBkYXRhLXJlZ2lvbj1cXFwiZm9ybVxcXCI+PC9kaXY+XFxuPGRpdiBkYXRhLXJlZ2lvbj1cXFwibW92ZXNcXFwiPjwvZGl2PlxcblwiO1xudmFyIEVtcHR5VHBsID0gXCI8ZGl2IGNsYXNzPVxcXCJjb2wtbWQtMTIgdGV4dC1jZW50ZXJcXFwiPlxcbiAgICBObyBvbmUncyBnb2luZyBhbnl3aGVyZSwganVzdCBxdWl0ZSB5ZXQuXFxuPC9kaXY+XFxuXCI7XG52YXIgTHVuY2hNb3ZlVHBsID0gXCI8ZGl2IGNsYXNzPVxcXCJzcG90LW5hbWUgY29sLW1kLTNcXFwiPlxcbiAgICA8c3Bhbj48JT0gc3BvdE5hbWUgJT48L3NwYW4+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwic3BvdC1tb3ZlcyBjb2wtbWQtOVxcXCI+XFxuICAgIDwlIG1vdmVzLmVhY2goZnVuY3Rpb24obW92ZSl7ICU+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlLXRpbWVcXFwiPlxcbiAgICAgICAgICAgICAgICA8c3Bhbj48JT0gbW92ZS5nZXQoJ3RpbWUnKS5mb3JtYXQoJ2g6bW0nKSAlPjwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlLW5hbWVcXFwiPlxcbiAgICAgICAgICAgICAgICA8c3Bhbj48JT0gaXNPd25Nb3ZlKG1vdmUpID8gJ1lvdScgOiBtb3ZlLmdldCgndXNlcicpICU+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwlIH0pICU+XFxuICAgIDwlIGlmICghaGFzT3duTW92ZSkgeyAlPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZSBtb3ZlLW5ld1xcXCIgZGF0YS11aT1cXFwiYWRkTW92ZVxcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZS1pY29uXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcGx1c1xcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmUtbmFtZVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuPkdvIEhlcmU8L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPCUgfSAlPlxcbjwvZGl2PlxcblwiO1xudmFyIEx1bmNoTW92ZXNUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbnRhaW5lciBtb3Zlcy1jb250YWluZXJcXFwiPjwvZGl2PlxcblwiO1xudmFyIExvYWRpbmdUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbnRhaW5lclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInJvdyBsb2FkaW5nLWNvbnRhaW5lclxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzay1zcGlubmVyIHNrLXNwaW5uZXItcm90YXRpbmctcGxhbmVcXFwiPjwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbnZhciBNb3ZlRm9ybVRwbCA9IFwiPGRpdiBjbGFzcz1cXFwiY29udGFpbmVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwibmF2YmFyLWhlYWRlclxcXCI+XFxuICAgICAgICA8Zm9ybSBjbGFzcz1cXFwibmF2YmFyLWZvcm0gbmF2YmFyLWxlZnQgbHVuY2gtbW92ZS1mb3JtXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgPHAgY2xhc3M9XFxcImZvcm0tY29udHJvbC1zdGF0aWNcXFwiPllvdSBhcmUgZWF0aW5nPC9wPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XFxcImZvcm0tY29udHJvbCBzcG90LWZpZWxkXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJzcG90XFxcIiBwbGFjZWhvbGRlcj1cXFwicGxhY2VcXFwiPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiaGlkZGVuXFxcIiBuYW1lPVxcXCJzcG90X2lkXFxcIj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgPHAgY2xhc3M9XFxcImZvcm0tY29udHJvbC1zdGF0aWNcXFwiPmF0PC9wPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XFxcImZvcm0tY29udHJvbCB0aW1lLWZpZWxkXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJ0aW1lXFxcIiBwbGFjZWhvbGRlcj1cXFwidGltZVxcXCI+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPSdzdWJtaXQnIGNsYXNzPSdidG4gYnRuLXN1Y2Nlc3MnPlNhdmU8L2J1dHRvbj5cXG4gICAgICAgIDwvZm9ybT5cXG4gICAgPC9kaXY+XFxuICAgIDxuYXYgaWQ9XFxcIm5hdmJhclxcXCIgY2xhc3M9XFxcImNvbGxhcHNlIG5hdmJhci1jb2xsYXBzZVxcXCI+PC9uYXY+XFxuPC9kaXY+XFxuXCI7XG52YXIgRW1wdHlRdWVyeVRwbCA9IFwiPGRpdiBjbGFzcz1cXFwidHQtZW1wdHlcXFwiPlxcbiAgICA8YnV0dG9uIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCIgZGF0YS1hY3Rpb249XFxcImFkZFNwb3RcXFwiPkFkZCBcXFwiPCU9IHF1ZXJ5ICU+XFxcIjwvYnV0dG9uPlxcbjwvZGl2PlxcblwiO1xudmFyIFNwb3QgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5TcG90O1xuXG52YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgTHVuY2hNb3ZlVmlldyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICBtb2RlbEV2ZW50czoge1xuICAgICAgICAnY2hhbmdlOm1vdmVzJzogJ3JlbmRlcidcbiAgICB9LFxuICAgIGVkaXQ6IGZ1bmN0aW9uKGUpe1xuICAgICAgICBCYWNrYm9uZS5oaXN0b3J5Lm5hdmlnYXRlKCcnLCB7dHJpZ2dlcjogdHJ1ZX0pO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgICAgJ2NsaWNrIEB1aS5hZGRNb3ZlJzogJ2FkZE1vdmUnXG4gICAgfSxcbiAgICB1aToge1xuICAgICAgICAnYWRkTW92ZSc6ICdbZGF0YS11aT1cImFkZE1vdmVcIl0nXG4gICAgfSxcbiAgICBhZGRNb3ZlOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgdmlldyA9IHRoaXM7XG4gICAgICAgIHZhciBvd25Nb3ZlID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlJylcbiAgICAgICAgb3duTW92ZS5zYXZlKHtcbiAgICAgICAgICAgIHNwb3Q6IHRoaXMubW9kZWwuaWRcbiAgICAgICAgfSkuZG9uZShmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIG1vdmVzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlcycpO1xuICAgICAgICAgICAgbW92ZXMuYWRkKG93bk1vdmUsIHttZXJnZTogdHJ1ZX0pO1xuICAgICAgICAgICAgb3duTW92ZS50cmlnZ2VyKCd1cGRhdGUnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBjbGFzc05hbWU6ICdyb3cgbW92ZS1yb3cnLFxuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKEx1bmNoTW92ZVRwbCksXG4gICAgdGVtcGxhdGVIZWxwZXJzOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgb3duTW92ZSA9ICBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmUnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNwb3ROYW1lOiBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykuZ2V0KHRoaXMubW9kZWwuaWQpLmdldCgnbmFtZScpLFxuICAgICAgICAgICAgaXNPd25Nb3ZlOiBmdW5jdGlvbihtb3ZlKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3duTW92ZS5pZCA9PT0gbW92ZS5pZDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBoYXNPd25Nb3ZlOiAhIXRoaXMubW9kZWwuZ2V0KCdtb3ZlcycpLmdldChvd25Nb3ZlLmlkKVxuICAgICAgICB9XG4gICAgfVxufSk7XG5cbnZhciBFbXB0eVZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgY2xhc3NOYW1lOiAncm93JyxcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShFbXB0eVRwbClcbn0pO1xuXG52YXIgTHVuY2hNb3Zlc1ZpZXcgPSBNYXJpb25ldHRlLkNvbXBvc2l0ZVZpZXcuZXh0ZW5kKHtcbiAgICBtb2RlbEV2ZW50czoge1xuICAgICAgICAndXBkYXRlJzogJ3JlY2FsY3VsYXRlTW92ZXMnXG4gICAgfSxcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShMdW5jaE1vdmVzVHBsKSxcbiAgICBjaGlsZFZpZXc6IEx1bmNoTW92ZVZpZXcsXG4gICAgZW1wdHlWaWV3OiBFbXB0eVZpZXcsXG4gICAgY2hpbGRWaWV3Q29udGFpbmVyOiAnLm1vdmVzLWNvbnRhaW5lcicsXG4gICAgcmVjYWxjdWxhdGVNb3ZlczogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHByZXZpb3VzU3BvdDtcblxuICAgICAgICB0aGlzLmNvbGxlY3Rpb24uZWFjaChmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgICAgICBtb2RlbC5nZXQoJ21vdmVzJykuZWFjaChmdW5jdGlvbihtb3ZlKXtcbiAgICAgICAgICAgICAgICBpZiAobW92ZS5pZCA9PT0gdGhpcy5tb2RlbC5pZCkge1xuICAgICAgICAgICAgICAgICAgICBwcmV2aW91c1Nwb3QgPSBtb2RlbC5pZDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgaWYgKHByZXZpb3VzU3BvdCkge1xuICAgICAgICAgICAgdmFyIHByZXZpb3VzTW9kZWwgPSB0aGlzLmNvbGxlY3Rpb24uZ2V0KHByZXZpb3VzU3BvdCk7XG4gICAgICAgICAgICBwcmV2aW91c01vZGVsLmdldCgnbW92ZXMnKS5yZW1vdmUodGhpcy5tb2RlbC5pZCk7XG4gICAgICAgICAgICBwcmV2aW91c01vZGVsLnRyaWdnZXIoJ2NoYW5nZTptb3ZlcycpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG5ld01vZGVsID0gdGhpcy5jb2xsZWN0aW9uLmdldCh0aGlzLm1vZGVsLmdldCgnc3BvdCcpKTtcbiAgICAgICAgbmV3TW9kZWwuZ2V0KCdtb3ZlcycpLmFkZCh0aGlzLm1vZGVsKTtcbiAgICAgICAgbmV3TW9kZWwudHJpZ2dlcignY2hhbmdlOm1vdmVzJyk7XG4gICAgfVxufSk7XG5cbnZhciBNb3ZlRm9ybVZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgdGFnTmFtZTogJ2hlYWRlcicsXG4gICAgY2xhc3NOYW1lOiAnbmF2YmFyIG5hdmJhci1zdGF0aWMtdG9wIG1haW4taGVhZGVyJyxcbiAgICBhdHRyaWJ1dGVzOiB7XG4gICAgICAgIGlkOiAnaGVhZGVyJ1xuICAgIH0sXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTW92ZUZvcm1UcGwpLFxuICAgIHVpOiB7XG4gICAgICAgICdmb3JtJzogJ2Zvcm0nLFxuICAgICAgICAnc3BvdCc6ICdbbmFtZT1cInNwb3RcIl0nLFxuICAgICAgICAnc3BvdElkJzogJ1tuYW1lPVwic3BvdF9pZFwiXScsXG4gICAgICAgICd0aW1lJzogJ1tuYW1lPVwidGltZVwiXScsXG4gICAgICAgICdzdWJtaXQnOiAnW3R5cGU9XCJzdWJtaXRcIl0nXG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgICAgJ2NsaWNrJzogJ2ZvY3VzRm9ybScsXG4gICAgICAgICd0eXBlYWhlYWQ6c2VsZWN0IEB1aS5zcG90JzogJ29uVHlwZWFoZWFkU2VsZWN0JyxcbiAgICAgICAgJ2NsaWNrIFtkYXRhLWFjdGlvbj1cImFkZFNwb3RcIl0nOiAnYWRkU3BvdCcsXG4gICAgICAgICdzdWJtaXQgQHVpLmZvcm0nOiAnb25Gb3JtU3VibWl0JyxcbiAgICAgICAgJ2JsdXIgQHVpLnNwb3QnOiAnb25TcG90Qmx1cicsXG4gICAgICAgICdjaGFuZ2UgQHVpLmZvcm0nOiAndG9nZ2xlU2F2ZUJ1dHRvbicsXG4gICAgICAgICdpbnB1dCBpbnB1dFt0eXBlPVwidGV4dFwiXSc6ICd0b2dnbGVTYXZlQnV0dG9uJ1xuICAgIH0sXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5saXN0ZW5UbyhjaGFubmVsLCAnZm9ybTpmb2N1cycsIHRoaXMuZm9ybUZvY3VzKTtcbiAgICAgICAgdGhpcy5saXN0ZW5UbyhjaGFubmVsLCAnZm9ybTpibHVyJywgdGhpcy5mb3JtQmx1cik7XG4gICAgfSxcbiAgICBhZGRTcG90OiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3BvdCA9IG5ldyBTcG90KHtcbiAgICAgICAgICAgIG5hbWU6IHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNwb3Quc2F2ZSh7fSwge1xuICAgICAgICAgICAgc3VjY2VzczogXy5iaW5kKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLmFkZChzcG90KTtcbiAgICAgICAgICAgICAgICB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnLCBzcG90LmdldCgnbmFtZScpKS5ibHVyKCk7XG4gICAgICAgICAgICB9LCB0aGlzKVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGRlc2VyaWFsaXplTW9kZWw6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzcG90ID0gdGhpcy5tb2RlbC5nZXQoJ3Nwb3QnKTtcbiAgICAgICAgaWYgKHNwb3QpIHtcbiAgICAgICAgICAgIHZhciBzcG90TmFtZSA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS5nZXQoc3BvdCkuZ2V0KCduYW1lJyk7XG4gICAgICAgICAgICB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnLCBzcG90TmFtZSk7XG4gICAgICAgICAgICB0aGlzLnVpLnNwb3RJZC52YWwoc3BvdCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRpbWUgPSB0aGlzLm1vZGVsLmdldCgndGltZScpO1xuXG4gICAgICAgIGlmICh0aW1lKSB7XG4gICAgICAgICAgICB0aGlzLnVpLnRpbWUudmFsKCBtb21lbnQodGltZSkuZm9ybWF0KCdoOm1tJykgKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgc2VyaWFsaXplRm9ybTogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGRhdGEgPSB7fTtcbiAgICAgICAgdmFyIHNwb3RJZCA9IHRoaXMudWkuc3BvdElkLnZhbCgpO1xuICAgICAgICBpZiAoc3BvdElkKSB7XG4gICAgICAgICAgICBkYXRhLnNwb3QgPSBzcG90SWQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRpbWUgPSB0aGlzLnBhcnNlVGltZSgpO1xuICAgICAgICBpZiAodGltZSkge1xuICAgICAgICAgICAgZGF0YS50aW1lID0gdGltZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuICAgIG9uU2hvdzogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5yZW5kZXJUeXBlYWhlYWQoKTtcbiAgICAgICAgdGhpcy5kZXNlcmlhbGl6ZU1vZGVsKCk7XG4gICAgICAgIHRoaXMudG9nZ2xlU2F2ZUJ1dHRvbigpO1xuICAgICAgICBpZiAoIXRoaXMubW9kZWwuaGFzKCdzcG90Jykpe1xuICAgICAgICAgICAgdGhpcy5mb3JtRm9jdXMoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcmVuZGVyVHlwZWFoZWFkOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3BvdHMgPSBuZXcgQmxvb2Rob3VuZCh7XG4gICAgICAgICAgICBkYXR1bVRva2VuaXplcjogQmxvb2Rob3VuZC50b2tlbml6ZXJzLm9iai53aGl0ZXNwYWNlKCduYW1lJyksXG4gICAgICAgICAgICBxdWVyeVRva2VuaXplcjogQmxvb2Rob3VuZC50b2tlbml6ZXJzLndoaXRlc3BhY2UsXG4gICAgICAgICAgICBsb2NhbDogY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLnRvSlNPTigpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMudWkuc3BvdC50eXBlYWhlYWQoe1xuICAgICAgICAgICAgaGludDogdHJ1ZSxcbiAgICAgICAgICAgIGhpZ2hsaWdodDogdHJ1ZSxcbiAgICAgICAgICAgIG1pbkxlbmd0aDogMVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBkaXNwbGF5OiAnbmFtZScsXG4gICAgICAgICAgICBuYW1lOiAnc3BvdHMnLFxuICAgICAgICAgICAgc291cmNlOiBzcG90cyxcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIGVtcHR5OiBfLnRlbXBsYXRlKEVtcHR5UXVlcnlUcGwpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgdG9nZ2xlU2F2ZUJ1dHRvbjogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGRhdGEgPSB0aGlzLnNlcmlhbGl6ZUZvcm0oKTtcbiAgICAgICAgdmFyIGlzQ29tcGxldGUgPSBfLmhhcyhkYXRhLCAndGltZScpICYmIF8uaGFzKGRhdGEsICdzcG90JylcbiAgICAgICAgdGhpcy51aS5zdWJtaXQudG9nZ2xlQ2xhc3MoJ2Rpc2FibGVkJywgIWlzQ29tcGxldGUpO1xuICAgIH0sXG4gICAgb25Gb3JtU3VibWl0OiBmdW5jdGlvbihlKXtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgZGF0YSA9IHRoaXMuc2VyaWFsaXplRm9ybSgpO1xuICAgICAgICBpZiAoIV8uaXNFbXB0eShkYXRhKSl7XG4gICAgICAgICAgICB0aGlzLm1vZGVsLnNhdmUoZGF0YSwge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IF8uYmluZChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmJsdXJGb3JtKCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZWwudHJpZ2dlcigndXBkYXRlJyk7XG4gICAgICAgICAgICAgICAgfSwgdGhpcylcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBwYXJzZVRpbWU6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzdHJpbmcgPSB0aGlzLnVpLnRpbWUudmFsKCk7XG4gICAgICAgIGlmICghc3RyaW5nIHx8ICFzdHJpbmcubWF0Y2goL1xcZHsxLDJ9OlxcZHsyfS8pKXsgcmV0dXJuICcnOyB9XG5cbiAgICAgICAgdmFyIHNwbGl0ID0gc3RyaW5nLnNwbGl0KCc6JykubWFwKGZ1bmN0aW9uKG51bSl7cmV0dXJuICtudW07IH0pO1xuICAgICAgICBpZiAoc3BsaXRbMF0gPCA2KSB7XG4gICAgICAgICAgICBzcGxpdFswXSArPSAxMjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtb21lbnQoc3BsaXQuam9pbignOicpLCAnaGg6bW0nKS5mb3JtYXQoKTtcbiAgICB9LFxuICAgIG9uU3BvdEJsdXI6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzcG90cyA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKTtcbiAgICAgICAgdmFyIHNwb3RJZCA9IHRoaXMudWkuc3BvdElkLnZhbCgpO1xuXG4gICAgICAgIGlmICghc3BvdElkKSB7XG4gICAgICAgICAgICB2YXIgc3BvdFZhbCA9IHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcpO1xuICAgICAgICAgICAgdmFyIHNlbGVjdGVkU3BvdCA9IHNwb3RzLmZpbmQoZnVuY3Rpb24oc3BvdCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNwb3QuZ2V0KCduYW1lJykudG9Mb3dlckNhc2UoKSA9PSBzcG90VmFsLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHNlbGVjdGVkU3BvdCkge1xuICAgICAgICAgICAgICAgIHRoaXMudWkuc3BvdElkLnZhbChzZWxlY3RlZFNwb3QuaWQpLmNoYW5nZSgpO1xuICAgICAgICAgICAgICAgIHNwb3RJZCA9IHNlbGVjdGVkU3BvdC5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcsIHNwb3RJZCA/IHNwb3RzLmdldCgrc3BvdElkKS5nZXQoJ25hbWUnKSA6ICcnKTtcbiAgICB9LFxuICAgIG9uVHlwZWFoZWFkU2VsZWN0OiBmdW5jdGlvbihlLCBvYmope1xuICAgICAgICB0aGlzLnVpLnNwb3RJZC52YWwob2JqLmlkKS5jaGFuZ2UoKTtcbiAgICB9LFxuICAgIHRlbXBsYXRlSGVscGVyczogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNwb3RzOiBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykudG9KU09OKClcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZm9jdXNGb3JtOiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLiRlbC5hZGRDbGFzcygnZm9jdXNlZCcpO1xuICAgIH0sXG4gICAgYmx1ckZvcm06IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuJGVsLnJlbW92ZUNsYXNzKCdmb2N1c2VkJyk7XG4gICAgfVxufSk7XG5cbnZhciBMYXlvdXRWaWV3ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTGF5b3V0VHBsKSxcbiAgICByZWdpb25zOiB7XG4gICAgICAgICdmb3JtJzogJ1tkYXRhLXJlZ2lvbj1cImZvcm1cIl0nLFxuICAgICAgICAnbW92ZXMnOiAnW2RhdGEtcmVnaW9uPVwibW92ZXNcIl0nXG4gICAgfSxcbiAgICBvblNob3c6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuc2hvd0NoaWxkVmlldygnZm9ybScsIG5ldyBNb3ZlRm9ybVZpZXcoe1xuICAgICAgICAgICAgbW9kZWw6IHRoaXMubW9kZWxcbiAgICAgICAgfSkpO1xuXG4gICAgICAgIHRoaXMuc2hvd0NoaWxkVmlldygnbW92ZXMnLCBuZXcgTHVuY2hNb3Zlc1ZpZXcoe1xuICAgICAgICAgICAgbW9kZWw6IHRoaXMubW9kZWwsXG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb25cbiAgICAgICAgfSkpO1xuICAgIH1cbn0pO1xuXG5cbnZhciBMb2FkaW5nVmlldyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShMb2FkaW5nVHBsKVxufSk7XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBMdW5jaE1vdmVzVmlldzogTHVuY2hNb3Zlc1ZpZXcsXG4gICAgTG9hZGluZ1ZpZXc6IExvYWRpbmdWaWV3LFxuICAgIE1vdmVGb3JtVmlldzogTW92ZUZvcm1WaWV3LFxuICAgIExheW91dFZpZXc6IExheW91dFZpZXdcbn1cbiJdfQ==
