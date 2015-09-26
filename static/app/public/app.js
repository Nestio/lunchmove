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
        return channel.request('entities:spots').get(model.id).get('name');
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
var LunchMoveTpl = "<div class=\"spot-name col-md-6\">\n    <span><%= spotName %></span>\n</div>\n<div class=\"spot-moves col-md-6\">\n    <% moves.each(function(move){ %>\n        <div class=\"move <%= isOwnMove(move) ? 'own-move' : '' %>\">\n            <div class=\"move-time\">\n                <span><%= move.get('time').format('h:mm') %></span>\n            </div>\n            <div class=\"move-name\">\n                <span>\n                    <% if (isOwnMove(move)) { %>\n                        You <span class=\"glyphicon glyphicon-pencil\"></span>\n                    <% } else { %>\n                        <%- move.get('user') %>\n                    <% } %>\n                </span>\n            </div>\n        </div>\n    <% }) %>\n    <% if (!hasOwnMove) { %>\n        <div class=\"move move-new\" data-ui=\"addMove\">\n            <div class=\"move-icon\">\n                <span class=\"glyphicon glyphicon-plus\"></span>\n            </div>\n            <div class=\"move-name\">\n                <span>Go Here</span>\n            </div>\n        </div>\n    <% } %>\n</div>\n";
var LunchMovesTpl = "<div class=\"container moves-container\"></div>\n";
var LoadingTpl = "<div class=\"container\">\n    <div class=\"row loading-container\">\n        <div class=\"sk-spinner sk-spinner-rotating-plane\"></div>\n    </div>\n</div>\n";
var MoveFormTpl = "<div class=\"modal-dialog\">\n    <div class=\"modal-content\">\n        <div class=\"modal-body\" data-ui=\"modalBody\">\n            <form class=\"form-inline lunch-move-form\">\n                <div class=\"lunch-move-form-row\">\n                    <div class=\"form-group\">\n                        <p class=\"form-control-static\">You are eating</p>\n                    </div>\n                    <div class=\"form-group\">\n                        <input class=\"form-control spot-field\" type=\"text\" name=\"spot\" placeholder=\"place\">\n                        <input type=\"hidden\" name=\"spot_id\">\n                    </div>\n                    <div class=\"form-group\">\n                        <p class=\"form-control-static\">at</p>\n                    </div>\n                    <div class=\"form-group\">\n                        <input class=\"form-control time-field\" type=\"text\" name=\"time\" placeholder=\"time\">\n                    </div>\n                </div>\n                <div class=\"lunch-move-form-row\">\n                    <button type=\"submit\" class=\"btn btn-default\">Save</button>\n                </div>\n            </form>\n        </div>\n    </div><!-- /.modal-content -->\n</div><!-- /.modal-dialog -->\n";
var NameFormTpl = "<div class=\"modal-dialog\">\n    <div class=\"modal-content\">\n        <div class=\"modal-body\" data-ui=\"modalBody\">\n            <form class=\"form-inline lunch-move-form\">\n                <div class=\"lunch-move-form-row\">\n                    <div class=\"form-group\">\n                        <p class=\"form-control-static\">Your name is</p>\n                    </div>\n                    <div class=\"form-group\">\n                        <input class=\"form-control\" type=\"text\" name=\"user\">\n                    </div>\n                </div>\n                <div class=\"lunch-move-form-row\">\n                    <button type=\"submit\" class=\"btn btn-default\">Save</button>\n                </div>\n            </form>\n        </div>\n    </div><!-- /.modal-content -->\n</div><!-- /.modal-dialog -->\n";
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
        this.collection = channel.request('entities:moves').groupBySpot();
        this.render();
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

