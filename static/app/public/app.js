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

},{"app/constants":2,"app/entities":3,"app/router":5}],2:[function(require,module,exports){
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
    },
    comparator: function(model){
        return moment(model.get('time')).valueOf();
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

var MoveFormTpl = "<div class=\"modal-dialog\">\n    <div class=\"modal-content\">\n        <div class=\"modal-body\" data-ui=\"modalBody\">\n            <form class=\"form-inline lunch-move-form\">\n                <div class=\"lunch-move-form-row\">\n                    <div class=\"form-group\">\n                        <p class=\"form-control-static\">You are eating</p>\n                    </div>\n                    <div class=\"form-group\">\n                        <input class=\"form-control spot-field\" type=\"text\" name=\"spot\" placeholder=\"place\">\n                        <input type=\"hidden\" name=\"spot_id\">\n                    </div>\n                    <div class=\"form-group\">\n                        <p class=\"form-control-static\">at</p>\n                    </div>\n                    <div class=\"form-group\">\n                        <input class=\"form-control time-field\" type=\"text\" name=\"time\" placeholder=\"time\">\n                    </div>\n                </div>\n                <div class=\"lunch-move-form-row\">\n                    <button type=\"submit\" class=\"btn btn-default\">Save</button>\n                </div>\n            </form>\n        </div>\n    </div><!-- /.modal-content -->\n</div><!-- /.modal-dialog -->\n";
var NameFormTpl = "<div class=\"modal-dialog\">\n    <div class=\"modal-content\">\n        <div class=\"modal-body\" data-ui=\"modalBody\">\n            <form class=\"form-inline lunch-move-form\">\n                <div class=\"lunch-move-form-row\">\n                    <div class=\"form-group\">\n                        <p class=\"form-control-static\">Your name is</p>\n                    </div>\n                    <div class=\"form-group\">\n                        <input class=\"form-control\" type=\"text\" name=\"user\">\n                    </div>\n                </div>\n                <div class=\"lunch-move-form-row\">\n                    <button type=\"submit\" class=\"btn btn-default\">Save</button>\n                </div>\n            </form>\n        </div>\n    </div><!-- /.modal-content -->\n</div><!-- /.modal-dialog -->\n";
var EmptyQueryTpl = "<div class=\"tt-empty\">\n    <button type=\"button\" class=\"btn btn-default\" data-action=\"addSpot\">Add \"<%- query %>\"</button>\n</div>\n";
var Spot = require('app/entities').Spot;

var channel = Backbone.Radio.channel('global');

var ModalForm = Marionette.ItemView.extend({
    className: 'modal',
    _defaultEvents: {
        'hide.bs.modal': 'destroy'
    },
    constructor: function(){
        this.events = _.extend(this._defaultEvents, this.events);
        Marionette.ItemView.prototype.constructor.apply(this, arguments);
    }
    // deserializeModel: function(){
    //     _.each(this.fields, function(modelField, fieldName){
    //         this.getField(name).val(this.model.get(modelField));
    //     });
    // },
    // getField: function(name){
    //     return this.$('[name="' + name + '"');
    // }
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
        var isComplete = _.has(data, 'time') && _.has(data, 'spot');
        this.ui.submit.toggleClass('disabled', !isComplete);
    },
    onFormSubmit: function(e){
        e.preventDefault();
        var data = this.serializeForm();
        if (_.has(data, 'time') && _.has(data, 'spot')){
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

        var wordMap = {
            'rightnow': 1,
            'immediately': 1,
            'now': 1,
            'soonish': 15,
            'soon': 15,
            'later': 60
        };

        var stringVal = wordMap[string.replace(/\W+/g, '').toLowerCase()];

        if (stringVal ) {
            return moment().add(stringVal, 'm').format();
        }

        var numVal = string.replace(/([^:0-9])/g, '');

        if (!numVal || !numVal.match(/\d{1,2}:\d{2}/)){ return ''; }

        var split = numVal.split(':').map(function(num){return +num; });
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
        this.ui.submit.toggleClass('disabled', !isComplete);
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

channel.comply('show:form', function(){
    var ownMove = channel.request('entities:move');
    var ViewClass = ownMove.get('user') ? MoveFormView : NameView;
    var view = new ViewClass({model: ownMove});
    channel.command('show:modal', view);
});

},{"app/entities":3}],5:[function(require,module,exports){
require('app/form-views');
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

},{"app/entities":3,"app/form-views":4,"app/views":6}],6:[function(require,module,exports){

var LayoutTpl = "<div data-region=\"moves\"></div>\n<div data-region=\"yourMove\"></div>\n";
var YourMoveTpl = "<div class=\"container your-move\">\n    <div class=\"row\">\n        <div class=\"col-sm-12 text-center\">\n        <% if (!spot) { %>\n            <button type=\"button\" data-ui=\"editMove\" class=\"btn btn-default btn-lg\">Where are you going?</button>\n        <% } %>\n        </div>\n    </div>\n</div>\n";
var EmptyTpl = "<div class=\"col-md-12 text-center\">\n    No one's going anywhere, just quite yet.\n</div>\n";
var LunchMoveTpl = "<div class=\"spot-name col-md-12\">\n    <span><%= spotName %></span>\n</div>\n<div class=\"spot-moves col-md-12\">\n    <% moves.each(function(move){ %>\n        <div class=\"move <%= isOwnMove(move) ? 'own-move' : '' %>\">\n            <div class=\"move-time\">\n                <span><%= move.get('time').format('h:mm') %></span>\n            </div>\n            <div class=\"move-name\">\n                <span>\n                    <% if (isOwnMove(move)) { %>\n                        You <span class=\"glyphicon glyphicon-pencil\"></span>\n                    <% } else { %>\n                        <%- move.get('user') %>\n                    <% } %>\n                </span>\n            </div>\n        </div>\n    <% }) %>\n    <% if (!hasOwnMove) { %>\n        <div class=\"move move-new\" data-ui=\"addMove\">\n            <div class=\"move-icon\">\n                <span class=\"glyphicon glyphicon-plus\"></span>\n            </div>\n            <div class=\"move-name\">\n                <span>Go Here</span>\n            </div>\n        </div>\n    <% } %>\n</div>\n";
var LunchMovesTpl = "<div class=\"container moves-container\"></div>\n";
var LoadingTpl = "<div class=\"container\">\n    <div class=\"row loading-container\">\n        <div class=\"sk-spinner sk-spinner-rotating-plane\"></div>\n    </div>\n</div>\n";

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
        channel.request('entities:move').set('spot', this.model.id);
        channel.command('show:form');
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


var YourMoveView = Marionette.ItemView.extend({
    modelEvents: {
        'change:spot': 'destroy'
    },
    ui: {
        'editMove': '[data-ui="editMove"]'
    },
    events: {
        'click @ui.editMove': 'editMove'
    },
    template: _.template(YourMoveTpl),
    editMove: function(e){
        e.preventDefault();
        channel.command('show:form');
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
    LoadingView: LoadingView,
    LayoutView: LayoutView
}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvYXBwLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9jb25zdGFudHMuanMiLCJub2RlX21vZHVsZXMvYXBwL2VudGl0aWVzLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9mb3JtLXZpZXdzLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9yb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvYXBwL3ZpZXdzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJChmdW5jdGlvbigpe1xucmVxdWlyZSgnYXBwL2NvbnN0YW50cycpO1xuXG52YXIgUm91dGVyID0gcmVxdWlyZSgnYXBwL3JvdXRlcicpO1xudmFyIFNwb3RzID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuU3BvdHM7XG52YXIgTW92ZXMgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5Nb3ZlcztcbnZhciBNb3ZlID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuTW92ZTtcbnZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciBzcG90cyA9IG5ldyBTcG90cygpO1xudmFyIG1vdmVzID0gbmV3IE1vdmVzKCk7XG52YXIgbW92ZSA9IG5ldyBNb3ZlKGx1bmNobW92ZS5yZWNlbnRfbW92ZSk7XG5cbmNoYW5uZWwucmVwbHkoJ2VudGl0aWVzOnNwb3RzJywgZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gc3BvdHM7XG59KTtcblxuY2hhbm5lbC5yZXBseSgnZW50aXRpZXM6bW92ZXMnLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBtb3Zlcztcbn0pO1xuXG5jaGFubmVsLnJlcGx5KCdlbnRpdGllczptb3ZlJywgZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gbW92ZTtcbn0pO1xuXG5uZXcgUm91dGVyKCk7XG5cbkJhY2tib25lLmhpc3Rvcnkuc3RhcnQoe3B1c2hTdGF0ZTogdHJ1ZX0pO1xufSk7XG4iLCJ2YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgQ29uc3RhbnRzID0ge1xuICAgIFJFQ0VOVF9USFJFU0hPTEQ6IG1vbWVudCgpLnN1YnRyYWN0KDYsICdob3VycycpXG59O1xuXG5jaGFubmVsLmNvbXBseSgnZ2V0OmNvbnN0YW50JywgZnVuY3Rpb24obmFtZSl7XG4gICAgcmV0dXJuIENvbnN0YW50c1tuYW1lXTtcbn0pXG4iLCJ2YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgTW92ZSA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgZGVmYXVsdHM6IHtcbiAgICAgICAgbmFtZTogbnVsbCxcbiAgICAgICAgc3BvdDogbnVsbCxcbiAgICAgICAgdGltZTogbnVsbFxuICAgIH0sXG4gICAgdXJsUm9vdDogJy9qc29uL21vdmVzLycsXG4gICAgcGFyc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgcmVzcG9uc2UudGltZSA9IG1vbWVudChyZXNwb25zZS50aW1lIHx8IHVuZGVmaW5lZCk7XG4gICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICB9XG59KTtcblxudmFyIEdyb3VwZWRNb3ZlcyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICBjb21wYXJhdG9yOiBmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgIHJldHVybiBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykuZ2V0KG1vZGVsLmlkKS5nZXQoJ25hbWUnKTtcbiAgICB9XG59KTtcblxudmFyIE1vdmVzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIG1vZGVsOiBNb3ZlLFxuICAgIHVybDogJy9qc29uL21vdmVzLycsXG4gICAgcGFyc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJlc3VsdHM7XG4gICAgfSxcbiAgICBncm91cEJ5U3BvdDogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVkdWNlKGZ1bmN0aW9uKGNvbGxlY3Rpb24sIG1vdmUpe1xuICAgICAgICAgICAgdmFyIG1vZGVsID0gY29sbGVjdGlvbi5hZGQoe2lkOiBtb3ZlLmdldCgnc3BvdCcpfSk7XG5cbiAgICAgICAgICAgIGlmICghbW9kZWwuaGFzKCdtb3ZlcycpKXtcbiAgICAgICAgICAgICAgICBtb2RlbC5zZXQoJ21vdmVzJywgbmV3IE1vdmVzKCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBtb2RlbC5nZXQoJ21vdmVzJykuYWRkKG1vdmUpO1xuXG4gICAgICAgICAgICByZXR1cm4gY29sbGVjdGlvbjtcbiAgICAgICAgfSwgbmV3IEdyb3VwZWRNb3ZlcygpKTtcbiAgICB9LFxuICAgIGNvbXBhcmF0b3I6IGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgcmV0dXJuIG1vbWVudChtb2RlbC5nZXQoJ3RpbWUnKSkudmFsdWVPZigpO1xuICAgIH1cbn0pO1xuXG52YXIgU3BvdCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgdXJsUm9vdDogJy9qc29uL3Nwb3RzLydcbn0pO1xuXG52YXIgU3BvdHMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgdXJsOiAnL2pzb24vc3BvdHMvJyxcbiAgICBwYXJzZTogZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVzdWx0cztcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgU3BvdHM6IFNwb3RzLFxuICAgIE1vdmVzOiBNb3ZlcyxcbiAgICBNb3ZlOiBNb3ZlLFxuICAgIFNwb3Q6IFNwb3Rcbn1cbiIsIlxudmFyIE1vdmVGb3JtVHBsID0gXCI8ZGl2IGNsYXNzPVxcXCJtb2RhbC1kaWFsb2dcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJtb2RhbC1jb250ZW50XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vZGFsLWJvZHlcXFwiIGRhdGEtdWk9XFxcIm1vZGFsQm9keVxcXCI+XFxuICAgICAgICAgICAgPGZvcm0gY2xhc3M9XFxcImZvcm0taW5saW5lIGx1bmNoLW1vdmUtZm9ybVxcXCI+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImx1bmNoLW1vdmUtZm9ybS1yb3dcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3M9XFxcImZvcm0tY29udHJvbC1zdGF0aWNcXFwiPllvdSBhcmUgZWF0aW5nPC9wPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XFxcImZvcm0tY29udHJvbCBzcG90LWZpZWxkXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJzcG90XFxcIiBwbGFjZWhvbGRlcj1cXFwicGxhY2VcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJoaWRkZW5cXFwiIG5hbWU9XFxcInNwb3RfaWRcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzcz1cXFwiZm9ybS1jb250cm9sLXN0YXRpY1xcXCI+YXQ8L3A+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cXFwiZm9ybS1jb250cm9sIHRpbWUtZmllbGRcXFwiIHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInRpbWVcXFwiIHBsYWNlaG9sZGVyPVxcXCJ0aW1lXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibHVuY2gtbW92ZS1mb3JtLXJvd1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XFxcInN1Ym1pdFxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCI+U2F2ZTwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8L2Zvcm0+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+PCEtLSAvLm1vZGFsLWNvbnRlbnQgLS0+XFxuPC9kaXY+PCEtLSAvLm1vZGFsLWRpYWxvZyAtLT5cXG5cIjtcbnZhciBOYW1lRm9ybVRwbCA9IFwiPGRpdiBjbGFzcz1cXFwibW9kYWwtZGlhbG9nXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwibW9kYWwtY29udGVudFxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb2RhbC1ib2R5XFxcIiBkYXRhLXVpPVxcXCJtb2RhbEJvZHlcXFwiPlxcbiAgICAgICAgICAgIDxmb3JtIGNsYXNzPVxcXCJmb3JtLWlubGluZSBsdW5jaC1tb3ZlLWZvcm1cXFwiPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJsdW5jaC1tb3ZlLWZvcm0tcm93XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2wtc3RhdGljXFxcIj5Zb3VyIG5hbWUgaXM8L3A+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cXFwiZm9ybS1jb250cm9sXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJ1c2VyXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibHVuY2gtbW92ZS1mb3JtLXJvd1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIHR5cGU9XFxcInN1Ym1pdFxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCI+U2F2ZTwvYnV0dG9uPlxcbiAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8L2Zvcm0+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+PCEtLSAvLm1vZGFsLWNvbnRlbnQgLS0+XFxuPC9kaXY+PCEtLSAvLm1vZGFsLWRpYWxvZyAtLT5cXG5cIjtcbnZhciBFbXB0eVF1ZXJ5VHBsID0gXCI8ZGl2IGNsYXNzPVxcXCJ0dC1lbXB0eVxcXCI+XFxuICAgIDxidXR0b24gdHlwZT1cXFwiYnV0dG9uXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIiBkYXRhLWFjdGlvbj1cXFwiYWRkU3BvdFxcXCI+QWRkIFxcXCI8JS0gcXVlcnkgJT5cXFwiPC9idXR0b24+XFxuPC9kaXY+XFxuXCI7XG52YXIgU3BvdCA9IHJlcXVpcmUoJ2FwcC9lbnRpdGllcycpLlNwb3Q7XG5cbnZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciBNb2RhbEZvcm0gPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgY2xhc3NOYW1lOiAnbW9kYWwnLFxuICAgIF9kZWZhdWx0RXZlbnRzOiB7XG4gICAgICAgICdoaWRlLmJzLm1vZGFsJzogJ2Rlc3Ryb3knXG4gICAgfSxcbiAgICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5ldmVudHMgPSBfLmV4dGVuZCh0aGlzLl9kZWZhdWx0RXZlbnRzLCB0aGlzLmV2ZW50cyk7XG4gICAgICAgIE1hcmlvbmV0dGUuSXRlbVZpZXcucHJvdG90eXBlLmNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIC8vIGRlc2VyaWFsaXplTW9kZWw6IGZ1bmN0aW9uKCl7XG4gICAgLy8gICAgIF8uZWFjaCh0aGlzLmZpZWxkcywgZnVuY3Rpb24obW9kZWxGaWVsZCwgZmllbGROYW1lKXtcbiAgICAvLyAgICAgICAgIHRoaXMuZ2V0RmllbGQobmFtZSkudmFsKHRoaXMubW9kZWwuZ2V0KG1vZGVsRmllbGQpKTtcbiAgICAvLyAgICAgfSk7XG4gICAgLy8gfSxcbiAgICAvLyBnZXRGaWVsZDogZnVuY3Rpb24obmFtZSl7XG4gICAgLy8gICAgIHJldHVybiB0aGlzLiQoJ1tuYW1lPVwiJyArIG5hbWUgKyAnXCInKTtcbiAgICAvLyB9XG59KTtcblxudmFyIE1vdmVGb3JtVmlldyA9IE1vZGFsRm9ybS5leHRlbmQoe1xuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKE1vdmVGb3JtVHBsKSxcbiAgICB1aToge1xuICAgICAgICAnZm9ybSc6ICdmb3JtJyxcbiAgICAgICAgJ3Nwb3QnOiAnW25hbWU9XCJzcG90XCJdJyxcbiAgICAgICAgJ3Nwb3RJZCc6ICdbbmFtZT1cInNwb3RfaWRcIl0nLFxuICAgICAgICAndGltZSc6ICdbbmFtZT1cInRpbWVcIl0nLFxuICAgICAgICAnc3VibWl0JzogJ1t0eXBlPVwic3VibWl0XCJdJ1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICAgICd0eXBlYWhlYWQ6c2VsZWN0IEB1aS5zcG90JzogJ29uVHlwZWFoZWFkU2VsZWN0JyxcbiAgICAgICAgJ2NsaWNrIFtkYXRhLWFjdGlvbj1cImFkZFNwb3RcIl0nOiAnYWRkU3BvdCcsXG4gICAgICAgICdzdWJtaXQgQHVpLmZvcm0nOiAnb25Gb3JtU3VibWl0JyxcbiAgICAgICAgJ2JsdXIgQHVpLnNwb3QnOiAnb25TcG90Qmx1cicsXG4gICAgICAgICdjaGFuZ2UgQHVpLmZvcm0nOiAndG9nZ2xlU2F2ZUJ1dHRvbicsXG4gICAgICAgICdpbnB1dCBpbnB1dFt0eXBlPVwidGV4dFwiXSc6ICd0b2dnbGVTYXZlQnV0dG9uJ1xuICAgIH0sXG4gICAgYWRkU3BvdDogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNwb3QgPSBuZXcgU3BvdCh7XG4gICAgICAgICAgICBuYW1lOiB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnKVxuICAgICAgICB9KTtcblxuICAgICAgICBzcG90LnNhdmUoe30sIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IF8uYmluZChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS5hZGQoc3BvdCk7XG4gICAgICAgICAgICAgICAgdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJywgc3BvdC5nZXQoJ25hbWUnKSkuYmx1cigpO1xuICAgICAgICAgICAgfSwgdGhpcylcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBkZXNlcmlhbGl6ZU1vZGVsOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3BvdCA9IHRoaXMubW9kZWwuZ2V0KCdzcG90Jyk7XG4gICAgICAgIGlmIChzcG90KSB7XG4gICAgICAgICAgICB2YXIgc3BvdE5hbWUgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykuZ2V0KHNwb3QpLmdldCgnbmFtZScpO1xuICAgICAgICAgICAgdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJywgc3BvdE5hbWUpO1xuICAgICAgICAgICAgdGhpcy51aS5zcG90SWQudmFsKHNwb3QpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0aW1lID0gdGhpcy5tb2RlbC5nZXQoJ3RpbWUnKTtcblxuICAgICAgICBpZiAodGltZSkge1xuICAgICAgICAgICAgdGhpcy51aS50aW1lLnZhbCggbW9tZW50KHRpbWUpLmZvcm1hdCgnaDptbScpICk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHNlcmlhbGl6ZUZvcm06IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBkYXRhID0ge307XG4gICAgICAgIHZhciBzcG90SWQgPSB0aGlzLnVpLnNwb3RJZC52YWwoKTtcbiAgICAgICAgaWYgKHNwb3RJZCkge1xuICAgICAgICAgICAgZGF0YS5zcG90ID0gc3BvdElkO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0aW1lID0gdGhpcy5wYXJzZVRpbWUoKTtcbiAgICAgICAgaWYgKHRpbWUpIHtcbiAgICAgICAgICAgIGRhdGEudGltZSA9IHRpbWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfSxcbiAgICBvblNob3c6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMucmVuZGVyVHlwZWFoZWFkKCk7XG4gICAgICAgIHRoaXMuZGVzZXJpYWxpemVNb2RlbCgpO1xuICAgICAgICB0aGlzLnRvZ2dsZVNhdmVCdXR0b24oKTtcbiAgICB9LFxuICAgIHJlbmRlclR5cGVhaGVhZDogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNwb3RzID0gbmV3IEJsb29kaG91bmQoe1xuICAgICAgICAgICAgZGF0dW1Ub2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy5vYmoud2hpdGVzcGFjZSgnbmFtZScpLFxuICAgICAgICAgICAgcXVlcnlUb2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy53aGl0ZXNwYWNlLFxuICAgICAgICAgICAgbG9jYWw6IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS50b0pTT04oKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKHtcbiAgICAgICAgICAgIGhpbnQ6IHRydWUsXG4gICAgICAgICAgICBoaWdobGlnaHQ6IHRydWUsXG4gICAgICAgICAgICBtaW5MZW5ndGg6IDFcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgZGlzcGxheTogJ25hbWUnLFxuICAgICAgICAgICAgbmFtZTogJ3Nwb3RzJyxcbiAgICAgICAgICAgIHNvdXJjZTogc3BvdHMsXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBlbXB0eTogXy50ZW1wbGF0ZShFbXB0eVF1ZXJ5VHBsKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIHRvZ2dsZVNhdmVCdXR0b246IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBkYXRhID0gdGhpcy5zZXJpYWxpemVGb3JtKCk7XG4gICAgICAgIHZhciBpc0NvbXBsZXRlID0gXy5oYXMoZGF0YSwgJ3RpbWUnKSAmJiBfLmhhcyhkYXRhLCAnc3BvdCcpO1xuICAgICAgICB0aGlzLnVpLnN1Ym1pdC50b2dnbGVDbGFzcygnZGlzYWJsZWQnLCAhaXNDb21wbGV0ZSk7XG4gICAgfSxcbiAgICBvbkZvcm1TdWJtaXQ6IGZ1bmN0aW9uKGUpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBkYXRhID0gdGhpcy5zZXJpYWxpemVGb3JtKCk7XG4gICAgICAgIGlmIChfLmhhcyhkYXRhLCAndGltZScpICYmIF8uaGFzKGRhdGEsICdzcG90Jykpe1xuICAgICAgICAgICAgdGhpcy5tb2RlbC5zYXZlKGRhdGEsIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBfLmJpbmQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RlbC50cmlnZ2VyKCd1cGRhdGUnKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kZWwubW9kYWwoJ2hpZGUnKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1vdmVzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlcycpO1xuICAgICAgICAgICAgICAgICAgICBtb3Zlcy5hZGQodGhpcy5tb2RlbCwge21lcmdlOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW9kZWwudHJpZ2dlcigndXBkYXRlJyk7XG4gICAgICAgICAgICAgICAgfSwgdGhpcylcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBwYXJzZVRpbWU6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzdHJpbmcgPSB0aGlzLnVpLnRpbWUudmFsKCk7XG5cbiAgICAgICAgdmFyIHdvcmRNYXAgPSB7XG4gICAgICAgICAgICAncmlnaHRub3cnOiAxLFxuICAgICAgICAgICAgJ2ltbWVkaWF0ZWx5JzogMSxcbiAgICAgICAgICAgICdub3cnOiAxLFxuICAgICAgICAgICAgJ3Nvb25pc2gnOiAxNSxcbiAgICAgICAgICAgICdzb29uJzogMTUsXG4gICAgICAgICAgICAnbGF0ZXInOiA2MFxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBzdHJpbmdWYWwgPSB3b3JkTWFwW3N0cmluZy5yZXBsYWNlKC9cXFcrL2csICcnKS50b0xvd2VyQ2FzZSgpXTtcblxuICAgICAgICBpZiAoc3RyaW5nVmFsICkge1xuICAgICAgICAgICAgcmV0dXJuIG1vbWVudCgpLmFkZChzdHJpbmdWYWwsICdtJykuZm9ybWF0KCk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbnVtVmFsID0gc3RyaW5nLnJlcGxhY2UoLyhbXjowLTldKS9nLCAnJyk7XG5cbiAgICAgICAgaWYgKCFudW1WYWwgfHwgIW51bVZhbC5tYXRjaCgvXFxkezEsMn06XFxkezJ9LykpeyByZXR1cm4gJyc7IH1cblxuICAgICAgICB2YXIgc3BsaXQgPSBudW1WYWwuc3BsaXQoJzonKS5tYXAoZnVuY3Rpb24obnVtKXtyZXR1cm4gK251bTsgfSk7XG4gICAgICAgIGlmIChzcGxpdFswXSA8IDYpIHtcbiAgICAgICAgICAgIHNwbGl0WzBdICs9IDEyO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1vbWVudChzcGxpdC5qb2luKCc6JyksICdoaDptbScpLmZvcm1hdCgpO1xuICAgIH0sXG4gICAgb25TcG90Qmx1cjogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNwb3RzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpO1xuICAgICAgICB2YXIgc3BvdElkID0gdGhpcy51aS5zcG90SWQudmFsKCk7XG5cbiAgICAgICAgaWYgKCFzcG90SWQpIHtcbiAgICAgICAgICAgIHZhciBzcG90VmFsID0gdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJyk7XG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWRTcG90ID0gc3BvdHMuZmluZChmdW5jdGlvbihzcG90KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3BvdC5nZXQoJ25hbWUnKS50b0xvd2VyQ2FzZSgpID09IHNwb3RWYWwudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWRTcG90KSB7XG4gICAgICAgICAgICAgICAgdGhpcy51aS5zcG90SWQudmFsKHNlbGVjdGVkU3BvdC5pZCkuY2hhbmdlKCk7XG4gICAgICAgICAgICAgICAgc3BvdElkID0gc2VsZWN0ZWRTcG90LmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJywgc3BvdElkID8gc3BvdHMuZ2V0KCtzcG90SWQpLmdldCgnbmFtZScpIDogJycpO1xuICAgIH0sXG4gICAgb25UeXBlYWhlYWRTZWxlY3Q6IGZ1bmN0aW9uKGUsIG9iail7XG4gICAgICAgIHRoaXMudWkuc3BvdElkLnZhbChvYmouaWQpLmNoYW5nZSgpO1xuICAgIH0sXG4gICAgdGVtcGxhdGVIZWxwZXJzOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3BvdHM6IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS50b0pTT04oKVxuICAgICAgICB9XG4gICAgfVxufSk7XG5cbnZhciBOYW1lVmlldyA9IE1vZGFsRm9ybS5leHRlbmQoe1xuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKE5hbWVGb3JtVHBsKSxcbiAgICB1aToge1xuICAgICAgICAnZm9ybSc6ICdmb3JtJyxcbiAgICAgICAgJ3VzZXInOiAnW25hbWU9XCJ1c2VyXCJdJyxcbiAgICAgICAgJ3N1Ym1pdCc6ICdbdHlwZT1cInN1Ym1pdFwiXSdcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgICAnc3VibWl0IEB1aS5mb3JtJzogJ29uRm9ybVN1Ym1pdCcsXG4gICAgICAgICdjaGFuZ2UgQHVpLmZvcm0nOiAndG9nZ2xlU2F2ZUJ1dHRvbicsXG4gICAgICAgICdpbnB1dCBpbnB1dFt0eXBlPVwidGV4dFwiXSc6ICd0b2dnbGVTYXZlQnV0dG9uJ1xuICAgIH0sXG4gICAgb25TaG93OiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLnRvZ2dsZVNhdmVCdXR0b24oKTtcbiAgICB9LFxuICAgIHRvZ2dsZVNhdmVCdXR0b246IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBkYXRhID0gdGhpcy5zZXJpYWxpemVGb3JtKCk7XG4gICAgICAgIHZhciBpc0NvbXBsZXRlID0gXy5oYXMoZGF0YSwgJ3VzZXInKTtcbiAgICAgICAgdGhpcy51aS5zdWJtaXQudG9nZ2xlQ2xhc3MoJ2Rpc2FibGVkJywgIWlzQ29tcGxldGUpO1xuICAgIH0sXG4gICAgc2VyaWFsaXplRm9ybTogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHVzZXIgPSB0aGlzLnVpLnVzZXIudmFsKCk7XG4gICAgICAgIHJldHVybiAodXNlcikgPyB7dXNlcjogdXNlcn0gOiB1c2VyO1xuICAgIH0sXG4gICAgb25Gb3JtU3VibWl0OiBmdW5jdGlvbihlKXtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgZGF0YSA9IHRoaXMuc2VyaWFsaXplRm9ybSgpO1xuICAgICAgICBpZiAoIV8uaXNFbXB0eShkYXRhKSl7XG4gICAgICAgICAgICB0aGlzLm1vZGVsLnNldChkYXRhKTtcbiAgICAgICAgICAgIHRoaXMuJGVsLm1vZGFsKCdoaWRlJyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KF8uYmluZChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIHZhciB2aWV3ID0gbmV3IE1vdmVGb3JtVmlldyh7bW9kZWw6IHRoaXMubW9kZWx9KTtcbiAgICAgICAgICAgICAgICBjaGFubmVsLmNvbW1hbmQoJ3Nob3c6bW9kYWwnLCB2aWV3KTtcbiAgICAgICAgICAgIH0sIHRoaXMpLCAxKTtcbiAgICAgICAgfVxuICAgIH0sXG59KTtcblxuY2hhbm5lbC5jb21wbHkoJ3Nob3c6Zm9ybScsIGZ1bmN0aW9uKCl7XG4gICAgdmFyIG93bk1vdmUgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmUnKTtcbiAgICB2YXIgVmlld0NsYXNzID0gb3duTW92ZS5nZXQoJ3VzZXInKSA/IE1vdmVGb3JtVmlldyA6IE5hbWVWaWV3O1xuICAgIHZhciB2aWV3ID0gbmV3IFZpZXdDbGFzcyh7bW9kZWw6IG93bk1vdmV9KTtcbiAgICBjaGFubmVsLmNvbW1hbmQoJ3Nob3c6bW9kYWwnLCB2aWV3KTtcbn0pO1xuIiwicmVxdWlyZSgnYXBwL2Zvcm0tdmlld3MnKTtcbnZhciBMb2FkaW5nVmlldyA9IHJlcXVpcmUoJ2FwcC92aWV3cycpLkxvYWRpbmdWaWV3O1xudmFyIExheW91dFZpZXcgPSByZXF1aXJlKCdhcHAvdmlld3MnKS5MYXlvdXRWaWV3O1xuXG52YXIgTW92ZSA9IHJlcXVpcmUoJ2FwcC9lbnRpdGllcycpLk1vdmU7XG52YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgcmVnaW9uTWFuYWdlciA9IG5ldyBNYXJpb25ldHRlLlJlZ2lvbk1hbmFnZXIoe1xuICAgIHJlZ2lvbnM6IHtcbiAgICAgICAgbWFpbjogJyNhcHAnLFxuICAgICAgICBtb2RhbDogJyNtb2RhbCdcbiAgICB9XG59KTtcblxuY2hhbm5lbC5jb21wbHkoJ3Nob3c6bW9kYWwnLCBmdW5jdGlvbih2aWV3KXtcbiAgICByZWdpb25NYW5hZ2VyLmdldCgnbW9kYWwnKS5zaG93KHZpZXcpO1xuICAgIHZpZXcuJGVsLm1vZGFsKCk7XG59KTtcblxudmFyIFJvdXRlciA9IEJhY2tib25lLlJvdXRlci5leHRlbmQoe1xuICAgIHJvdXRlczoge1xuICAgICAgICBcIlwiOiBcInNob3dNb3Zlc1wiLFxuICAgIH0sXG5cbiAgICBzaG93TW92ZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWdpb25NYW5hZ2VyLmdldCgnbWFpbicpLnNob3cobmV3IExvYWRpbmdWaWV3KCkpO1xuICAgICAgICB2YXIgbW92ZSA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZScpO1xuICAgICAgICB2YXIgbW92ZXMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmVzJyk7XG4gICAgICAgIHZhciBzcG90cyA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKTtcblxuICAgICAgICAkLndoZW4obW92ZXMuZmV0Y2goKSwgc3BvdHMuZmV0Y2goKSkuZG9uZShmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIGxheW91dFZpZXcgPSBuZXcgTGF5b3V0Vmlldyh7XG4gICAgICAgICAgICAgICAgbW9kZWw6IG1vdmUsXG4gICAgICAgICAgICAgICAgY29sbGVjdGlvbjogbW92ZXMuZ3JvdXBCeVNwb3QoKVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJlZ2lvbk1hbmFnZXIuZ2V0KCdtYWluJykuc2hvdyhsYXlvdXRWaWV3KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBSb3V0ZXI7XG4iLCJcbnZhciBMYXlvdXRUcGwgPSBcIjxkaXYgZGF0YS1yZWdpb249XFxcIm1vdmVzXFxcIj48L2Rpdj5cXG48ZGl2IGRhdGEtcmVnaW9uPVxcXCJ5b3VyTW92ZVxcXCI+PC9kaXY+XFxuXCI7XG52YXIgWW91ck1vdmVUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbnRhaW5lciB5b3VyLW1vdmVcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJyb3dcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiY29sLXNtLTEyIHRleHQtY2VudGVyXFxcIj5cXG4gICAgICAgIDwlIGlmICghc3BvdCkgeyAlPlxcbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cXFwiYnV0dG9uXFxcIiBkYXRhLXVpPVxcXCJlZGl0TW92ZVxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdCBidG4tbGdcXFwiPldoZXJlIGFyZSB5b3UgZ29pbmc/PC9idXR0b24+XFxuICAgICAgICA8JSB9ICU+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG52YXIgRW1wdHlUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbC1tZC0xMiB0ZXh0LWNlbnRlclxcXCI+XFxuICAgIE5vIG9uZSdzIGdvaW5nIGFueXdoZXJlLCBqdXN0IHF1aXRlIHlldC5cXG48L2Rpdj5cXG5cIjtcbnZhciBMdW5jaE1vdmVUcGwgPSBcIjxkaXYgY2xhc3M9XFxcInNwb3QtbmFtZSBjb2wtbWQtMTJcXFwiPlxcbiAgICA8c3Bhbj48JT0gc3BvdE5hbWUgJT48L3NwYW4+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwic3BvdC1tb3ZlcyBjb2wtbWQtMTJcXFwiPlxcbiAgICA8JSBtb3Zlcy5lYWNoKGZ1bmN0aW9uKG1vdmUpeyAlPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZSA8JT0gaXNPd25Nb3ZlKG1vdmUpID8gJ293bi1tb3ZlJyA6ICcnICU+XFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlLXRpbWVcXFwiPlxcbiAgICAgICAgICAgICAgICA8c3Bhbj48JT0gbW92ZS5nZXQoJ3RpbWUnKS5mb3JtYXQoJ2g6bW0nKSAlPjwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlLW5hbWVcXFwiPlxcbiAgICAgICAgICAgICAgICA8c3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDwlIGlmIChpc093bk1vdmUobW92ZSkpIHsgJT5cXG4gICAgICAgICAgICAgICAgICAgICAgICBZb3UgPHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcGVuY2lsXFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8JSB9IGVsc2UgeyAlPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwlLSBtb3ZlLmdldCgndXNlcicpICU+XFxuICAgICAgICAgICAgICAgICAgICA8JSB9ICU+XFxuICAgICAgICAgICAgICAgIDwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8JSB9KSAlPlxcbiAgICA8JSBpZiAoIWhhc093bk1vdmUpIHsgJT5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmUgbW92ZS1uZXdcXFwiIGRhdGEtdWk9XFxcImFkZE1vdmVcXFwiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmUtaWNvblxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXBsdXNcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlLW5hbWVcXFwiPlxcbiAgICAgICAgICAgICAgICA8c3Bhbj5HbyBIZXJlPC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwlIH0gJT5cXG48L2Rpdj5cXG5cIjtcbnZhciBMdW5jaE1vdmVzVHBsID0gXCI8ZGl2IGNsYXNzPVxcXCJjb250YWluZXIgbW92ZXMtY29udGFpbmVyXFxcIj48L2Rpdj5cXG5cIjtcbnZhciBMb2FkaW5nVHBsID0gXCI8ZGl2IGNsYXNzPVxcXCJjb250YWluZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJyb3cgbG9hZGluZy1jb250YWluZXJcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic2stc3Bpbm5lciBzay1zcGlubmVyLXJvdGF0aW5nLXBsYW5lXFxcIj48L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG5cbnZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciBMdW5jaE1vdmVWaWV3ID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuICAgIG1vZGVsRXZlbnRzOiB7XG4gICAgICAgICdjaGFuZ2U6bW92ZXMnOiAncmVuZGVyJ1xuICAgIH0sXG4gICAgZWRpdDogZnVuY3Rpb24oZSl7XG4gICAgICAgIEJhY2tib25lLmhpc3RvcnkubmF2aWdhdGUoJycsIHt0cmlnZ2VyOiB0cnVlfSk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgICAnY2xpY2sgQHVpLmFkZE1vdmUnOiAnYWRkTW92ZScsXG4gICAgICAgICdjbGljayBAdWkuZWRpdE1vdmUnOiAnYWRkTW92ZSdcbiAgICB9LFxuICAgIHVpOiB7XG4gICAgICAgICdlZGl0TW92ZSc6ICcub3duLW1vdmUnLFxuICAgICAgICAnYWRkTW92ZSc6ICdbZGF0YS11aT1cImFkZE1vdmVcIl0nXG4gICAgfSxcbiAgICBhZGRNb3ZlOiBmdW5jdGlvbihlKXtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmUnKS5zZXQoJ3Nwb3QnLCB0aGlzLm1vZGVsLmlkKTtcbiAgICAgICAgY2hhbm5lbC5jb21tYW5kKCdzaG93OmZvcm0nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgY2xhc3NOYW1lOiAncm93IG1vdmUtcm93JyxcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShMdW5jaE1vdmVUcGwpLFxuICAgIHRlbXBsYXRlSGVscGVyczogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIG93bk1vdmUgPSAgY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlJyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzcG90TmFtZTogY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLmdldCh0aGlzLm1vZGVsLmlkKS5nZXQoJ25hbWUnKSxcbiAgICAgICAgICAgIGlzT3duTW92ZTogZnVuY3Rpb24obW92ZSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG93bk1vdmUuaWQgPT09IG1vdmUuaWQ7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaGFzT3duTW92ZTogISF0aGlzLm1vZGVsLmdldCgnbW92ZXMnKS5nZXQob3duTW92ZS5pZClcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG52YXIgRW1wdHlWaWV3ID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuICAgIGNsYXNzTmFtZTogJ3JvdycsXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoRW1wdHlUcGwpXG59KTtcblxudmFyIEx1bmNoTW92ZXNWaWV3ID0gTWFyaW9uZXR0ZS5Db21wb3NpdGVWaWV3LmV4dGVuZCh7XG4gICAgY2xhc3NOYW1lOiAnbHVuY2gtbW92ZXMtbGlzdCcsXG4gICAgbW9kZWxFdmVudHM6IHtcbiAgICAgICAgJ3VwZGF0ZSc6ICdyZWNhbGN1bGF0ZU1vdmVzJ1xuICAgIH0sXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTHVuY2hNb3Zlc1RwbCksXG4gICAgY2hpbGRWaWV3OiBMdW5jaE1vdmVWaWV3LFxuICAgIGVtcHR5VmlldzogRW1wdHlWaWV3LFxuICAgIGNoaWxkVmlld0NvbnRhaW5lcjogJy5tb3Zlcy1jb250YWluZXInLFxuICAgIHJlY2FsY3VsYXRlTW92ZXM6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuY29sbGVjdGlvbiA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZXMnKS5ncm91cEJ5U3BvdCgpO1xuICAgICAgICB0aGlzLnJlbmRlcigpO1xuICAgIH1cbn0pO1xuXG5cbnZhciBZb3VyTW92ZVZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgbW9kZWxFdmVudHM6IHtcbiAgICAgICAgJ2NoYW5nZTpzcG90JzogJ2Rlc3Ryb3knXG4gICAgfSxcbiAgICB1aToge1xuICAgICAgICAnZWRpdE1vdmUnOiAnW2RhdGEtdWk9XCJlZGl0TW92ZVwiXSdcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgICAnY2xpY2sgQHVpLmVkaXRNb3ZlJzogJ2VkaXRNb3ZlJ1xuICAgIH0sXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoWW91ck1vdmVUcGwpLFxuICAgIGVkaXRNb3ZlOiBmdW5jdGlvbihlKXtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjaGFubmVsLmNvbW1hbmQoJ3Nob3c6Zm9ybScpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbiAgICB0ZW1wbGF0ZUhlbHBlcnM6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzcG90cyA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3BvdE5hbWU6IHRoaXMubW9kZWwuaGFzKCdzcG90JykgPyBzcG90cy5nZXQodGhpcy5tb2RlbC5nZXQoJ3Nwb3QnKSkuZ2V0KCduYW1lJykgOiAnJ1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cblxudmFyIExheW91dFZpZXcgPSBNYXJpb25ldHRlLkxheW91dFZpZXcuZXh0ZW5kKHtcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShMYXlvdXRUcGwpLFxuICAgIHJlZ2lvbnM6IHtcbiAgICAgICAgJ3lvdXJNb3ZlJzogJ1tkYXRhLXJlZ2lvbj1cInlvdXJNb3ZlXCJdJyxcbiAgICAgICAgJ21vdmVzJzogJ1tkYXRhLXJlZ2lvbj1cIm1vdmVzXCJdJ1xuICAgIH0sXG4gICAgb25TaG93OiBmdW5jdGlvbigpe1xuICAgICAgICBpZiAoIXRoaXMubW9kZWwuZ2V0KCdzcG90JykpIHtcbiAgICAgICAgICAgIHRoaXMuc2hvd0NoaWxkVmlldygneW91ck1vdmUnLCBuZXcgWW91ck1vdmVWaWV3KHtcbiAgICAgICAgICAgICAgICBtb2RlbDogdGhpcy5tb2RlbFxuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zaG93Q2hpbGRWaWV3KCdtb3ZlcycsIG5ldyBMdW5jaE1vdmVzVmlldyh7XG4gICAgICAgICAgICBtb2RlbDogdGhpcy5tb2RlbCxcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMuY29sbGVjdGlvblxuICAgICAgICB9KSk7XG4gICAgfVxufSk7XG5cblxudmFyIExvYWRpbmdWaWV3ID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKExvYWRpbmdUcGwpXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgTG9hZGluZ1ZpZXc6IExvYWRpbmdWaWV3LFxuICAgIExheW91dFZpZXc6IExheW91dFZpZXdcbn1cbiJdfQ==
