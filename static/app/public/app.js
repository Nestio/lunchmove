(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
$(function(){
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
});

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
    defaults: {
        name: null,
        spot: null,
        time: null
    },
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
        modal: '#modal'
    }
});

channel.comply('show:modal', function(view){
    regionManager.get('modal').show(view);
    view.$el.modal();
});

var Router = Backbone.Router.extend({
    routes: {
        "": "showMoves",
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

var LayoutTpl = "<div data-region=\"moves\"></div>\n<div data-region=\"yourMove\"></div>\n";
var YourMoveTpl = "<div class=\"container your-move\">\n    <div class=\"row\">\n        <div class=\"col-sm-12 text-center\">\n        <% if (!spot) { %>\n            <button type=\"button\" data-ui=\"editMove\" class=\"btn btn-default btn-lg\">Where are you going?</button>\n        <% } %>\n        </div>\n    </div>\n</div>\n";
var EmptyTpl = "<div class=\"col-md-12 text-center\">\n    No one's going anywhere, just quite yet.\n</div>\n";
var LunchMoveTpl = "<div class=\"spot-name col-md-6\">\n    <span><%= spotName %></span>\n</div>\n<div class=\"spot-moves col-md-6\">\n    <% moves.each(function(move){ %>\n        <div class=\"move <%= isOwnMove(move) ? 'own-move' : '' %>\">\n            <div class=\"move-time\">\n                <span><%= move.get('time').format('h:mm') %></span>\n            </div>\n            <div class=\"move-name\">\n                <span><%= isOwnMove(move) ? 'You' : move.get('user') %></span>\n            </div>\n        </div>\n    <% }) %>\n    <% if (!hasOwnMove) { %>\n        <div class=\"move move-new\" data-ui=\"addMove\">\n            <div class=\"move-icon\">\n                <span class=\"glyphicon glyphicon-plus\"></span>\n            </div>\n            <div class=\"move-name\">\n                <span>Go Here</span>\n            </div>\n        </div>\n    <% } %>\n</div>\n";
var LunchMovesTpl = "<div class=\"container moves-container\"></div>\n";
var LoadingTpl = "<div class=\"container\">\n    <div class=\"row loading-container\">\n        <div class=\"sk-spinner sk-spinner-rotating-plane\"></div>\n    </div>\n</div>\n";
var MoveFormTpl = "<div class=\"modal-dialog\">\n    <div class=\"modal-content\">\n        <div class=\"modal-body\" data-ui=\"modalBody\">\n            <form class=\"form-inline lunch-move-form\">\n                <div class=\"lunch-move-form-row\">\n                    <div class=\"form-group\">\n                        <p class=\"form-control-static\">You are eating</p>\n                    </div>\n                    <div class=\"form-group\">\n                        <input class=\"form-control spot-field\" type=\"text\" name=\"spot\" placeholder=\"place\">\n                        <input type=\"hidden\" name=\"spot_id\">\n                    </div>\n                    <div class=\"form-group\">\n                        <p class=\"form-control-static\">at</p>\n                    </div>\n                    <div class=\"form-group\">\n                        <input class=\"form-control time-field\" type=\"text\" name=\"time\" placeholder=\"time\">\n                    </div>\n                </div>\n                <div class=\"lunch-move-form-row\">\n                    <button type=\"submit\" class=\"btn btn-default\">Save</button>\n                </div>\n            </form>\n        </div>\n    </div><!-- /.modal-content -->\n</div><!-- /.modal-dialog -->\n";
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
        'click @ui.addMove': 'addMove',
        'click @ui.editMove': 'addMove'
    },
    ui: {
        'editMove': '.own-move',
        'addMove': '[data-ui="addMove"]'
    },
    addMove: function(e){
        e.preventDefault();
        var ownMove = channel.request('entities:move');
        ownMove.set('spot', this.model.id);
        var view = new MoveFormView({model: ownMove});
        channel.command('show:modal', view);
        return false;
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
    className: 'lunch-moves-list',
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

var ModalForm = Marionette.ItemView.extend({
    className: 'modal',
    _defaultEvents: {
        'hide.bs.modal': 'destroy'
    },
    constructor: function(){
        this.events = _.extend(this._defaultEvents, this.events);
        Marionette.ItemView.prototype.constructor.apply(this, arguments);
    }
});

var MoveFormView = ModalForm.extend({
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
        this.ui.submit.toggleClass('hidden', !isComplete);
    },
    onFormSubmit: function(e){
        e.preventDefault();
        var data = this.serializeForm();
        if (!_.isEmpty(data)){
            this.model.save(data, {
                success: _.bind(function(){
                    this.model.trigger('update');
                    this.$el.modal('hide');
                    var moves = channel.request('entities:moves');
                    moves.add(this.model, {merge: true});
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


var YourMoveView = Marionette.ItemView.extend({
    ui: {
        'editMove': '[data-ui="editMove"]'
    },
    events: {
        'click @ui.editMove': 'editMove'
    },
    template: _.template(YourMoveTpl),
    editMove: function(e){
        e.preventDefault();
        var view = new MoveFormView({model: this.model});
        channel.command('show:modal', view);
        return false;
    },
    templateHelpers: function(){
        var spots = channel.request('entities:spots');

        return {
            spotName: this.model.has('spot') ? spots.get(this.model.get('spot')).get('name') : ''
        }
    }
});


var LayoutView = Marionette.LayoutView.extend({
    template: _.template(LayoutTpl),
    regions: {
        'yourMove': '[data-region="yourMove"]',
        'moves': '[data-region="moves"]'
    },
    onShow: function(){
        if (!this.model.get('spot')) {
            this.showChildView('yourMove', new YourMoveView({
                model: this.model
            }));
        }

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvYXBwLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9jb25zdGFudHMuanMiLCJub2RlX21vZHVsZXMvYXBwL2VudGl0aWVzLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9yb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvYXBwL3ZpZXdzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJChmdW5jdGlvbigpe1xucmVxdWlyZSgnYXBwL2NvbnN0YW50cycpO1xuXG52YXIgUm91dGVyID0gcmVxdWlyZSgnYXBwL3JvdXRlcicpO1xudmFyIFNwb3RzID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuU3BvdHM7XG52YXIgTW92ZXMgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5Nb3ZlcztcbnZhciBNb3ZlID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuTW92ZTtcbnZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciBzcG90cyA9IG5ldyBTcG90cygpO1xudmFyIG1vdmVzID0gbmV3IE1vdmVzKCk7XG52YXIgbW92ZSA9IG5ldyBNb3ZlKGx1bmNobW92ZS5yZWNlbnRfbW92ZSk7XG5cbmNoYW5uZWwucmVwbHkoJ2VudGl0aWVzOnNwb3RzJywgZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gc3BvdHM7XG59KTtcblxuY2hhbm5lbC5yZXBseSgnZW50aXRpZXM6bW92ZXMnLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBtb3Zlcztcbn0pO1xuXG5jaGFubmVsLnJlcGx5KCdlbnRpdGllczptb3ZlJywgZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gbW92ZTtcbn0pO1xuXG5uZXcgUm91dGVyKCk7XG5cbkJhY2tib25lLmhpc3Rvcnkuc3RhcnQoe3B1c2hTdGF0ZTogdHJ1ZX0pO1xufSk7XG4iLCJ2YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgQ29uc3RhbnRzID0ge1xuICAgIFJFQ0VOVF9USFJFU0hPTEQ6IG1vbWVudCgpLnN1YnRyYWN0KDYsICdob3VycycpXG59O1xuXG5jaGFubmVsLmNvbXBseSgnZ2V0OmNvbnN0YW50JywgZnVuY3Rpb24obmFtZSl7XG4gICAgcmV0dXJuIENvbnN0YW50c1tuYW1lXTtcbn0pXG4iLCJ2YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgTW92ZSA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgZGVmYXVsdHM6IHtcbiAgICAgICAgbmFtZTogbnVsbCxcbiAgICAgICAgc3BvdDogbnVsbCxcbiAgICAgICAgdGltZTogbnVsbFxuICAgIH0sXG4gICAgdXJsUm9vdDogJy9qc29uL21vdmVzLycsXG4gICAgcGFyc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgcmVzcG9uc2UudGltZSA9IG1vbWVudChyZXNwb25zZS50aW1lIHx8IHVuZGVmaW5lZCk7XG4gICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICB9XG59KTtcblxudmFyIEdyb3VwZWRNb3ZlcyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICBjb21wYXJhdG9yOiBmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgIHZhciBtb3ZlcyA9IG1vZGVsLmdldCgnbW92ZXMnKTtcbiAgICAgICAgcmV0dXJuIG1vdmVzID8gLW1vdmVzLmxlbmd0aCA6IDA7XG4gICAgfVxufSk7XG5cbnZhciBNb3ZlcyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICBtb2RlbDogTW92ZSxcbiAgICB1cmw6ICcvanNvbi9tb3Zlcy8nLFxuICAgIHBhcnNlOiBmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgIHJldHVybiByZXNwb25zZS5yZXN1bHRzO1xuICAgIH0sXG4gICAgZ3JvdXBCeVNwb3Q6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB0aGlzLnJlZHVjZShmdW5jdGlvbihjb2xsZWN0aW9uLCBtb3ZlKXtcbiAgICAgICAgICAgIHZhciBtb2RlbCA9IGNvbGxlY3Rpb24uYWRkKHtpZDogbW92ZS5nZXQoJ3Nwb3QnKX0pO1xuXG4gICAgICAgICAgICBpZiAoIW1vZGVsLmhhcygnbW92ZXMnKSl7XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KCdtb3ZlcycsIG5ldyBNb3ZlcygpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbW9kZWwuZ2V0KCdtb3ZlcycpLmFkZChtb3ZlKTtcblxuICAgICAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb247XG4gICAgICAgIH0sIG5ldyBHcm91cGVkTW92ZXMoKSk7XG4gICAgfVxufSk7XG5cbnZhciBTcG90ID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgICB1cmxSb290OiAnL2pzb24vc3BvdHMvJ1xufSk7XG5cbnZhciBTcG90cyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICB1cmw6ICcvanNvbi9zcG90cy8nLFxuICAgIHBhcnNlOiBmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgIHJldHVybiByZXNwb25zZS5yZXN1bHRzO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBTcG90czogU3BvdHMsXG4gICAgTW92ZXM6IE1vdmVzLFxuICAgIE1vdmU6IE1vdmUsXG4gICAgU3BvdDogU3BvdFxufVxuIiwidmFyIEx1bmNoTW92ZXNWaWV3ID0gcmVxdWlyZSgnYXBwL3ZpZXdzJykuTHVuY2hNb3Zlc1ZpZXc7XG52YXIgTW92ZUZvcm1WaWV3ID0gcmVxdWlyZSgnYXBwL3ZpZXdzJykuTW92ZUZvcm1WaWV3O1xudmFyIExvYWRpbmdWaWV3ID0gcmVxdWlyZSgnYXBwL3ZpZXdzJykuTG9hZGluZ1ZpZXc7XG52YXIgTGF5b3V0VmlldyA9IHJlcXVpcmUoJ2FwcC92aWV3cycpLkxheW91dFZpZXc7XG5cbnZhciBNb3ZlID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuTW92ZTtcbnZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciByZWdpb25NYW5hZ2VyID0gbmV3IE1hcmlvbmV0dGUuUmVnaW9uTWFuYWdlcih7XG4gICAgcmVnaW9uczoge1xuICAgICAgICBtYWluOiAnI2FwcCcsXG4gICAgICAgIG1vZGFsOiAnI21vZGFsJ1xuICAgIH1cbn0pO1xuXG5jaGFubmVsLmNvbXBseSgnc2hvdzptb2RhbCcsIGZ1bmN0aW9uKHZpZXcpe1xuICAgIHJlZ2lvbk1hbmFnZXIuZ2V0KCdtb2RhbCcpLnNob3codmlldyk7XG4gICAgdmlldy4kZWwubW9kYWwoKTtcbn0pO1xuXG52YXIgUm91dGVyID0gQmFja2JvbmUuUm91dGVyLmV4dGVuZCh7XG4gICAgcm91dGVzOiB7XG4gICAgICAgIFwiXCI6IFwic2hvd01vdmVzXCIsXG4gICAgfSxcblxuICAgIHNob3dNb3ZlczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlZ2lvbk1hbmFnZXIuZ2V0KCdtYWluJykuc2hvdyhuZXcgTG9hZGluZ1ZpZXcoKSk7XG4gICAgICAgIHZhciBtb3ZlID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlJyk7XG4gICAgICAgIHZhciBtb3ZlcyA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZXMnKTtcbiAgICAgICAgdmFyIHNwb3RzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpO1xuXG4gICAgICAgICQud2hlbihtb3Zlcy5mZXRjaCgpLCBzcG90cy5mZXRjaCgpKS5kb25lKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgbGF5b3V0VmlldyA9IG5ldyBMYXlvdXRWaWV3KHtcbiAgICAgICAgICAgICAgICBtb2RlbDogbW92ZSxcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiBtb3Zlcy5ncm91cEJ5U3BvdCgpXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmVnaW9uTWFuYWdlci5nZXQoJ21haW4nKS5zaG93KGxheW91dFZpZXcpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJvdXRlcjtcbiIsIlxudmFyIExheW91dFRwbCA9IFwiPGRpdiBkYXRhLXJlZ2lvbj1cXFwibW92ZXNcXFwiPjwvZGl2PlxcbjxkaXYgZGF0YS1yZWdpb249XFxcInlvdXJNb3ZlXFxcIj48L2Rpdj5cXG5cIjtcbnZhciBZb3VyTW92ZVRwbCA9IFwiPGRpdiBjbGFzcz1cXFwiY29udGFpbmVyIHlvdXItbW92ZVxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInJvd1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjb2wtc20tMTIgdGV4dC1jZW50ZXJcXFwiPlxcbiAgICAgICAgPCUgaWYgKCFzcG90KSB7ICU+XFxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVxcXCJidXR0b25cXFwiIGRhdGEtdWk9XFxcImVkaXRNb3ZlXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0IGJ0bi1sZ1xcXCI+V2hlcmUgYXJlIHlvdSBnb2luZz88L2J1dHRvbj5cXG4gICAgICAgIDwlIH0gJT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbnZhciBFbXB0eVRwbCA9IFwiPGRpdiBjbGFzcz1cXFwiY29sLW1kLTEyIHRleHQtY2VudGVyXFxcIj5cXG4gICAgTm8gb25lJ3MgZ29pbmcgYW55d2hlcmUsIGp1c3QgcXVpdGUgeWV0LlxcbjwvZGl2PlxcblwiO1xudmFyIEx1bmNoTW92ZVRwbCA9IFwiPGRpdiBjbGFzcz1cXFwic3BvdC1uYW1lIGNvbC1tZC02XFxcIj5cXG4gICAgPHNwYW4+PCU9IHNwb3ROYW1lICU+PC9zcGFuPlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcInNwb3QtbW92ZXMgY29sLW1kLTZcXFwiPlxcbiAgICA8JSBtb3Zlcy5lYWNoKGZ1bmN0aW9uKG1vdmUpeyAlPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZSA8JT0gaXNPd25Nb3ZlKG1vdmUpID8gJ293bi1tb3ZlJyA6ICcnICU+XFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlLXRpbWVcXFwiPlxcbiAgICAgICAgICAgICAgICA8c3Bhbj48JT0gbW92ZS5nZXQoJ3RpbWUnKS5mb3JtYXQoJ2g6bW0nKSAlPjwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlLW5hbWVcXFwiPlxcbiAgICAgICAgICAgICAgICA8c3Bhbj48JT0gaXNPd25Nb3ZlKG1vdmUpID8gJ1lvdScgOiBtb3ZlLmdldCgndXNlcicpICU+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwlIH0pICU+XFxuICAgIDwlIGlmICghaGFzT3duTW92ZSkgeyAlPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZSBtb3ZlLW5ld1xcXCIgZGF0YS11aT1cXFwiYWRkTW92ZVxcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZS1pY29uXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcGx1c1xcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmUtbmFtZVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuPkdvIEhlcmU8L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPCUgfSAlPlxcbjwvZGl2PlxcblwiO1xudmFyIEx1bmNoTW92ZXNUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbnRhaW5lciBtb3Zlcy1jb250YWluZXJcXFwiPjwvZGl2PlxcblwiO1xudmFyIExvYWRpbmdUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbnRhaW5lclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInJvdyBsb2FkaW5nLWNvbnRhaW5lclxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzay1zcGlubmVyIHNrLXNwaW5uZXItcm90YXRpbmctcGxhbmVcXFwiPjwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbnZhciBNb3ZlRm9ybVRwbCA9IFwiPGRpdiBjbGFzcz1cXFwibW9kYWwtZGlhbG9nXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwibW9kYWwtY29udGVudFxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb2RhbC1ib2R5XFxcIiBkYXRhLXVpPVxcXCJtb2RhbEJvZHlcXFwiPlxcbiAgICAgICAgICAgIDxmb3JtIGNsYXNzPVxcXCJmb3JtLWlubGluZSBsdW5jaC1tb3ZlLWZvcm1cXFwiPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJsdW5jaC1tb3ZlLWZvcm0tcm93XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2wtc3RhdGljXFxcIj5Zb3UgYXJlIGVhdGluZzwvcD5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJmb3JtLWNvbnRyb2wgc3BvdC1maWVsZFxcXCIgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwic3BvdFxcXCIgcGxhY2Vob2xkZXI9XFxcInBsYWNlXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiaGlkZGVuXFxcIiBuYW1lPVxcXCJzcG90X2lkXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3M9XFxcImZvcm0tY29udHJvbC1zdGF0aWNcXFwiPmF0PC9wPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XFxcImZvcm0tY29udHJvbCB0aW1lLWZpZWxkXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJ0aW1lXFxcIiBwbGFjZWhvbGRlcj1cXFwidGltZVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImx1bmNoLW1vdmUtZm9ybS1yb3dcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVxcXCJzdWJtaXRcXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHRcXFwiPlNhdmU8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9mb3JtPlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PjwhLS0gLy5tb2RhbC1jb250ZW50IC0tPlxcbjwvZGl2PjwhLS0gLy5tb2RhbC1kaWFsb2cgLS0+XFxuXCI7XG52YXIgRW1wdHlRdWVyeVRwbCA9IFwiPGRpdiBjbGFzcz1cXFwidHQtZW1wdHlcXFwiPlxcbiAgICA8YnV0dG9uIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCIgZGF0YS1hY3Rpb249XFxcImFkZFNwb3RcXFwiPkFkZCBcXFwiPCU9IHF1ZXJ5ICU+XFxcIjwvYnV0dG9uPlxcbjwvZGl2PlxcblwiO1xudmFyIFNwb3QgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5TcG90O1xuXG52YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgTHVuY2hNb3ZlVmlldyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICBtb2RlbEV2ZW50czoge1xuICAgICAgICAnY2hhbmdlOm1vdmVzJzogJ3JlbmRlcidcbiAgICB9LFxuICAgIGVkaXQ6IGZ1bmN0aW9uKGUpe1xuICAgICAgICBCYWNrYm9uZS5oaXN0b3J5Lm5hdmlnYXRlKCcnLCB7dHJpZ2dlcjogdHJ1ZX0pO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgICAgJ2NsaWNrIEB1aS5hZGRNb3ZlJzogJ2FkZE1vdmUnLFxuICAgICAgICAnY2xpY2sgQHVpLmVkaXRNb3ZlJzogJ2FkZE1vdmUnXG4gICAgfSxcbiAgICB1aToge1xuICAgICAgICAnZWRpdE1vdmUnOiAnLm93bi1tb3ZlJyxcbiAgICAgICAgJ2FkZE1vdmUnOiAnW2RhdGEtdWk9XCJhZGRNb3ZlXCJdJ1xuICAgIH0sXG4gICAgYWRkTW92ZTogZnVuY3Rpb24oZSl7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIG93bk1vdmUgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmUnKTtcbiAgICAgICAgb3duTW92ZS5zZXQoJ3Nwb3QnLCB0aGlzLm1vZGVsLmlkKTtcbiAgICAgICAgdmFyIHZpZXcgPSBuZXcgTW92ZUZvcm1WaWV3KHttb2RlbDogb3duTW92ZX0pO1xuICAgICAgICBjaGFubmVsLmNvbW1hbmQoJ3Nob3c6bW9kYWwnLCB2aWV3KTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgY2xhc3NOYW1lOiAncm93IG1vdmUtcm93JyxcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShMdW5jaE1vdmVUcGwpLFxuICAgIHRlbXBsYXRlSGVscGVyczogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIG93bk1vdmUgPSAgY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlJyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzcG90TmFtZTogY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLmdldCh0aGlzLm1vZGVsLmlkKS5nZXQoJ25hbWUnKSxcbiAgICAgICAgICAgIGlzT3duTW92ZTogZnVuY3Rpb24obW92ZSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG93bk1vdmUuaWQgPT09IG1vdmUuaWQ7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaGFzT3duTW92ZTogISF0aGlzLm1vZGVsLmdldCgnbW92ZXMnKS5nZXQob3duTW92ZS5pZClcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG52YXIgRW1wdHlWaWV3ID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuICAgIGNsYXNzTmFtZTogJ3JvdycsXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoRW1wdHlUcGwpXG59KTtcblxudmFyIEx1bmNoTW92ZXNWaWV3ID0gTWFyaW9uZXR0ZS5Db21wb3NpdGVWaWV3LmV4dGVuZCh7XG4gICAgY2xhc3NOYW1lOiAnbHVuY2gtbW92ZXMtbGlzdCcsXG4gICAgbW9kZWxFdmVudHM6IHtcbiAgICAgICAgJ3VwZGF0ZSc6ICdyZWNhbGN1bGF0ZU1vdmVzJ1xuICAgIH0sXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTHVuY2hNb3Zlc1RwbCksXG4gICAgY2hpbGRWaWV3OiBMdW5jaE1vdmVWaWV3LFxuICAgIGVtcHR5VmlldzogRW1wdHlWaWV3LFxuICAgIGNoaWxkVmlld0NvbnRhaW5lcjogJy5tb3Zlcy1jb250YWluZXInLFxuICAgIHJlY2FsY3VsYXRlTW92ZXM6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBwcmV2aW91c1Nwb3Q7XG5cbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uLmVhY2goZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICAgICAgbW9kZWwuZ2V0KCdtb3ZlcycpLmVhY2goZnVuY3Rpb24obW92ZSl7XG4gICAgICAgICAgICAgICAgaWYgKG1vdmUuaWQgPT09IHRoaXMubW9kZWwuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNTcG90ID0gbW9kZWwuaWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgIH0sIHRoaXMpO1xuXG4gICAgICAgIGlmIChwcmV2aW91c1Nwb3QpIHtcbiAgICAgICAgICAgIHZhciBwcmV2aW91c01vZGVsID0gdGhpcy5jb2xsZWN0aW9uLmdldChwcmV2aW91c1Nwb3QpO1xuICAgICAgICAgICAgcHJldmlvdXNNb2RlbC5nZXQoJ21vdmVzJykucmVtb3ZlKHRoaXMubW9kZWwuaWQpO1xuICAgICAgICAgICAgcHJldmlvdXNNb2RlbC50cmlnZ2VyKCdjaGFuZ2U6bW92ZXMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBuZXdNb2RlbCA9IHRoaXMuY29sbGVjdGlvbi5nZXQodGhpcy5tb2RlbC5nZXQoJ3Nwb3QnKSk7XG4gICAgICAgIG5ld01vZGVsLmdldCgnbW92ZXMnKS5hZGQodGhpcy5tb2RlbCk7XG4gICAgICAgIG5ld01vZGVsLnRyaWdnZXIoJ2NoYW5nZTptb3ZlcycpO1xuICAgIH1cbn0pO1xuXG52YXIgTW9kYWxGb3JtID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuICAgIGNsYXNzTmFtZTogJ21vZGFsJyxcbiAgICBfZGVmYXVsdEV2ZW50czoge1xuICAgICAgICAnaGlkZS5icy5tb2RhbCc6ICdkZXN0cm95J1xuICAgIH0sXG4gICAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuZXZlbnRzID0gXy5leHRlbmQodGhpcy5fZGVmYXVsdEV2ZW50cywgdGhpcy5ldmVudHMpO1xuICAgICAgICBNYXJpb25ldHRlLkl0ZW1WaWV3LnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbn0pO1xuXG52YXIgTW92ZUZvcm1WaWV3ID0gTW9kYWxGb3JtLmV4dGVuZCh7XG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTW92ZUZvcm1UcGwpLFxuICAgIHVpOiB7XG4gICAgICAgICdmb3JtJzogJ2Zvcm0nLFxuICAgICAgICAnc3BvdCc6ICdbbmFtZT1cInNwb3RcIl0nLFxuICAgICAgICAnc3BvdElkJzogJ1tuYW1lPVwic3BvdF9pZFwiXScsXG4gICAgICAgICd0aW1lJzogJ1tuYW1lPVwidGltZVwiXScsXG4gICAgICAgICdzdWJtaXQnOiAnW3R5cGU9XCJzdWJtaXRcIl0nXG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgICAgJ3R5cGVhaGVhZDpzZWxlY3QgQHVpLnNwb3QnOiAnb25UeXBlYWhlYWRTZWxlY3QnLFxuICAgICAgICAnY2xpY2sgW2RhdGEtYWN0aW9uPVwiYWRkU3BvdFwiXSc6ICdhZGRTcG90JyxcbiAgICAgICAgJ3N1Ym1pdCBAdWkuZm9ybSc6ICdvbkZvcm1TdWJtaXQnLFxuICAgICAgICAnYmx1ciBAdWkuc3BvdCc6ICdvblNwb3RCbHVyJyxcbiAgICAgICAgJ2NoYW5nZSBAdWkuZm9ybSc6ICd0b2dnbGVTYXZlQnV0dG9uJyxcbiAgICAgICAgJ2lucHV0IGlucHV0W3R5cGU9XCJ0ZXh0XCJdJzogJ3RvZ2dsZVNhdmVCdXR0b24nXG4gICAgfSxcbiAgICBhZGRTcG90OiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3BvdCA9IG5ldyBTcG90KHtcbiAgICAgICAgICAgIG5hbWU6IHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNwb3Quc2F2ZSh7fSwge1xuICAgICAgICAgICAgc3VjY2VzczogXy5iaW5kKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLmFkZChzcG90KTtcbiAgICAgICAgICAgICAgICB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnLCBzcG90LmdldCgnbmFtZScpKS5ibHVyKCk7XG4gICAgICAgICAgICB9LCB0aGlzKVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGRlc2VyaWFsaXplTW9kZWw6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzcG90ID0gdGhpcy5tb2RlbC5nZXQoJ3Nwb3QnKTtcbiAgICAgICAgaWYgKHNwb3QpIHtcbiAgICAgICAgICAgIHZhciBzcG90TmFtZSA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS5nZXQoc3BvdCkuZ2V0KCduYW1lJyk7XG4gICAgICAgICAgICB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnLCBzcG90TmFtZSk7XG4gICAgICAgICAgICB0aGlzLnVpLnNwb3RJZC52YWwoc3BvdCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRpbWUgPSB0aGlzLm1vZGVsLmdldCgndGltZScpO1xuXG4gICAgICAgIGlmICh0aW1lKSB7XG4gICAgICAgICAgICB0aGlzLnVpLnRpbWUudmFsKCBtb21lbnQodGltZSkuZm9ybWF0KCdoOm1tJykgKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgc2VyaWFsaXplRm9ybTogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGRhdGEgPSB7fTtcbiAgICAgICAgdmFyIHNwb3RJZCA9IHRoaXMudWkuc3BvdElkLnZhbCgpO1xuICAgICAgICBpZiAoc3BvdElkKSB7XG4gICAgICAgICAgICBkYXRhLnNwb3QgPSBzcG90SWQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRpbWUgPSB0aGlzLnBhcnNlVGltZSgpO1xuICAgICAgICBpZiAodGltZSkge1xuICAgICAgICAgICAgZGF0YS50aW1lID0gdGltZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuICAgIG9uU2hvdzogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5yZW5kZXJUeXBlYWhlYWQoKTtcbiAgICAgICAgdGhpcy5kZXNlcmlhbGl6ZU1vZGVsKCk7XG4gICAgICAgIHRoaXMudG9nZ2xlU2F2ZUJ1dHRvbigpO1xuICAgIH0sXG4gICAgcmVuZGVyVHlwZWFoZWFkOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3BvdHMgPSBuZXcgQmxvb2Rob3VuZCh7XG4gICAgICAgICAgICBkYXR1bVRva2VuaXplcjogQmxvb2Rob3VuZC50b2tlbml6ZXJzLm9iai53aGl0ZXNwYWNlKCduYW1lJyksXG4gICAgICAgICAgICBxdWVyeVRva2VuaXplcjogQmxvb2Rob3VuZC50b2tlbml6ZXJzLndoaXRlc3BhY2UsXG4gICAgICAgICAgICBsb2NhbDogY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLnRvSlNPTigpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMudWkuc3BvdC50eXBlYWhlYWQoe1xuICAgICAgICAgICAgaGludDogdHJ1ZSxcbiAgICAgICAgICAgIGhpZ2hsaWdodDogdHJ1ZSxcbiAgICAgICAgICAgIG1pbkxlbmd0aDogMVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBkaXNwbGF5OiAnbmFtZScsXG4gICAgICAgICAgICBuYW1lOiAnc3BvdHMnLFxuICAgICAgICAgICAgc291cmNlOiBzcG90cyxcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIGVtcHR5OiBfLnRlbXBsYXRlKEVtcHR5UXVlcnlUcGwpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgdG9nZ2xlU2F2ZUJ1dHRvbjogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGRhdGEgPSB0aGlzLnNlcmlhbGl6ZUZvcm0oKTtcbiAgICAgICAgdmFyIGlzQ29tcGxldGUgPSBfLmhhcyhkYXRhLCAndGltZScpICYmIF8uaGFzKGRhdGEsICdzcG90JylcbiAgICAgICAgdGhpcy51aS5zdWJtaXQudG9nZ2xlQ2xhc3MoJ2hpZGRlbicsICFpc0NvbXBsZXRlKTtcbiAgICB9LFxuICAgIG9uRm9ybVN1Ym1pdDogZnVuY3Rpb24oZSl7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIGRhdGEgPSB0aGlzLnNlcmlhbGl6ZUZvcm0oKTtcbiAgICAgICAgaWYgKCFfLmlzRW1wdHkoZGF0YSkpe1xuICAgICAgICAgICAgdGhpcy5tb2RlbC5zYXZlKGRhdGEsIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBfLmJpbmQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RlbC50cmlnZ2VyKCd1cGRhdGUnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kZWwubW9kYWwoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1vdmVzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlcycpO1xuICAgICAgICAgICAgICAgICAgICBtb3Zlcy5hZGQodGhpcy5tb2RlbCwge21lcmdlOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZWwudHJpZ2dlcigndXBkYXRlJyk7XG4gICAgICAgICAgICAgICAgfSwgdGhpcylcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBwYXJzZVRpbWU6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzdHJpbmcgPSB0aGlzLnVpLnRpbWUudmFsKCk7XG4gICAgICAgIGlmICghc3RyaW5nIHx8ICFzdHJpbmcubWF0Y2goL1xcZHsxLDJ9OlxcZHsyfS8pKXsgcmV0dXJuICcnOyB9XG5cbiAgICAgICAgdmFyIHNwbGl0ID0gc3RyaW5nLnNwbGl0KCc6JykubWFwKGZ1bmN0aW9uKG51bSl7cmV0dXJuICtudW07IH0pO1xuICAgICAgICBpZiAoc3BsaXRbMF0gPCA2KSB7XG4gICAgICAgICAgICBzcGxpdFswXSArPSAxMjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtb21lbnQoc3BsaXQuam9pbignOicpLCAnaGg6bW0nKS5mb3JtYXQoKTtcbiAgICB9LFxuICAgIG9uU3BvdEJsdXI6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzcG90cyA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKTtcbiAgICAgICAgdmFyIHNwb3RJZCA9IHRoaXMudWkuc3BvdElkLnZhbCgpO1xuXG4gICAgICAgIGlmICghc3BvdElkKSB7XG4gICAgICAgICAgICB2YXIgc3BvdFZhbCA9IHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcpO1xuICAgICAgICAgICAgdmFyIHNlbGVjdGVkU3BvdCA9IHNwb3RzLmZpbmQoZnVuY3Rpb24oc3BvdCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNwb3QuZ2V0KCduYW1lJykudG9Mb3dlckNhc2UoKSA9PSBzcG90VmFsLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHNlbGVjdGVkU3BvdCkge1xuICAgICAgICAgICAgICAgIHRoaXMudWkuc3BvdElkLnZhbChzZWxlY3RlZFNwb3QuaWQpLmNoYW5nZSgpO1xuICAgICAgICAgICAgICAgIHNwb3RJZCA9IHNlbGVjdGVkU3BvdC5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcsIHNwb3RJZCA/IHNwb3RzLmdldCgrc3BvdElkKS5nZXQoJ25hbWUnKSA6ICcnKTtcbiAgICB9LFxuICAgIG9uVHlwZWFoZWFkU2VsZWN0OiBmdW5jdGlvbihlLCBvYmope1xuICAgICAgICB0aGlzLnVpLnNwb3RJZC52YWwob2JqLmlkKS5jaGFuZ2UoKTtcbiAgICB9LFxuICAgIHRlbXBsYXRlSGVscGVyczogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNwb3RzOiBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykudG9KU09OKClcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5cbnZhciBZb3VyTW92ZVZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgdWk6IHtcbiAgICAgICAgJ2VkaXRNb3ZlJzogJ1tkYXRhLXVpPVwiZWRpdE1vdmVcIl0nXG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgICAgJ2NsaWNrIEB1aS5lZGl0TW92ZSc6ICdlZGl0TW92ZSdcbiAgICB9LFxuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKFlvdXJNb3ZlVHBsKSxcbiAgICBlZGl0TW92ZTogZnVuY3Rpb24oZSl7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIHZpZXcgPSBuZXcgTW92ZUZvcm1WaWV3KHttb2RlbDogdGhpcy5tb2RlbH0pO1xuICAgICAgICBjaGFubmVsLmNvbW1hbmQoJ3Nob3c6bW9kYWwnLCB2aWV3KTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgdGVtcGxhdGVIZWxwZXJzOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3BvdHMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNwb3ROYW1lOiB0aGlzLm1vZGVsLmhhcygnc3BvdCcpID8gc3BvdHMuZ2V0KHRoaXMubW9kZWwuZ2V0KCdzcG90JykpLmdldCgnbmFtZScpIDogJydcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5cbnZhciBMYXlvdXRWaWV3ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTGF5b3V0VHBsKSxcbiAgICByZWdpb25zOiB7XG4gICAgICAgICd5b3VyTW92ZSc6ICdbZGF0YS1yZWdpb249XCJ5b3VyTW92ZVwiXScsXG4gICAgICAgICdtb3Zlcyc6ICdbZGF0YS1yZWdpb249XCJtb3Zlc1wiXSdcbiAgICB9LFxuICAgIG9uU2hvdzogZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLm1vZGVsLmdldCgnc3BvdCcpKSB7XG4gICAgICAgICAgICB0aGlzLnNob3dDaGlsZFZpZXcoJ3lvdXJNb3ZlJywgbmV3IFlvdXJNb3ZlVmlldyh7XG4gICAgICAgICAgICAgICAgbW9kZWw6IHRoaXMubW9kZWxcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2hvd0NoaWxkVmlldygnbW92ZXMnLCBuZXcgTHVuY2hNb3Zlc1ZpZXcoe1xuICAgICAgICAgICAgbW9kZWw6IHRoaXMubW9kZWwsXG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb25cbiAgICAgICAgfSkpO1xuICAgIH1cbn0pO1xuXG5cbnZhciBMb2FkaW5nVmlldyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShMb2FkaW5nVHBsKVxufSk7XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBMdW5jaE1vdmVzVmlldzogTHVuY2hNb3Zlc1ZpZXcsXG4gICAgTG9hZGluZ1ZpZXc6IExvYWRpbmdWaWV3LFxuICAgIE1vdmVGb3JtVmlldzogTW92ZUZvcm1WaWV3LFxuICAgIExheW91dFZpZXc6IExheW91dFZpZXdcbn1cbiJdfQ==