var NameView = ModalForm.extend({
    template: _.template(NameFormTpl),
    ui: {
        'form': 'form',
        'user': '[name="user"]',
        'submit': '[type="submit"]'
    },
    events: {
        'submit @ui.form': 'onFormSubmit',
        'change @ui.form': 'toggleSaveButton',
        'input input[type="text"]': 'toggleSaveButton'
    },
    onShow: function(){
        this.toggleSaveButton();
    },
    toggleSaveButton: function(){
        var data = this.serializeForm();
        var isComplete = _.has(data, 'user');
        this.ui.submit.toggleClass('hidden', !isComplete);
    },
    serializeForm: function(){
        var user = this.ui.user.val();
        return (user) ? {user: user} : user;
    },
    onFormSubmit: function(e){
        e.preventDefault();
        var data = this.serializeForm();
        if (!_.isEmpty(data)){
            this.model.set(data);
            this.$el.modal('hide');
            setTimeout(_.bind(function(){
                var view = new MoveFormView({model: this.model});
                channel.command('show:modal', view);
            }, this), 1);
        }
    },
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
        var ViewClass = this.model.get('user') ? MoveFormView : NameView;
        var view = new ViewClass({model: this.model});
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvYXBwLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9jb25zdGFudHMuanMiLCJub2RlX21vZHVsZXMvYXBwL2VudGl0aWVzLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9yb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvYXBwL3ZpZXdzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIkKGZ1bmN0aW9uKCl7XG5yZXF1aXJlKCdhcHAvY29uc3RhbnRzJyk7XG5cbnZhciBSb3V0ZXIgPSByZXF1aXJlKCdhcHAvcm91dGVyJyk7XG52YXIgU3BvdHMgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5TcG90cztcbnZhciBNb3ZlcyA9IHJlcXVpcmUoJ2FwcC9lbnRpdGllcycpLk1vdmVzO1xudmFyIE1vdmUgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5Nb3ZlO1xudmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxudmFyIHNwb3RzID0gbmV3IFNwb3RzKCk7XG52YXIgbW92ZXMgPSBuZXcgTW92ZXMoKTtcbnZhciBtb3ZlID0gbmV3IE1vdmUobHVuY2htb3ZlLnJlY2VudF9tb3ZlKTtcblxuY2hhbm5lbC5yZXBseSgnZW50aXRpZXM6c3BvdHMnLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBzcG90cztcbn0pO1xuXG5jaGFubmVsLnJlcGx5KCdlbnRpdGllczptb3ZlcycsIGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIG1vdmVzO1xufSk7XG5cbmNoYW5uZWwucmVwbHkoJ2VudGl0aWVzOm1vdmUnLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBtb3ZlO1xufSk7XG5cbm5ldyBSb3V0ZXIoKTtcblxuQmFja2JvbmUuaGlzdG9yeS5zdGFydCh7cHVzaFN0YXRlOiB0cnVlfSk7XG59KTtcbiIsInZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciBDb25zdGFudHMgPSB7XG4gICAgUkVDRU5UX1RIUkVTSE9MRDogbW9tZW50KCkuc3VidHJhY3QoNiwgJ2hvdXJzJylcbn07XG5cbmNoYW5uZWwuY29tcGx5KCdnZXQ6Y29uc3RhbnQnLCBmdW5jdGlvbihuYW1lKXtcbiAgICByZXR1cm4gQ29uc3RhbnRzW25hbWVdO1xufSlcbiIsInZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciBNb3ZlID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgICBkZWZhdWx0czoge1xuICAgICAgICBuYW1lOiBudWxsLFxuICAgICAgICBzcG90OiBudWxsLFxuICAgICAgICB0aW1lOiBudWxsXG4gICAgfSxcbiAgICB1cmxSb290OiAnL2pzb24vbW92ZXMvJyxcbiAgICBwYXJzZTogZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICByZXNwb25zZS50aW1lID0gbW9tZW50KHJlc3BvbnNlLnRpbWUgfHwgdW5kZWZpbmVkKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgIH1cbn0pO1xuXG52YXIgR3JvdXBlZE1vdmVzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIGNvbXBhcmF0b3I6IGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgcmV0dXJuIGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS5nZXQobW9kZWwuaWQpLmdldCgnbmFtZScpO1xuICAgIH1cbn0pO1xuXG52YXIgTW92ZXMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgbW9kZWw6IE1vdmUsXG4gICAgdXJsOiAnL2pzb24vbW92ZXMvJyxcbiAgICBwYXJzZTogZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVzdWx0cztcbiAgICB9LFxuICAgIGdyb3VwQnlTcG90OiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gdGhpcy5yZWR1Y2UoZnVuY3Rpb24oY29sbGVjdGlvbiwgbW92ZSl7XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSBjb2xsZWN0aW9uLmFkZCh7aWQ6IG1vdmUuZ2V0KCdzcG90Jyl9KTtcblxuICAgICAgICAgICAgaWYgKCFtb2RlbC5oYXMoJ21vdmVzJykpe1xuICAgICAgICAgICAgICAgIG1vZGVsLnNldCgnbW92ZXMnLCBuZXcgTW92ZXMoKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1vZGVsLmdldCgnbW92ZXMnKS5hZGQobW92ZSk7XG5cbiAgICAgICAgICAgIHJldHVybiBjb2xsZWN0aW9uO1xuICAgICAgICB9LCBuZXcgR3JvdXBlZE1vdmVzKCkpO1xuICAgIH1cbn0pO1xuXG52YXIgU3BvdCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgdXJsUm9vdDogJy9qc29uL3Nwb3RzLydcbn0pO1xuXG52YXIgU3BvdHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgdXJsOiAnL2pzb24vc3BvdHMvJyxcbiAgICBwYXJzZTogZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVzdWx0cztcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgU3BvdHM6IFNwb3RzLFxuICAgIE1vdmVzOiBNb3ZlcyxcbiAgICBNb3ZlOiBNb3ZlLFxuICAgIFNwb3Q6IFNwb3Rcbn1cbiIsInZhciBMdW5jaE1vdmVzVmlldyA9IHJlcXVpcmUoJ2FwcC92aWV3cycpLkx1bmNoTW92ZXNWaWV3O1xudmFyIE1vdmVGb3JtVmlldyA9IHJlcXVpcmUoJ2FwcC92aWV3cycpLk1vdmVGb3JtVmlldztcbnZhciBMb2FkaW5nVmlldyA9IHJlcXVpcmUoJ2FwcC92aWV3cycpLkxvYWRpbmdWaWV3O1xudmFyIExheW91dFZpZXcgPSByZXF1aXJlKCdhcHAvdmlld3MnKS5MYXlvdXRWaWV3O1xuXG52YXIgTW92ZSA9IHJlcXVpcmUoJ2FwcC9lbnRpdGllcycpLk1vdmU7XG52YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgcmVnaW9uTWFuYWdlciA9IG5ldyBNYXJpb25ldHRlLlJlZ2lvbk1hbmFnZXIoe1xuICAgIHJlZ2lvbnM6IHtcbiAgICAgICAgbWFpbjogJyNhcHAnLFxuICAgICAgICBtb2RhbDogJyNtb2RhbCdcbiAgICB9XG59KTtcblxuY2hhbm5lbC5jb21wbHkoJ3Nob3c6bW9kYWwnLCBmdW5jdGlvbih2aWV3KXtcbiAgICByZWdpb25NYW5hZ2VyLmdldCgnbW9kYWwnKS5zaG93KHZpZXcpO1xuICAgIHZpZXcuJGVsLm1vZGFsKCk7XG59KTtcblxudmFyIFJvdXRlciA9IEJhY2tib25lLlJvdXRlci5leHRlbmQoe1xuICAgIHJvdXRlczoge1xuICAgICAgICBcIlwiOiBcInNob3dNb3Zlc1wiLFxuICAgIH0sXG5cbiAgICBzaG93TW92ZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWdpb25NYW5hZ2VyLmdldCgnbWFpbicpLnNob3cobmV3IExvYWRpbmdWaWV3KCkpO1xuICAgICAgICB2YXIgbW92ZSA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZScpO1xuICAgICAgICB2YXIgbW92ZXMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmVzJyk7XG4gICAgICAgIHZhciBzcG90cyA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKTtcblxuICAgICAgICAkLndoZW4obW92ZXMuZmV0Y2goKSwgc3BvdHMuZmV0Y2goKSkuZG9uZShmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIGxheW91dFZpZXcgPSBuZXcgTGF5b3V0Vmlldyh7XG4gICAgICAgICAgICAgICAgbW9kZWw6IG1vdmUsXG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogbW92ZXMuZ3JvdXBCeVNwb3QoKVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJlZ2lvbk1hbmFnZXIuZ2V0KCdtYWluJykuc2hvdyhsYXlvdXRWaWV3KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBSb3V0ZXI7XG4iLCJcbnZhciBMYXlvdXRUcGwgPSBcIjxkaXYgZGF0YS1yZWdpb249XFxcIm1vdmVzXFxcIj48L2Rpdj5cXG48ZGl2IGRhdGEtcmVnaW9uPVxcXCJ5b3VyTW92ZVxcXCI+PC9kaXY+XFxuXCI7XG52YXIgWW91ck1vdmVUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbnRhaW5lciB5b3VyLW1vdmVcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJyb3dcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiY29sLXNtLTEyIHRleHQtY2VudGVyXFxcIj5cXG4gICAgICAgIDwlIGlmICghc3BvdCkgeyAlPlxcbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cXFwiYnV0dG9uXFxcIiBkYXRhLXVpPVxcXCJlZGl0TW92ZVxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCBidG4tbGdcXFwiPldoZXJlIGFyZSB5b3UgZ29pbmc/PC9idXR0b24+XFxuICAgICAgICA8JSB9ICU+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG52YXIgRW1wdHlUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbC1tZC0xMiB0ZXh0LWNlbnRlclxcXCI+XFxuICAgIE5vIG9uZSdzIGdvaW5nIGFueXdoZXJlLCBqdXN0IHF1aXRlIHlldC5cXG48L2Rpdj5cXG5cIjtcbnZhciBMdW5jaE1vdmVUcGwgPSBcIjxkaXYgY2xhc3M9XFxcInNwb3QtbmFtZSBjb2wtbWQtNlxcXCI+XFxuICAgIDxzcGFuPjwlPSBzcG90TmFtZSAlPjwvc3Bhbj5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJzcG90LW1vdmVzIGNvbC1tZC02XFxcIj5cXG4gICAgPCUgbW92ZXMuZWFjaChmdW5jdGlvbihtb3ZlKXsgJT5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmUgPCU9IGlzT3duTW92ZShtb3ZlKSA/ICdvd24tbW92ZScgOiAnJyAlPlxcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZS10aW1lXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4+PCU9IG1vdmUuZ2V0KCd0aW1lJykuZm9ybWF0KCdoOm1tJykgJT48L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZS1uYW1lXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8JSBpZiAoaXNPd25Nb3ZlKG1vdmUpKSB7ICU+XFxuICAgICAgICAgICAgICAgICAgICAgICAgWW91IDxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXBlbmNpbFxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPCUgfSBlbHNlIHsgJT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8JS0gbW92ZS5nZXQoJ3VzZXInKSAlPlxcbiAgICAgICAgICAgICAgICAgICAgPCUgfSAlPlxcbiAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPCUgfSkgJT5cXG4gICAgPCUgaWYgKCFoYXNPd25Nb3ZlKSB7ICU+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlIG1vdmUtbmV3XFxcIiBkYXRhLXVpPVxcXCJhZGRNb3ZlXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlLWljb25cXFwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1wbHVzXFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZS1uYW1lXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4+R28gSGVyZTwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8JSB9ICU+XFxuPC9kaXY+XFxuXCI7XG52YXIgTHVuY2hNb3Zlc1RwbCA9IFwiPGRpdiBjbGFzcz1cXFwiY29udGFpbmVyIG1vdmVzLWNvbnRhaW5lclxcXCI+PC9kaXY+XFxuXCI7XG52YXIgTG9hZGluZ1RwbCA9IFwiPGRpdiBjbGFzcz1cXFwiY29udGFpbmVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicm93IGxvYWRpbmctY29udGFpbmVyXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInNrLXNwaW5uZXIgc2stc3Bpbm5lci1yb3RhdGluZy1wbGFuZVxcXCI+PC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xudmFyIE1vdmVGb3JtVHBsID0gXCI8ZGl2IGNsYXNzPVxcXCJtb2RhbC1kaWFsb2dcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJtb2RhbC1jb250ZW50XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vZGFsLWJvZHlcXFwiIGRhdGEtdWk9XFxcIm1vZGFsQm9keVxcXCI+XFxuICAgICAgICAgICAgPGZvcm0gY2xhc3M9XFxcImZvcm0taW5saW5lIGx1bmNoLW1vdmUtZm9ybVxcXCI+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImx1bmNoLW1vdmUtZm9ybS1yb3dcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3M9XFxcImZvcm0tY29udHJvbC1zdGF0aWNcXFwiPllvdSBhcmUgZWF0aW5nPC9wPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XFxcImZvcm0tY29udHJvbCBzcG90LWZpZWxkXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJzcG90XFxcIiBwbGFjZWhvbGRlcj1cXFwicGxhY2VcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJoaWRkZW5cXFwiIG5hbWU9XFxcInNwb3RfaWRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzcz1cXFwiZm9ybS1jb250cm9sLXN0YXRpY1xcXCI+YXQ8L3A+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cXFwiZm9ybS1jb250cm9sIHRpbWUtZmllbGRcXFwiIHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInRpbWVcXFwiIHBsYWNlaG9sZGVyPVxcXCJ0aW1lXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibHVuY2gtbW92ZS1mb3JtLXJvd1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XFxcInN1Ym1pdFxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCI+U2F2ZTwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8L2Zvcm0+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+PCEtLSAvLm1vZGFsLWNvbnRlbnQgLS0+XFxuPC9kaXY+PCEtLSAvLm1vZGFsLWRpYWxvZyAtLT5cXG5cIjtcbnZhciBOYW1lRm9ybVRwbCA9IFwiPGRpdiBjbGFzcz1cXFwibW9kYWwtZGlhbG9nXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwibW9kYWwtY29udGVudFxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb2RhbC1ib2R5XFxcIiBkYXRhLXVpPVxcXCJtb2RhbEJvZHlcXFwiPlxcbiAgICAgICAgICAgIDxmb3JtIGNsYXNzPVxcXCJmb3JtLWlubGluZSBsdW5jaC1tb3ZlLWZvcm1cXFwiPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJsdW5jaC1tb3ZlLWZvcm0tcm93XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2wtc3RhdGljXFxcIj5Zb3VyIG5hbWUgaXM8L3A+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJ1c2VyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibHVuY2gtbW92ZS1mb3JtLXJvd1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XFxcInN1Ym1pdFxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCI+U2F2ZTwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8L2Zvcm0+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+PCEtLSAvLm1vZGFsLWNvbnRlbnQgLS0+XFxuPC9kaXY+PCEtLSAvLm1vZGFsLWRpYWxvZyAtLT5cXG5cIjtcbnZhciBFbXB0eVF1ZXJ5VHBsID0gXCI8ZGl2IGNsYXNzPVxcXCJ0dC1lbXB0eVxcXCI+XFxuICAgIDxidXR0b24gdHlwZT1cXFwiYnV0dG9uXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIiBkYXRhLWFjdGlvbj1cXFwiYWRkU3BvdFxcXCI+QWRkIFxcXCI8JT0gcXVlcnkgJT5cXFwiPC9idXR0b24+XFxuPC9kaXY+XFxuXCI7XG52YXIgU3BvdCA9IHJlcXVpcmUoJ2FwcC9lbnRpdGllcycpLlNwb3Q7XG5cbnZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciBMdW5jaE1vdmVWaWV3ID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuICAgIG1vZGVsRXZlbnRzOiB7XG4gICAgICAgICdjaGFuZ2U6bW92ZXMnOiAncmVuZGVyJ1xuICAgIH0sXG4gICAgZWRpdDogZnVuY3Rpb24oZSl7XG4gICAgICAgIEJhY2tib25lLmhpc3RvcnkubmF2aWdhdGUoJycsIHt0cmlnZ2VyOiB0cnVlfSk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgICAnY2xpY2sgQHVpLmFkZE1vdmUnOiAnYWRkTW92ZScsXG4gICAgICAgICdjbGljayBAdWkuZWRpdE1vdmUnOiAnYWRkTW92ZSdcbiAgICB9LFxuICAgIHVpOiB7XG4gICAgICAgICdlZGl0TW92ZSc6ICcub3duLW1vdmUnLFxuICAgICAgICAnYWRkTW92ZSc6ICdbZGF0YS11aT1cImFkZE1vdmVcIl0nXG4gICAgfSxcbiAgICBhZGRNb3ZlOiBmdW5jdGlvbihlKXtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgb3duTW92ZSA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZScpO1xuICAgICAgICBvd25Nb3ZlLnNldCgnc3BvdCcsIHRoaXMubW9kZWwuaWQpO1xuICAgICAgICB2YXIgdmlldyA9IG5ldyBNb3ZlRm9ybVZpZXcoe21vZGVsOiBvd25Nb3ZlfSk7XG4gICAgICAgIGNoYW5uZWwuY29tbWFuZCgnc2hvdzptb2RhbCcsIHZpZXcpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbiAgICBjbGFzc05hbWU6ICdyb3cgbW92ZS1yb3cnLFxuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKEx1bmNoTW92ZVRwbCksXG4gICAgdGVtcGxhdGVIZWxwZXJzOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgb3duTW92ZSA9ICBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmUnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNwb3ROYW1lOiBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykuZ2V0KHRoaXMubW9kZWwuaWQpLmdldCgnbmFtZScpLFxuICAgICAgICAgICAgaXNPd25Nb3ZlOiBmdW5jdGlvbihtb3ZlKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3duTW92ZS5pZCA9PT0gbW92ZS5pZDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBoYXNPd25Nb3ZlOiAhIXRoaXMubW9kZWwuZ2V0KCdtb3ZlcycpLmdldChvd25Nb3ZlLmlkKVxuICAgICAgICB9XG4gICAgfVxufSk7XG5cbnZhciBFbXB0eVZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgY2xhc3NOYW1lOiAncm93JyxcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShFbXB0eVRwbClcbn0pO1xuXG52YXIgTHVuY2hNb3Zlc1ZpZXcgPSBNYXJpb25ldHRlLkNvbXBvc2l0ZVZpZXcuZXh0ZW5kKHtcbiAgICBjbGFzc05hbWU6ICdsdW5jaC1tb3Zlcy1saXN0JyxcbiAgICBtb2RlbEV2ZW50czoge1xuICAgICAgICAndXBkYXRlJzogJ3JlY2FsY3VsYXRlTW92ZXMnXG4gICAgfSxcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShMdW5jaE1vdmVzVHBsKSxcbiAgICBjaGlsZFZpZXc6IEx1bmNoTW92ZVZpZXcsXG4gICAgZW1wdHlWaWV3OiBFbXB0eVZpZXcsXG4gICAgY2hpbGRWaWV3Q29udGFpbmVyOiAnLm1vdmVzLWNvbnRhaW5lcicsXG4gICAgcmVjYWxjdWxhdGVNb3ZlczogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlcycpLmdyb3VwQnlTcG90KCk7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxufSk7XG5cbnZhciBNb2RhbEZvcm0gPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgY2xhc3NOYW1lOiAnbW9kYWwnLFxuICAgIF9kZWZhdWx0RXZlbnRzOiB7XG4gICAgICAgICdoaWRlLmJzLm1vZGFsJzogJ2Rlc3Ryb3knXG4gICAgfSxcbiAgICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5ldmVudHMgPSBfLmV4dGVuZCh0aGlzLl9kZWZhdWx0RXZlbnRzLCB0aGlzLmV2ZW50cyk7XG4gICAgICAgIE1hcmlvbmV0dGUuSXRlbVZpZXcucHJvdG90eXBlLmNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxufSk7XG5cbnZhciBNb3ZlRm9ybVZpZXcgPSBNb2RhbEZvcm0uZXh0ZW5kKHtcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShNb3ZlRm9ybVRwbCksXG4gICAgdWk6IHtcbiAgICAgICAgJ2Zvcm0nOiAnZm9ybScsXG4gICAgICAgICdzcG90JzogJ1tuYW1lPVwic3BvdFwiXScsXG4gICAgICAgICdzcG90SWQnOiAnW25hbWU9XCJzcG90X2lkXCJdJyxcbiAgICAgICAgJ3RpbWUnOiAnW25hbWU9XCJ0aW1lXCJdJyxcbiAgICAgICAgJ3N1Ym1pdCc6ICdbdHlwZT1cInN1Ym1pdFwiXSdcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgICAndHlwZWFoZWFkOnNlbGVjdCBAdWkuc3BvdCc6ICdvblR5cGVhaGVhZFNlbGVjdCcsXG4gICAgICAgICdjbGljayBbZGF0YS1hY3Rpb249XCJhZGRTcG90XCJdJzogJ2FkZFNwb3QnLFxuICAgICAgICAnc3VibWl0IEB1aS5mb3JtJzogJ29uRm9ybVN1Ym1pdCcsXG4gICAgICAgICdibHVyIEB1aS5zcG90JzogJ29uU3BvdEJsdXInLFxuICAgICAgICAnY2hhbmdlIEB1aS5mb3JtJzogJ3RvZ2dsZVNhdmVCdXR0b24nLFxuICAgICAgICAnaW5wdXQgaW5wdXRbdHlwZT1cInRleHRcIl0nOiAndG9nZ2xlU2F2ZUJ1dHRvbidcbiAgICB9LFxuICAgIGFkZFNwb3Q6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzcG90ID0gbmV3IFNwb3Qoe1xuICAgICAgICAgICAgbmFtZTogdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJylcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc3BvdC5zYXZlKHt9LCB7XG4gICAgICAgICAgICBzdWNjZXNzOiBfLmJpbmQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykuYWRkKHNwb3QpO1xuICAgICAgICAgICAgICAgIHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcsIHNwb3QuZ2V0KCduYW1lJykpLmJsdXIoKTtcbiAgICAgICAgICAgIH0sIHRoaXMpXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgZGVzZXJpYWxpemVNb2RlbDogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNwb3QgPSB0aGlzLm1vZGVsLmdldCgnc3BvdCcpO1xuICAgICAgICBpZiAoc3BvdCkge1xuICAgICAgICAgICAgdmFyIHNwb3ROYW1lID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLmdldChzcG90KS5nZXQoJ25hbWUnKTtcbiAgICAgICAgICAgIHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcsIHNwb3ROYW1lKTtcbiAgICAgICAgICAgIHRoaXMudWkuc3BvdElkLnZhbChzcG90KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdGltZSA9IHRoaXMubW9kZWwuZ2V0KCd0aW1lJyk7XG5cbiAgICAgICAgaWYgKHRpbWUpIHtcbiAgICAgICAgICAgIHRoaXMudWkudGltZS52YWwoIG1vbWVudCh0aW1lKS5mb3JtYXQoJ2g6bW0nKSApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBzZXJpYWxpemVGb3JtOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgZGF0YSA9IHt9O1xuICAgICAgICB2YXIgc3BvdElkID0gdGhpcy51aS5zcG90SWQudmFsKCk7XG4gICAgICAgIGlmIChzcG90SWQpIHtcbiAgICAgICAgICAgIGRhdGEuc3BvdCA9IHNwb3RJZDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdGltZSA9IHRoaXMucGFyc2VUaW1lKCk7XG4gICAgICAgIGlmICh0aW1lKSB7XG4gICAgICAgICAgICBkYXRhLnRpbWUgPSB0aW1lO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH0sXG4gICAgb25TaG93OiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLnJlbmRlclR5cGVhaGVhZCgpO1xuICAgICAgICB0aGlzLmRlc2VyaWFsaXplTW9kZWwoKTtcbiAgICAgICAgdGhpcy50b2dnbGVTYXZlQnV0dG9uKCk7XG4gICAgfSxcbiAgICByZW5kZXJUeXBlYWhlYWQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzcG90cyA9IG5ldyBCbG9vZGhvdW5kKHtcbiAgICAgICAgICAgIGRhdHVtVG9rZW5pemVyOiBCbG9vZGhvdW5kLnRva2VuaXplcnMub2JqLndoaXRlc3BhY2UoJ25hbWUnKSxcbiAgICAgICAgICAgIHF1ZXJ5VG9rZW5pemVyOiBCbG9vZGhvdW5kLnRva2VuaXplcnMud2hpdGVzcGFjZSxcbiAgICAgICAgICAgIGxvY2FsOiBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykudG9KU09OKClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy51aS5zcG90LnR5cGVhaGVhZCh7XG4gICAgICAgICAgICBoaW50OiB0cnVlLFxuICAgICAgICAgICAgaGlnaGxpZ2h0OiB0cnVlLFxuICAgICAgICAgICAgbWluTGVuZ3RoOiAxXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGRpc3BsYXk6ICduYW1lJyxcbiAgICAgICAgICAgIG5hbWU6ICdzcG90cycsXG4gICAgICAgICAgICBzb3VyY2U6IHNwb3RzLFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgZW1wdHk6IF8udGVtcGxhdGUoRW1wdHlRdWVyeVRwbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB0b2dnbGVTYXZlQnV0dG9uOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgZGF0YSA9IHRoaXMuc2VyaWFsaXplRm9ybSgpO1xuICAgICAgICB2YXIgaXNDb21wbGV0ZSA9IF8uaGFzKGRhdGEsICd0aW1lJykgJiYgXy5oYXMoZGF0YSwgJ3Nwb3QnKVxuICAgICAgICB0aGlzLnVpLnN1Ym1pdC50b2dnbGVDbGFzcygnaGlkZGVuJywgIWlzQ29tcGxldGUpO1xuICAgIH0sXG4gICAgb25Gb3JtU3VibWl0OiBmdW5jdGlvbihlKXtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgZGF0YSA9IHRoaXMuc2VyaWFsaXplRm9ybSgpO1xuICAgICAgICBpZiAoIV8uaXNFbXB0eShkYXRhKSl7XG4gICAgICAgICAgICB0aGlzLm1vZGVsLnNhdmUoZGF0YSwge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IF8uYmluZChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGVsLnRyaWdnZXIoJ3VwZGF0ZScpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRlbC5tb2RhbCgnaGlkZScpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbW92ZXMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmVzJyk7XG4gICAgICAgICAgICAgICAgICAgIG1vdmVzLmFkZCh0aGlzLm1vZGVsLCB7bWVyZ2U6IHRydWV9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RlbC50cmlnZ2VyKCd1cGRhdGUnKTtcbiAgICAgICAgICAgICAgICB9LCB0aGlzKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHBhcnNlVGltZTogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHN0cmluZyA9IHRoaXMudWkudGltZS52YWwoKTtcbiAgICAgICAgaWYgKCFzdHJpbmcgfHwgIXN0cmluZy5tYXRjaCgvXFxkezEsMn06XFxkezJ9LykpeyByZXR1cm4gJyc7IH1cblxuICAgICAgICB2YXIgc3BsaXQgPSBzdHJpbmcuc3BsaXQoJzonKS5tYXAoZnVuY3Rpb24obnVtKXtyZXR1cm4gK251bTsgfSk7XG4gICAgICAgIGlmIChzcGxpdFswXSA8IDYpIHtcbiAgICAgICAgICAgIHNwbGl0WzBdICs9IDEyO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1vbWVudChzcGxpdC5qb2luKCc6JyksICdoaDptbScpLmZvcm1hdCgpO1xuICAgIH0sXG4gICAgb25TcG90Qmx1cjogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNwb3RzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpO1xuICAgICAgICB2YXIgc3BvdElkID0gdGhpcy51aS5zcG90SWQudmFsKCk7XG5cbiAgICAgICAgaWYgKCFzcG90SWQpIHtcbiAgICAgICAgICAgIHZhciBzcG90VmFsID0gdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJyk7XG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWRTcG90ID0gc3BvdHMuZmluZChmdW5jdGlvbihzcG90KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3BvdC5nZXQoJ25hbWUnKS50b0xvd2VyQ2FzZSgpID09IHNwb3RWYWwudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWRTcG90KSB7XG4gICAgICAgICAgICAgICAgdGhpcy51aS5zcG90SWQudmFsKHNlbGVjdGVkU3BvdC5pZCkuY2hhbmdlKCk7XG4gICAgICAgICAgICAgICAgc3BvdElkID0gc2VsZWN0ZWRTcG90LmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJywgc3BvdElkID8gc3BvdHMuZ2V0KCtzcG90SWQpLmdldCgnbmFtZScpIDogJycpO1xuICAgIH0sXG4gICAgb25UeXBlYWhlYWRTZWxlY3Q6IGZ1bmN0aW9uKGUsIG9iail7XG4gICAgICAgIHRoaXMudWkuc3BvdElkLnZhbChvYmouaWQpLmNoYW5nZSgpO1xuICAgIH0sXG4gICAgdGVtcGxhdGVIZWxwZXJzOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3BvdHM6IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS50b0pTT04oKVxuICAgICAgICB9XG4gICAgfVxufSk7XG5cbnZhciBOYW1lVmlldyA9IE1vZGFsRm9ybS5leHRlbmQoe1xuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKE5hbWVGb3JtVHBsKSxcbiAgICB1aToge1xuICAgICAgICAnZm9ybSc6ICdmb3JtJyxcbiAgICAgICAgJ3VzZXInOiAnW25hbWU9XCJ1c2VyXCJdJyxcbiAgICAgICAgJ3N1Ym1pdCc6ICdbdHlwZT1cInN1Ym1pdFwiXSdcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgICAnc3VibWl0IEB1aS5mb3JtJzogJ29uRm9ybVN1Ym1pdCcsXG4gICAgICAgICdjaGFuZ2UgQHVpLmZvcm0nOiAndG9nZ2xlU2F2ZUJ1dHRvbicsXG4gICAgICAgICdpbnB1dCBpbnB1dFt0eXBlPVwidGV4dFwiXSc6ICd0b2dnbGVTYXZlQnV0dG9uJ1xuICAgIH0sXG4gICAgb25TaG93OiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLnRvZ2dsZVNhdmVCdXR0b24oKTtcbiAgICB9LFxuICAgIHRvZ2dsZVNhdmVCdXR0b246IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBkYXRhID0gdGhpcy5zZXJpYWxpemVGb3JtKCk7XG4gICAgICAgIHZhciBpc0NvbXBsZXRlID0gXy5oYXMoZGF0YSwgJ3VzZXInKTtcbiAgICAgICAgdGhpcy51aS5zdWJtaXQudG9nZ2xlQ2xhc3MoJ2hpZGRlbicsICFpc0NvbXBsZXRlKTtcbiAgICB9LFxuICAgIHNlcmlhbGl6ZUZvcm06IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciB1c2VyID0gdGhpcy51aS51c2VyLnZhbCgpO1xuICAgICAgICByZXR1cm4gKHVzZXIpID8ge3VzZXI6IHVzZXJ9IDogdXNlcjtcbiAgICB9LFxuICAgIG9uRm9ybVN1Ym1pdDogZnVuY3Rpb24oZSl7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIGRhdGEgPSB0aGlzLnNlcmlhbGl6ZUZvcm0oKTtcbiAgICAgICAgaWYgKCFfLmlzRW1wdHkoZGF0YSkpe1xuICAgICAgICAgICAgdGhpcy5tb2RlbC5zZXQoZGF0YSk7XG4gICAgICAgICAgICB0aGlzLiRlbC5tb2RhbCgnaGlkZScpO1xuICAgICAgICAgICAgc2V0VGltZW91dChfLmJpbmQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICB2YXIgdmlldyA9IG5ldyBNb3ZlRm9ybVZpZXcoe21vZGVsOiB0aGlzLm1vZGVsfSk7XG4gICAgICAgICAgICAgICAgY2hhbm5lbC5jb21tYW5kKCdzaG93Om1vZGFsJywgdmlldyk7XG4gICAgICAgICAgICB9LCB0aGlzKSwgMSk7XG4gICAgICAgIH1cbiAgICB9LFxufSk7XG5cblxudmFyIFlvdXJNb3ZlVmlldyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICB1aToge1xuICAgICAgICAnZWRpdE1vdmUnOiAnW2RhdGEtdWk9XCJlZGl0TW92ZVwiXSdcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgICAnY2xpY2sgQHVpLmVkaXRNb3ZlJzogJ2VkaXRNb3ZlJ1xuICAgIH0sXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoWW91ck1vdmVUcGwpLFxuICAgIGVkaXRNb3ZlOiBmdW5jdGlvbihlKXtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgVmlld0NsYXNzID0gdGhpcy5tb2RlbC5nZXQoJ3VzZXInKSA/IE1vdmVGb3JtVmlldyA6IE5hbWVWaWV3O1xuICAgICAgICB2YXIgdmlldyA9IG5ldyBWaWV3Q2xhc3Moe21vZGVsOiB0aGlzLm1vZGVsfSk7XG4gICAgICAgIGNoYW5uZWwuY29tbWFuZCgnc2hvdzptb2RhbCcsIHZpZXcpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbiAgICB0ZW1wbGF0ZUhlbHBlcnM6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzcG90cyA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3BvdE5hbWU6IHRoaXMubW9kZWwuaGFzKCdzcG90JykgPyBzcG90cy5nZXQodGhpcy5tb2RlbC5nZXQoJ3Nwb3QnKSkuZ2V0KCduYW1lJykgOiAnJ1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cblxudmFyIExheW91dFZpZXcgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShMYXlvdXRUcGwpLFxuICAgIHJlZ2lvbnM6IHtcbiAgICAgICAgJ3lvdXJNb3ZlJzogJ1tkYXRhLXJlZ2lvbj1cInlvdXJNb3ZlXCJdJyxcbiAgICAgICAgJ21vdmVzJzogJ1tkYXRhLXJlZ2lvbj1cIm1vdmVzXCJdJ1xuICAgIH0sXG4gICAgb25TaG93OiBmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMubW9kZWwuZ2V0KCdzcG90JykpIHtcbiAgICAgICAgICAgIHRoaXMuc2hvd0NoaWxkVmlldygneW91ck1vdmUnLCBuZXcgWW91ck1vdmVWaWV3KHtcbiAgICAgICAgICAgICAgICBtb2RlbDogdGhpcy5tb2RlbFxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zaG93Q2hpbGRWaWV3KCdtb3ZlcycsIG5ldyBMdW5jaE1vdmVzVmlldyh7XG4gICAgICAgICAgICBtb2RlbDogdGhpcy5tb2RlbCxcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMuY29sbGVjdGlvblxuICAgICAgICB9KSk7XG4gICAgfVxufSk7XG5cblxudmFyIExvYWRpbmdWaWV3ID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKExvYWRpbmdUcGwpXG59KTtcblxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIEx1bmNoTW92ZXNWaWV3OiBMdW5jaE1vdmVzVmlldyxcbiAgICBMb2FkaW5nVmlldzogTG9hZGluZ1ZpZXcsXG4gICAgTW92ZUZvcm1WaWV3OiBNb3ZlRm9ybVZpZXcsXG4gICAgTGF5b3V0VmlldzogTGF5b3V0Vmlld1xufVxuIl19
