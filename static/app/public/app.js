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
var LunchMoveTpl = "<div class=\"spot-name col-md-12\">\n    <span><%= spotName %></span>\n</div>\n<div class=\"spot-moves col-md-12\">\n    <% moves.each(function(move){ %>\n        <div class=\"move <%= isOwnMove(move) ? 'own-move' : '' %>\">\n            <div class=\"move-time\">\n                <span><%= move.get('time').format('h:mm') %></span>\n            </div>\n            <div class=\"move-name\">\n                <span>\n                    <% if (isOwnMove(move)) { %>\n                        You <span class=\"glyphicon glyphicon-pencil\"></span>\n                    <% } else { %>\n                        <%- move.get('user') %>\n                    <% } %>\n                </span>\n            </div>\n        </div>\n    <% }) %>\n    <% if (!hasOwnMove) { %>\n        <div class=\"move move-new\" data-ui=\"addMove\">\n            <div class=\"move-icon\">\n                <span class=\"glyphicon glyphicon-plus\"></span>\n            </div>\n            <div class=\"move-name\">\n                <span>Go Here</span>\n            </div>\n        </div>\n    <% } %>\n</div>\n";
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvYXBwLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9jb25zdGFudHMuanMiLCJub2RlX21vZHVsZXMvYXBwL2VudGl0aWVzLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9yb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvYXBwL3ZpZXdzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIkKGZ1bmN0aW9uKCl7XG5yZXF1aXJlKCdhcHAvY29uc3RhbnRzJyk7XG5cbnZhciBSb3V0ZXIgPSByZXF1aXJlKCdhcHAvcm91dGVyJyk7XG52YXIgU3BvdHMgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5TcG90cztcbnZhciBNb3ZlcyA9IHJlcXVpcmUoJ2FwcC9lbnRpdGllcycpLk1vdmVzO1xudmFyIE1vdmUgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5Nb3ZlO1xudmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxudmFyIHNwb3RzID0gbmV3IFNwb3RzKCk7XG52YXIgbW92ZXMgPSBuZXcgTW92ZXMoKTtcbnZhciBtb3ZlID0gbmV3IE1vdmUobHVuY2htb3ZlLnJlY2VudF9tb3ZlKTtcblxuY2hhbm5lbC5yZXBseSgnZW50aXRpZXM6c3BvdHMnLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBzcG90cztcbn0pO1xuXG5jaGFubmVsLnJlcGx5KCdlbnRpdGllczptb3ZlcycsIGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIG1vdmVzO1xufSk7XG5cbmNoYW5uZWwucmVwbHkoJ2VudGl0aWVzOm1vdmUnLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBtb3ZlO1xufSk7XG5cbm5ldyBSb3V0ZXIoKTtcblxuQmFja2JvbmUuaGlzdG9yeS5zdGFydCh7cHVzaFN0YXRlOiB0cnVlfSk7XG59KTtcbiIsInZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciBDb25zdGFudHMgPSB7XG4gICAgUkVDRU5UX1RIUkVTSE9MRDogbW9tZW50KCkuc3VidHJhY3QoNiwgJ2hvdXJzJylcbn07XG5cbmNoYW5uZWwuY29tcGx5KCdnZXQ6Y29uc3RhbnQnLCBmdW5jdGlvbihuYW1lKXtcbiAgICByZXR1cm4gQ29uc3RhbnRzW25hbWVdO1xufSlcbiIsInZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciBNb3ZlID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgICBkZWZhdWx0czoge1xuICAgICAgICBuYW1lOiBudWxsLFxuICAgICAgICBzcG90OiBudWxsLFxuICAgICAgICB0aW1lOiBudWxsXG4gICAgfSxcbiAgICB1cmxSb290OiAnL2pzb24vbW92ZXMvJyxcbiAgICBwYXJzZTogZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICByZXNwb25zZS50aW1lID0gbW9tZW50KHJlc3BvbnNlLnRpbWUgfHwgdW5kZWZpbmVkKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgIH1cbn0pO1xuXG52YXIgR3JvdXBlZE1vdmVzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIGNvbXBhcmF0b3I6IGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgcmV0dXJuIGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS5nZXQobW9kZWwuaWQpLmdldCgnbmFtZScpO1xuICAgIH1cbn0pO1xuXG52YXIgTW92ZXMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgbW9kZWw6IE1vdmUsXG4gICAgdXJsOiAnL2pzb24vbW92ZXMvJyxcbiAgICBwYXJzZTogZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVzdWx0cztcbiAgICB9LFxuICAgIGdyb3VwQnlTcG90OiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gdGhpcy5yZWR1Y2UoZnVuY3Rpb24oY29sbGVjdGlvbiwgbW92ZSl7XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSBjb2xsZWN0aW9uLmFkZCh7aWQ6IG1vdmUuZ2V0KCdzcG90Jyl9KTtcblxuICAgICAgICAgICAgaWYgKCFtb2RlbC5oYXMoJ21vdmVzJykpe1xuICAgICAgICAgICAgICAgIG1vZGVsLnNldCgnbW92ZXMnLCBuZXcgTW92ZXMoKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1vZGVsLmdldCgnbW92ZXMnKS5hZGQobW92ZSk7XG5cbiAgICAgICAgICAgIHJldHVybiBjb2xsZWN0aW9uO1xuICAgICAgICB9LCBuZXcgR3JvdXBlZE1vdmVzKCkpO1xuICAgIH1cbn0pO1xuXG52YXIgU3BvdCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgdXJsUm9vdDogJy9qc29uL3Nwb3RzLydcbn0pO1xuXG52YXIgU3BvdHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgdXJsOiAnL2pzb24vc3BvdHMvJyxcbiAgICBwYXJzZTogZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVzdWx0cztcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgU3BvdHM6IFNwb3RzLFxuICAgIE1vdmVzOiBNb3ZlcyxcbiAgICBNb3ZlOiBNb3ZlLFxuICAgIFNwb3Q6IFNwb3Rcbn1cbiIsInZhciBMdW5jaE1vdmVzVmlldyA9IHJlcXVpcmUoJ2FwcC92aWV3cycpLkx1bmNoTW92ZXNWaWV3O1xudmFyIE1vdmVGb3JtVmlldyA9IHJlcXVpcmUoJ2FwcC92aWV3cycpLk1vdmVGb3JtVmlldztcbnZhciBMb2FkaW5nVmlldyA9IHJlcXVpcmUoJ2FwcC92aWV3cycpLkxvYWRpbmdWaWV3O1xudmFyIExheW91dFZpZXcgPSByZXF1aXJlKCdhcHAvdmlld3MnKS5MYXlvdXRWaWV3O1xuXG52YXIgTW92ZSA9IHJlcXVpcmUoJ2FwcC9lbnRpdGllcycpLk1vdmU7XG52YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgcmVnaW9uTWFuYWdlciA9IG5ldyBNYXJpb25ldHRlLlJlZ2lvbk1hbmFnZXIoe1xuICAgIHJlZ2lvbnM6IHtcbiAgICAgICAgbWFpbjogJyNhcHAnLFxuICAgICAgICBtb2RhbDogJyNtb2RhbCdcbiAgICB9XG59KTtcblxuY2hhbm5lbC5jb21wbHkoJ3Nob3c6bW9kYWwnLCBmdW5jdGlvbih2aWV3KXtcbiAgICByZWdpb25NYW5hZ2VyLmdldCgnbW9kYWwnKS5zaG93KHZpZXcpO1xuICAgIHZpZXcuJGVsLm1vZGFsKCk7XG59KTtcblxudmFyIFJvdXRlciA9IEJhY2tib25lLlJvdXRlci5leHRlbmQoe1xuICAgIHJvdXRlczoge1xuICAgICAgICBcIlwiOiBcInNob3dNb3Zlc1wiLFxuICAgIH0sXG5cbiAgICBzaG93TW92ZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWdpb25NYW5hZ2VyLmdldCgnbWFpbicpLnNob3cobmV3IExvYWRpbmdWaWV3KCkpO1xuICAgICAgICB2YXIgbW92ZSA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZScpO1xuICAgICAgICB2YXIgbW92ZXMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmVzJyk7XG4gICAgICAgIHZhciBzcG90cyA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKTtcblxuICAgICAgICAkLndoZW4obW92ZXMuZmV0Y2goKSwgc3BvdHMuZmV0Y2goKSkuZG9uZShmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIGxheW91dFZpZXcgPSBuZXcgTGF5b3V0Vmlldyh7XG4gICAgICAgICAgICAgICAgbW9kZWw6IG1vdmUsXG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogbW92ZXMuZ3JvdXBCeVNwb3QoKVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJlZ2lvbk1hbmFnZXIuZ2V0KCdtYWluJykuc2hvdyhsYXlvdXRWaWV3KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBSb3V0ZXI7XG4iLCJcbnZhciBMYXlvdXRUcGwgPSBcIjxkaXYgZGF0YS1yZWdpb249XFxcIm1vdmVzXFxcIj48L2Rpdj5cXG48ZGl2IGRhdGEtcmVnaW9uPVxcXCJ5b3VyTW92ZVxcXCI+PC9kaXY+XFxuXCI7XG52YXIgWW91ck1vdmVUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbnRhaW5lciB5b3VyLW1vdmVcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJyb3dcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiY29sLXNtLTEyIHRleHQtY2VudGVyXFxcIj5cXG4gICAgICAgIDwlIGlmICghc3BvdCkgeyAlPlxcbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cXFwiYnV0dG9uXFxcIiBkYXRhLXVpPVxcXCJlZGl0TW92ZVxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCBidG4tbGdcXFwiPldoZXJlIGFyZSB5b3UgZ29pbmc/PC9idXR0b24+XFxuICAgICAgICA8JSB9ICU+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG52YXIgRW1wdHlUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbC1tZC0xMiB0ZXh0LWNlbnRlclxcXCI+XFxuICAgIE5vIG9uZSdzIGdvaW5nIGFueXdoZXJlLCBqdXN0IHF1aXRlIHlldC5cXG48L2Rpdj5cXG5cIjtcbnZhciBMdW5jaE1vdmVUcGwgPSBcIjxkaXYgY2xhc3M9XFxcInNwb3QtbmFtZSBjb2wtbWQtMTJcXFwiPlxcbiAgICA8c3Bhbj48JT0gc3BvdE5hbWUgJT48L3NwYW4+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwic3BvdC1tb3ZlcyBjb2wtbWQtMTJcXFwiPlxcbiAgICA8JSBtb3Zlcy5lYWNoKGZ1bmN0aW9uKG1vdmUpeyAlPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZSA8JT0gaXNPd25Nb3ZlKG1vdmUpID8gJ293bi1tb3ZlJyA6ICcnICU+XFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlLXRpbWVcXFwiPlxcbiAgICAgICAgICAgICAgICA8c3Bhbj48JT0gbW92ZS5nZXQoJ3RpbWUnKS5mb3JtYXQoJ2g6bW0nKSAlPjwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlLW5hbWVcXFwiPlxcbiAgICAgICAgICAgICAgICA8c3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDwlIGlmIChpc093bk1vdmUobW92ZSkpIHsgJT5cXG4gICAgICAgICAgICAgICAgICAgICAgICBZb3UgPHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcGVuY2lsXFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8JSB9IGVsc2UgeyAlPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwlLSBtb3ZlLmdldCgndXNlcicpICU+XFxuICAgICAgICAgICAgICAgICAgICA8JSB9ICU+XFxuICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8JSB9KSAlPlxcbiAgICA8JSBpZiAoIWhhc093bk1vdmUpIHsgJT5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmUgbW92ZS1uZXdcXFwiIGRhdGEtdWk9XFxcImFkZE1vdmVcXFwiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmUtaWNvblxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXBsdXNcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlLW5hbWVcXFwiPlxcbiAgICAgICAgICAgICAgICA8c3Bhbj5HbyBIZXJlPC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwlIH0gJT5cXG48L2Rpdj5cXG5cIjtcbnZhciBMdW5jaE1vdmVzVHBsID0gXCI8ZGl2IGNsYXNzPVxcXCJjb250YWluZXIgbW92ZXMtY29udGFpbmVyXFxcIj48L2Rpdj5cXG5cIjtcbnZhciBMb2FkaW5nVHBsID0gXCI8ZGl2IGNsYXNzPVxcXCJjb250YWluZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJyb3cgbG9hZGluZy1jb250YWluZXJcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic2stc3Bpbm5lciBzay1zcGlubmVyLXJvdGF0aW5nLXBsYW5lXFxcIj48L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG52YXIgTW92ZUZvcm1UcGwgPSBcIjxkaXYgY2xhc3M9XFxcIm1vZGFsLWRpYWxvZ1xcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcIm1vZGFsLWNvbnRlbnRcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwibW9kYWwtYm9keVxcXCIgZGF0YS11aT1cXFwibW9kYWxCb2R5XFxcIj5cXG4gICAgICAgICAgICA8Zm9ybSBjbGFzcz1cXFwiZm9ybS1pbmxpbmUgbHVuY2gtbW92ZS1mb3JtXFxcIj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibHVuY2gtbW92ZS1mb3JtLXJvd1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzcz1cXFwiZm9ybS1jb250cm9sLXN0YXRpY1xcXCI+WW91IGFyZSBlYXRpbmc8L3A+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cXFwiZm9ybS1jb250cm9sIHNwb3QtZmllbGRcXFwiIHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInNwb3RcXFwiIHBsYWNlaG9sZGVyPVxcXCJwbGFjZVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImhpZGRlblxcXCIgbmFtZT1cXFwic3BvdF9pZFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2wtc3RhdGljXFxcIj5hdDwvcD5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJmb3JtLWNvbnRyb2wgdGltZS1maWVsZFxcXCIgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwidGltZVxcXCIgcGxhY2Vob2xkZXI9XFxcInRpbWVcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJsdW5jaC1tb3ZlLWZvcm0tcm93XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIj5TYXZlPC9idXR0b24+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvZm9ybT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj48IS0tIC8ubW9kYWwtY29udGVudCAtLT5cXG48L2Rpdj48IS0tIC8ubW9kYWwtZGlhbG9nIC0tPlxcblwiO1xudmFyIE5hbWVGb3JtVHBsID0gXCI8ZGl2IGNsYXNzPVxcXCJtb2RhbC1kaWFsb2dcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJtb2RhbC1jb250ZW50XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vZGFsLWJvZHlcXFwiIGRhdGEtdWk9XFxcIm1vZGFsQm9keVxcXCI+XFxuICAgICAgICAgICAgPGZvcm0gY2xhc3M9XFxcImZvcm0taW5saW5lIGx1bmNoLW1vdmUtZm9ybVxcXCI+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImx1bmNoLW1vdmUtZm9ybS1yb3dcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3M9XFxcImZvcm0tY29udHJvbC1zdGF0aWNcXFwiPllvdXIgbmFtZSBpczwvcD5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiIHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInVzZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJsdW5jaC1tb3ZlLWZvcm0tcm93XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIj5TYXZlPC9idXR0b24+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvZm9ybT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj48IS0tIC8ubW9kYWwtY29udGVudCAtLT5cXG48L2Rpdj48IS0tIC8ubW9kYWwtZGlhbG9nIC0tPlxcblwiO1xudmFyIEVtcHR5UXVlcnlUcGwgPSBcIjxkaXYgY2xhc3M9XFxcInR0LWVtcHR5XFxcIj5cXG4gICAgPGJ1dHRvbiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHRcXFwiIGRhdGEtYWN0aW9uPVxcXCJhZGRTcG90XFxcIj5BZGQgXFxcIjwlPSBxdWVyeSAlPlxcXCI8L2J1dHRvbj5cXG48L2Rpdj5cXG5cIjtcbnZhciBTcG90ID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuU3BvdDtcblxudmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxudmFyIEx1bmNoTW92ZVZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgbW9kZWxFdmVudHM6IHtcbiAgICAgICAgJ2NoYW5nZTptb3Zlcyc6ICdyZW5kZXInXG4gICAgfSxcbiAgICBlZGl0OiBmdW5jdGlvbihlKXtcbiAgICAgICAgQmFja2JvbmUuaGlzdG9yeS5uYXZpZ2F0ZSgnJywge3RyaWdnZXI6IHRydWV9KTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICAgICdjbGljayBAdWkuYWRkTW92ZSc6ICdhZGRNb3ZlJyxcbiAgICAgICAgJ2NsaWNrIEB1aS5lZGl0TW92ZSc6ICdhZGRNb3ZlJ1xuICAgIH0sXG4gICAgdWk6IHtcbiAgICAgICAgJ2VkaXRNb3ZlJzogJy5vd24tbW92ZScsXG4gICAgICAgICdhZGRNb3ZlJzogJ1tkYXRhLXVpPVwiYWRkTW92ZVwiXSdcbiAgICB9LFxuICAgIGFkZE1vdmU6IGZ1bmN0aW9uKGUpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBvd25Nb3ZlID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlJyk7XG4gICAgICAgIG93bk1vdmUuc2V0KCdzcG90JywgdGhpcy5tb2RlbC5pZCk7XG4gICAgICAgIHZhciB2aWV3ID0gbmV3IE1vdmVGb3JtVmlldyh7bW9kZWw6IG93bk1vdmV9KTtcbiAgICAgICAgY2hhbm5lbC5jb21tYW5kKCdzaG93Om1vZGFsJywgdmlldyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuICAgIGNsYXNzTmFtZTogJ3JvdyBtb3ZlLXJvdycsXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTHVuY2hNb3ZlVHBsKSxcbiAgICB0ZW1wbGF0ZUhlbHBlcnM6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBvd25Nb3ZlID0gIGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZScpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3BvdE5hbWU6IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS5nZXQodGhpcy5tb2RlbC5pZCkuZ2V0KCduYW1lJyksXG4gICAgICAgICAgICBpc093bk1vdmU6IGZ1bmN0aW9uKG1vdmUpe1xuICAgICAgICAgICAgICAgIHJldHVybiBvd25Nb3ZlLmlkID09PSBtb3ZlLmlkO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhhc093bk1vdmU6ICEhdGhpcy5tb2RlbC5nZXQoJ21vdmVzJykuZ2V0KG93bk1vdmUuaWQpXG4gICAgICAgIH1cbiAgICB9XG59KTtcblxudmFyIEVtcHR5VmlldyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICBjbGFzc05hbWU6ICdyb3cnLFxuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKEVtcHR5VHBsKVxufSk7XG5cbnZhciBMdW5jaE1vdmVzVmlldyA9IE1hcmlvbmV0dGUuQ29tcG9zaXRlVmlldy5leHRlbmQoe1xuICAgIGNsYXNzTmFtZTogJ2x1bmNoLW1vdmVzLWxpc3QnLFxuICAgIG1vZGVsRXZlbnRzOiB7XG4gICAgICAgICd1cGRhdGUnOiAncmVjYWxjdWxhdGVNb3ZlcydcbiAgICB9LFxuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKEx1bmNoTW92ZXNUcGwpLFxuICAgIGNoaWxkVmlldzogTHVuY2hNb3ZlVmlldyxcbiAgICBlbXB0eVZpZXc6IEVtcHR5VmlldyxcbiAgICBjaGlsZFZpZXdDb250YWluZXI6ICcubW92ZXMtY29udGFpbmVyJyxcbiAgICByZWNhbGN1bGF0ZU1vdmVzOiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmNvbGxlY3Rpb24gPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmVzJykuZ3JvdXBCeVNwb3QoKTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG59KTtcblxudmFyIE1vZGFsRm9ybSA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICBjbGFzc05hbWU6ICdtb2RhbCcsXG4gICAgX2RlZmF1bHRFdmVudHM6IHtcbiAgICAgICAgJ2hpZGUuYnMubW9kYWwnOiAnZGVzdHJveSdcbiAgICB9LFxuICAgIGNvbnN0cnVjdG9yOiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmV2ZW50cyA9IF8uZXh0ZW5kKHRoaXMuX2RlZmF1bHRFdmVudHMsIHRoaXMuZXZlbnRzKTtcbiAgICAgICAgTWFyaW9uZXR0ZS5JdGVtVmlldy5wcm90b3R5cGUuY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG59KTtcblxudmFyIE1vdmVGb3JtVmlldyA9IE1vZGFsRm9ybS5leHRlbmQoe1xuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKE1vdmVGb3JtVHBsKSxcbiAgICB1aToge1xuICAgICAgICAnZm9ybSc6ICdmb3JtJyxcbiAgICAgICAgJ3Nwb3QnOiAnW25hbWU9XCJzcG90XCJdJyxcbiAgICAgICAgJ3Nwb3RJZCc6ICdbbmFtZT1cInNwb3RfaWRcIl0nLFxuICAgICAgICAndGltZSc6ICdbbmFtZT1cInRpbWVcIl0nLFxuICAgICAgICAnc3VibWl0JzogJ1t0eXBlPVwic3VibWl0XCJdJ1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICAgICd0eXBlYWhlYWQ6c2VsZWN0IEB1aS5zcG90JzogJ29uVHlwZWFoZWFkU2VsZWN0JyxcbiAgICAgICAgJ2NsaWNrIFtkYXRhLWFjdGlvbj1cImFkZFNwb3RcIl0nOiAnYWRkU3BvdCcsXG4gICAgICAgICdzdWJtaXQgQHVpLmZvcm0nOiAnb25Gb3JtU3VibWl0JyxcbiAgICAgICAgJ2JsdXIgQHVpLnNwb3QnOiAnb25TcG90Qmx1cicsXG4gICAgICAgICdjaGFuZ2UgQHVpLmZvcm0nOiAndG9nZ2xlU2F2ZUJ1dHRvbicsXG4gICAgICAgICdpbnB1dCBpbnB1dFt0eXBlPVwidGV4dFwiXSc6ICd0b2dnbGVTYXZlQnV0dG9uJ1xuICAgIH0sXG4gICAgYWRkU3BvdDogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNwb3QgPSBuZXcgU3BvdCh7XG4gICAgICAgICAgICBuYW1lOiB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnKVxuICAgICAgICB9KTtcblxuICAgICAgICBzcG90LnNhdmUoe30sIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IF8uYmluZChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS5hZGQoc3BvdCk7XG4gICAgICAgICAgICAgICAgdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJywgc3BvdC5nZXQoJ25hbWUnKSkuYmx1cigpO1xuICAgICAgICAgICAgfSwgdGhpcylcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBkZXNlcmlhbGl6ZU1vZGVsOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3BvdCA9IHRoaXMubW9kZWwuZ2V0KCdzcG90Jyk7XG4gICAgICAgIGlmIChzcG90KSB7XG4gICAgICAgICAgICB2YXIgc3BvdE5hbWUgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykuZ2V0KHNwb3QpLmdldCgnbmFtZScpO1xuICAgICAgICAgICAgdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJywgc3BvdE5hbWUpO1xuICAgICAgICAgICAgdGhpcy51aS5zcG90SWQudmFsKHNwb3QpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0aW1lID0gdGhpcy5tb2RlbC5nZXQoJ3RpbWUnKTtcblxuICAgICAgICBpZiAodGltZSkge1xuICAgICAgICAgICAgdGhpcy51aS50aW1lLnZhbCggbW9tZW50KHRpbWUpLmZvcm1hdCgnaDptbScpICk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHNlcmlhbGl6ZUZvcm06IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBkYXRhID0ge307XG4gICAgICAgIHZhciBzcG90SWQgPSB0aGlzLnVpLnNwb3RJZC52YWwoKTtcbiAgICAgICAgaWYgKHNwb3RJZCkge1xuICAgICAgICAgICAgZGF0YS5zcG90ID0gc3BvdElkO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0aW1lID0gdGhpcy5wYXJzZVRpbWUoKTtcbiAgICAgICAgaWYgKHRpbWUpIHtcbiAgICAgICAgICAgIGRhdGEudGltZSA9IHRpbWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSxcbiAgICBvblNob3c6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMucmVuZGVyVHlwZWFoZWFkKCk7XG4gICAgICAgIHRoaXMuZGVzZXJpYWxpemVNb2RlbCgpO1xuICAgICAgICB0aGlzLnRvZ2dsZVNhdmVCdXR0b24oKTtcbiAgICB9LFxuICAgIHJlbmRlclR5cGVhaGVhZDogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNwb3RzID0gbmV3IEJsb29kaG91bmQoe1xuICAgICAgICAgICAgZGF0dW1Ub2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy5vYmoud2hpdGVzcGFjZSgnbmFtZScpLFxuICAgICAgICAgICAgcXVlcnlUb2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy53aGl0ZXNwYWNlLFxuICAgICAgICAgICAgbG9jYWw6IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS50b0pTT04oKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKHtcbiAgICAgICAgICAgIGhpbnQ6IHRydWUsXG4gICAgICAgICAgICBoaWdobGlnaHQ6IHRydWUsXG4gICAgICAgICAgICBtaW5MZW5ndGg6IDFcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgZGlzcGxheTogJ25hbWUnLFxuICAgICAgICAgICAgbmFtZTogJ3Nwb3RzJyxcbiAgICAgICAgICAgIHNvdXJjZTogc3BvdHMsXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBlbXB0eTogXy50ZW1wbGF0ZShFbXB0eVF1ZXJ5VHBsKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHRvZ2dsZVNhdmVCdXR0b246IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBkYXRhID0gdGhpcy5zZXJpYWxpemVGb3JtKCk7XG4gICAgICAgIHZhciBpc0NvbXBsZXRlID0gXy5oYXMoZGF0YSwgJ3RpbWUnKSAmJiBfLmhhcyhkYXRhLCAnc3BvdCcpXG4gICAgICAgIHRoaXMudWkuc3VibWl0LnRvZ2dsZUNsYXNzKCdoaWRkZW4nLCAhaXNDb21wbGV0ZSk7XG4gICAgfSxcbiAgICBvbkZvcm1TdWJtaXQ6IGZ1bmN0aW9uKGUpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBkYXRhID0gdGhpcy5zZXJpYWxpemVGb3JtKCk7XG4gICAgICAgIGlmICghXy5pc0VtcHR5KGRhdGEpKXtcbiAgICAgICAgICAgIHRoaXMubW9kZWwuc2F2ZShkYXRhLCB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogXy5iaW5kKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZWwudHJpZ2dlcigndXBkYXRlJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGVsLm1vZGFsKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBtb3ZlcyA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZXMnKTtcbiAgICAgICAgICAgICAgICAgICAgbW92ZXMuYWRkKHRoaXMubW9kZWwsIHttZXJnZTogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGVsLnRyaWdnZXIoJ3VwZGF0ZScpO1xuICAgICAgICAgICAgICAgIH0sIHRoaXMpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgcGFyc2VUaW1lOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3RyaW5nID0gdGhpcy51aS50aW1lLnZhbCgpO1xuICAgICAgICBpZiAoIXN0cmluZyB8fCAhc3RyaW5nLm1hdGNoKC9cXGR7MSwyfTpcXGR7Mn0vKSl7IHJldHVybiAnJzsgfVxuXG4gICAgICAgIHZhciBzcGxpdCA9IHN0cmluZy5zcGxpdCgnOicpLm1hcChmdW5jdGlvbihudW0pe3JldHVybiArbnVtOyB9KTtcbiAgICAgICAgaWYgKHNwbGl0WzBdIDwgNikge1xuICAgICAgICAgICAgc3BsaXRbMF0gKz0gMTI7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbW9tZW50KHNwbGl0LmpvaW4oJzonKSwgJ2hoOm1tJykuZm9ybWF0KCk7XG4gICAgfSxcbiAgICBvblNwb3RCbHVyOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3BvdHMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJyk7XG4gICAgICAgIHZhciBzcG90SWQgPSB0aGlzLnVpLnNwb3RJZC52YWwoKTtcblxuICAgICAgICBpZiAoIXNwb3RJZCkge1xuICAgICAgICAgICAgdmFyIHNwb3RWYWwgPSB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnKTtcbiAgICAgICAgICAgIHZhciBzZWxlY3RlZFNwb3QgPSBzcG90cy5maW5kKGZ1bmN0aW9uKHNwb3Qpe1xuICAgICAgICAgICAgICAgIHJldHVybiBzcG90LmdldCgnbmFtZScpLnRvTG93ZXJDYXNlKCkgPT0gc3BvdFZhbC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChzZWxlY3RlZFNwb3QpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVpLnNwb3RJZC52YWwoc2VsZWN0ZWRTcG90LmlkKS5jaGFuZ2UoKTtcbiAgICAgICAgICAgICAgICBzcG90SWQgPSBzZWxlY3RlZFNwb3QuaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnLCBzcG90SWQgPyBzcG90cy5nZXQoK3Nwb3RJZCkuZ2V0KCduYW1lJykgOiAnJyk7XG4gICAgfSxcbiAgICBvblR5cGVhaGVhZFNlbGVjdDogZnVuY3Rpb24oZSwgb2JqKXtcbiAgICAgICAgdGhpcy51aS5zcG90SWQudmFsKG9iai5pZCkuY2hhbmdlKCk7XG4gICAgfSxcbiAgICB0ZW1wbGF0ZUhlbHBlcnM6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzcG90czogY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLnRvSlNPTigpXG4gICAgICAgIH1cbiAgICB9XG59KTtcblxudmFyIE5hbWVWaWV3ID0gTW9kYWxGb3JtLmV4dGVuZCh7XG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTmFtZUZvcm1UcGwpLFxuICAgIHVpOiB7XG4gICAgICAgICdmb3JtJzogJ2Zvcm0nLFxuICAgICAgICAndXNlcic6ICdbbmFtZT1cInVzZXJcIl0nLFxuICAgICAgICAnc3VibWl0JzogJ1t0eXBlPVwic3VibWl0XCJdJ1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICAgICdzdWJtaXQgQHVpLmZvcm0nOiAnb25Gb3JtU3VibWl0JyxcbiAgICAgICAgJ2NoYW5nZSBAdWkuZm9ybSc6ICd0b2dnbGVTYXZlQnV0dG9uJyxcbiAgICAgICAgJ2lucHV0IGlucHV0W3R5cGU9XCJ0ZXh0XCJdJzogJ3RvZ2dsZVNhdmVCdXR0b24nXG4gICAgfSxcbiAgICBvblNob3c6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMudG9nZ2xlU2F2ZUJ1dHRvbigpO1xuICAgIH0sXG4gICAgdG9nZ2xlU2F2ZUJ1dHRvbjogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGRhdGEgPSB0aGlzLnNlcmlhbGl6ZUZvcm0oKTtcbiAgICAgICAgdmFyIGlzQ29tcGxldGUgPSBfLmhhcyhkYXRhLCAndXNlcicpO1xuICAgICAgICB0aGlzLnVpLnN1Ym1pdC50b2dnbGVDbGFzcygnaGlkZGVuJywgIWlzQ29tcGxldGUpO1xuICAgIH0sXG4gICAgc2VyaWFsaXplRm9ybTogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHVzZXIgPSB0aGlzLnVpLnVzZXIudmFsKCk7XG4gICAgICAgIHJldHVybiAodXNlcikgPyB7dXNlcjogdXNlcn0gOiB1c2VyO1xuICAgIH0sXG4gICAgb25Gb3JtU3VibWl0OiBmdW5jdGlvbihlKXtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgZGF0YSA9IHRoaXMuc2VyaWFsaXplRm9ybSgpO1xuICAgICAgICBpZiAoIV8uaXNFbXB0eShkYXRhKSl7XG4gICAgICAgICAgICB0aGlzLm1vZGVsLnNldChkYXRhKTtcbiAgICAgICAgICAgIHRoaXMuJGVsLm1vZGFsKCdoaWRlJyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KF8uYmluZChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHZhciB2aWV3ID0gbmV3IE1vdmVGb3JtVmlldyh7bW9kZWw6IHRoaXMubW9kZWx9KTtcbiAgICAgICAgICAgICAgICBjaGFubmVsLmNvbW1hbmQoJ3Nob3c6bW9kYWwnLCB2aWV3KTtcbiAgICAgICAgICAgIH0sIHRoaXMpLCAxKTtcbiAgICAgICAgfVxuICAgIH0sXG59KTtcblxuXG52YXIgWW91ck1vdmVWaWV3ID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuICAgIHVpOiB7XG4gICAgICAgICdlZGl0TW92ZSc6ICdbZGF0YS11aT1cImVkaXRNb3ZlXCJdJ1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICAgICdjbGljayBAdWkuZWRpdE1vdmUnOiAnZWRpdE1vdmUnXG4gICAgfSxcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShZb3VyTW92ZVRwbCksXG4gICAgZWRpdE1vdmU6IGZ1bmN0aW9uKGUpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBWaWV3Q2xhc3MgPSB0aGlzLm1vZGVsLmdldCgndXNlcicpID8gTW92ZUZvcm1WaWV3IDogTmFtZVZpZXc7XG4gICAgICAgIHZhciB2aWV3ID0gbmV3IFZpZXdDbGFzcyh7bW9kZWw6IHRoaXMubW9kZWx9KTtcbiAgICAgICAgY2hhbm5lbC5jb21tYW5kKCdzaG93Om1vZGFsJywgdmlldyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuICAgIHRlbXBsYXRlSGVscGVyczogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNwb3RzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzcG90TmFtZTogdGhpcy5tb2RlbC5oYXMoJ3Nwb3QnKSA/IHNwb3RzLmdldCh0aGlzLm1vZGVsLmdldCgnc3BvdCcpKS5nZXQoJ25hbWUnKSA6ICcnXG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuXG52YXIgTGF5b3V0VmlldyA9IE1hcmlvbmV0dGUuTGF5b3V0Vmlldy5leHRlbmQoe1xuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKExheW91dFRwbCksXG4gICAgcmVnaW9uczoge1xuICAgICAgICAneW91ck1vdmUnOiAnW2RhdGEtcmVnaW9uPVwieW91ck1vdmVcIl0nLFxuICAgICAgICAnbW92ZXMnOiAnW2RhdGEtcmVnaW9uPVwibW92ZXNcIl0nXG4gICAgfSxcbiAgICBvblNob3c6IGZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5tb2RlbC5nZXQoJ3Nwb3QnKSkge1xuICAgICAgICAgICAgdGhpcy5zaG93Q2hpbGRWaWV3KCd5b3VyTW92ZScsIG5ldyBZb3VyTW92ZVZpZXcoe1xuICAgICAgICAgICAgICAgIG1vZGVsOiB0aGlzLm1vZGVsXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNob3dDaGlsZFZpZXcoJ21vdmVzJywgbmV3IEx1bmNoTW92ZXNWaWV3KHtcbiAgICAgICAgICAgIG1vZGVsOiB0aGlzLm1vZGVsLFxuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5jb2xsZWN0aW9uXG4gICAgICAgIH0pKTtcbiAgICB9XG59KTtcblxuXG52YXIgTG9hZGluZ1ZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTG9hZGluZ1RwbClcbn0pO1xuXG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgTHVuY2hNb3Zlc1ZpZXc6IEx1bmNoTW92ZXNWaWV3LFxuICAgIExvYWRpbmdWaWV3OiBMb2FkaW5nVmlldyxcbiAgICBNb3ZlRm9ybVZpZXc6IE1vdmVGb3JtVmlldyxcbiAgICBMYXlvdXRWaWV3OiBMYXlvdXRWaWV3XG59XG4iXX0=
