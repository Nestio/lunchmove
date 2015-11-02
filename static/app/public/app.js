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
            this.ui.submit.attr('disabled', true);
            this.model.save(data, {
                success: _.bind(function(){
                    this.ui.submit.attr('disabled', true);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvYXBwLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9jb25zdGFudHMuanMiLCJub2RlX21vZHVsZXMvYXBwL2VudGl0aWVzLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9mb3JtLXZpZXdzLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9yb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvYXBwL3ZpZXdzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIiQoZnVuY3Rpb24oKXtcbnJlcXVpcmUoJ2FwcC9jb25zdGFudHMnKTtcblxudmFyIFJvdXRlciA9IHJlcXVpcmUoJ2FwcC9yb3V0ZXInKTtcbnZhciBTcG90cyA9IHJlcXVpcmUoJ2FwcC9lbnRpdGllcycpLlNwb3RzO1xudmFyIE1vdmVzID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuTW92ZXM7XG52YXIgTW92ZSA9IHJlcXVpcmUoJ2FwcC9lbnRpdGllcycpLk1vdmU7XG52YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgc3BvdHMgPSBuZXcgU3BvdHMoKTtcbnZhciBtb3ZlcyA9IG5ldyBNb3ZlcygpO1xudmFyIG1vdmUgPSBuZXcgTW92ZShsdW5jaG1vdmUucmVjZW50X21vdmUpO1xuXG5jaGFubmVsLnJlcGx5KCdlbnRpdGllczpzcG90cycsIGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIHNwb3RzO1xufSk7XG5cbmNoYW5uZWwucmVwbHkoJ2VudGl0aWVzOm1vdmVzJywgZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gbW92ZXM7XG59KTtcblxuY2hhbm5lbC5yZXBseSgnZW50aXRpZXM6bW92ZScsIGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIG1vdmU7XG59KTtcblxubmV3IFJvdXRlcigpO1xuXG5CYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KHtwdXNoU3RhdGU6IHRydWV9KTtcbn0pO1xuIiwidmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxudmFyIENvbnN0YW50cyA9IHtcbiAgICBSRUNFTlRfVEhSRVNIT0xEOiBtb21lbnQoKS5zdWJ0cmFjdCg2LCAnaG91cnMnKVxufTtcblxuY2hhbm5lbC5jb21wbHkoJ2dldDpjb25zdGFudCcsIGZ1bmN0aW9uKG5hbWUpe1xuICAgIHJldHVybiBDb25zdGFudHNbbmFtZV07XG59KVxuIiwidmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxudmFyIE1vdmUgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgIGRlZmF1bHRzOiB7XG4gICAgICAgIG5hbWU6IG51bGwsXG4gICAgICAgIHNwb3Q6IG51bGwsXG4gICAgICAgIHRpbWU6IG51bGxcbiAgICB9LFxuICAgIHVybFJvb3Q6ICcvanNvbi9tb3Zlcy8nLFxuICAgIHBhcnNlOiBmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgIHJlc3BvbnNlLnRpbWUgPSBtb21lbnQocmVzcG9uc2UudGltZSB8fCB1bmRlZmluZWQpO1xuICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgfVxufSk7XG5cbnZhciBHcm91cGVkTW92ZXMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgY29tcGFyYXRvcjogZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICByZXR1cm4gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLmdldChtb2RlbC5pZCkuZ2V0KCduYW1lJyk7XG4gICAgfVxufSk7XG5cbnZhciBNb3ZlcyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICBtb2RlbDogTW92ZSxcbiAgICB1cmw6ICcvanNvbi9tb3Zlcy8nLFxuICAgIHBhcnNlOiBmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgIHJldHVybiByZXNwb25zZS5yZXN1bHRzO1xuICAgIH0sXG4gICAgZ3JvdXBCeVNwb3Q6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB0aGlzLnJlZHVjZShmdW5jdGlvbihjb2xsZWN0aW9uLCBtb3ZlKXtcbiAgICAgICAgICAgIHZhciBtb2RlbCA9IGNvbGxlY3Rpb24uYWRkKHtpZDogbW92ZS5nZXQoJ3Nwb3QnKX0pO1xuXG4gICAgICAgICAgICBpZiAoIW1vZGVsLmhhcygnbW92ZXMnKSl7XG4gICAgICAgICAgICAgICAgbW9kZWwuc2V0KCdtb3ZlcycsIG5ldyBNb3ZlcygpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbW9kZWwuZ2V0KCdtb3ZlcycpLmFkZChtb3ZlKTtcblxuICAgICAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb247XG4gICAgICAgIH0sIG5ldyBHcm91cGVkTW92ZXMoKSk7XG4gICAgfSxcbiAgICBjb21wYXJhdG9yOiBmdW5jdGlvbihtb2RlbCl7XG4gICAgICAgIHJldHVybiBtb21lbnQobW9kZWwuZ2V0KCd0aW1lJykpLnZhbHVlT2YoKTtcbiAgICB9XG59KTtcblxudmFyIFNwb3QgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgIHVybFJvb3Q6ICcvanNvbi9zcG90cy8nXG59KTtcblxudmFyIFNwb3RzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIHVybDogJy9qc29uL3Nwb3RzLycsXG4gICAgcGFyc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJlc3VsdHM7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFNwb3RzOiBTcG90cyxcbiAgICBNb3ZlczogTW92ZXMsXG4gICAgTW92ZTogTW92ZSxcbiAgICBTcG90OiBTcG90XG59XG4iLCJcbnZhciBNb3ZlRm9ybVRwbCA9IFwiPGRpdiBjbGFzcz1cXFwibW9kYWwtZGlhbG9nXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwibW9kYWwtY29udGVudFxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb2RhbC1ib2R5XFxcIiBkYXRhLXVpPVxcXCJtb2RhbEJvZHlcXFwiPlxcbiAgICAgICAgICAgIDxmb3JtIGNsYXNzPVxcXCJmb3JtLWlubGluZSBsdW5jaC1tb3ZlLWZvcm1cXFwiPlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJsdW5jaC1tb3ZlLWZvcm0tcm93XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2wtc3RhdGljXFxcIj5Zb3UgYXJlIGVhdGluZzwvcD5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJmb3JtLWNvbnRyb2wgc3BvdC1maWVsZFxcXCIgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwic3BvdFxcXCIgcGxhY2Vob2xkZXI9XFxcInBsYWNlXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiaGlkZGVuXFxcIiBuYW1lPVxcXCJzcG90X2lkXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3M9XFxcImZvcm0tY29udHJvbC1zdGF0aWNcXFwiPmF0PC9wPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XFxcImZvcm0tY29udHJvbCB0aW1lLWZpZWxkXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJ0aW1lXFxcIiBwbGFjZWhvbGRlcj1cXFwidGltZVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImx1bmNoLW1vdmUtZm9ybS1yb3dcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVxcXCJzdWJtaXRcXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHRcXFwiPlNhdmU8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9mb3JtPlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PjwhLS0gLy5tb2RhbC1jb250ZW50IC0tPlxcbjwvZGl2PjwhLS0gLy5tb2RhbC1kaWFsb2cgLS0+XFxuXCI7XG52YXIgTmFtZUZvcm1UcGwgPSBcIjxkaXYgY2xhc3M9XFxcIm1vZGFsLWRpYWxvZ1xcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcIm1vZGFsLWNvbnRlbnRcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwibW9kYWwtYm9keVxcXCIgZGF0YS11aT1cXFwibW9kYWxCb2R5XFxcIj5cXG4gICAgICAgICAgICA8Zm9ybSBjbGFzcz1cXFwiZm9ybS1pbmxpbmUgbHVuY2gtbW92ZS1mb3JtXFxcIj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibHVuY2gtbW92ZS1mb3JtLXJvd1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzcz1cXFwiZm9ybS1jb250cm9sLXN0YXRpY1xcXCI+WW91ciBuYW1lIGlzPC9wPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwidXNlclxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImx1bmNoLW1vdmUtZm9ybS1yb3dcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVxcXCJzdWJtaXRcXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHRcXFwiPlNhdmU8L2J1dHRvbj5cXG4gICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPC9mb3JtPlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PjwhLS0gLy5tb2RhbC1jb250ZW50IC0tPlxcbjwvZGl2PjwhLS0gLy5tb2RhbC1kaWFsb2cgLS0+XFxuXCI7XG52YXIgRW1wdHlRdWVyeVRwbCA9IFwiPGRpdiBjbGFzcz1cXFwidHQtZW1wdHlcXFwiPlxcbiAgICA8YnV0dG9uIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCIgZGF0YS1hY3Rpb249XFxcImFkZFNwb3RcXFwiPkFkZCBcXFwiPCUtIHF1ZXJ5ICU+XFxcIjwvYnV0dG9uPlxcbjwvZGl2PlxcblwiO1xudmFyIFNwb3QgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5TcG90O1xuXG52YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgTW9kYWxGb3JtID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuICAgIGNsYXNzTmFtZTogJ21vZGFsJyxcbiAgICBfZGVmYXVsdEV2ZW50czoge1xuICAgICAgICAnaGlkZS5icy5tb2RhbCc6ICdkZXN0cm95J1xuICAgIH0sXG4gICAgY29uc3RydWN0b3I6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuZXZlbnRzID0gXy5leHRlbmQodGhpcy5fZGVmYXVsdEV2ZW50cywgdGhpcy5ldmVudHMpO1xuICAgICAgICBNYXJpb25ldHRlLkl0ZW1WaWV3LnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICAvLyBkZXNlcmlhbGl6ZU1vZGVsOiBmdW5jdGlvbigpe1xuICAgIC8vICAgICBfLmVhY2godGhpcy5maWVsZHMsIGZ1bmN0aW9uKG1vZGVsRmllbGQsIGZpZWxkTmFtZSl7XG4gICAgLy8gICAgICAgICB0aGlzLmdldEZpZWxkKG5hbWUpLnZhbCh0aGlzLm1vZGVsLmdldChtb2RlbEZpZWxkKSk7XG4gICAgLy8gICAgIH0pO1xuICAgIC8vIH0sXG4gICAgLy8gZ2V0RmllbGQ6IGZ1bmN0aW9uKG5hbWUpe1xuICAgIC8vICAgICByZXR1cm4gdGhpcy4kKCdbbmFtZT1cIicgKyBuYW1lICsgJ1wiJyk7XG4gICAgLy8gfVxufSk7XG5cbnZhciBNb3ZlRm9ybVZpZXcgPSBNb2RhbEZvcm0uZXh0ZW5kKHtcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShNb3ZlRm9ybVRwbCksXG4gICAgdWk6IHtcbiAgICAgICAgJ2Zvcm0nOiAnZm9ybScsXG4gICAgICAgICdzcG90JzogJ1tuYW1lPVwic3BvdFwiXScsXG4gICAgICAgICdzcG90SWQnOiAnW25hbWU9XCJzcG90X2lkXCJdJyxcbiAgICAgICAgJ3RpbWUnOiAnW25hbWU9XCJ0aW1lXCJdJyxcbiAgICAgICAgJ3N1Ym1pdCc6ICdbdHlwZT1cInN1Ym1pdFwiXSdcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgICAndHlwZWFoZWFkOnNlbGVjdCBAdWkuc3BvdCc6ICdvblR5cGVhaGVhZFNlbGVjdCcsXG4gICAgICAgICdjbGljayBbZGF0YS1hY3Rpb249XCJhZGRTcG90XCJdJzogJ2FkZFNwb3QnLFxuICAgICAgICAnc3VibWl0IEB1aS5mb3JtJzogJ29uRm9ybVN1Ym1pdCcsXG4gICAgICAgICdibHVyIEB1aS5zcG90JzogJ29uU3BvdEJsdXInLFxuICAgICAgICAnY2hhbmdlIEB1aS5mb3JtJzogJ3RvZ2dsZVNhdmVCdXR0b24nLFxuICAgICAgICAnaW5wdXQgaW5wdXRbdHlwZT1cInRleHRcIl0nOiAndG9nZ2xlU2F2ZUJ1dHRvbidcbiAgICB9LFxuICAgIGFkZFNwb3Q6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzcG90ID0gbmV3IFNwb3Qoe1xuICAgICAgICAgICAgbmFtZTogdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJylcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc3BvdC5zYXZlKHt9LCB7XG4gICAgICAgICAgICBzdWNjZXNzOiBfLmJpbmQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykuYWRkKHNwb3QpO1xuICAgICAgICAgICAgICAgIHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcsIHNwb3QuZ2V0KCduYW1lJykpLmJsdXIoKTtcbiAgICAgICAgICAgIH0sIHRoaXMpXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgZGVzZXJpYWxpemVNb2RlbDogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNwb3QgPSB0aGlzLm1vZGVsLmdldCgnc3BvdCcpO1xuICAgICAgICBpZiAoc3BvdCkge1xuICAgICAgICAgICAgdmFyIHNwb3ROYW1lID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLmdldChzcG90KS5nZXQoJ25hbWUnKTtcbiAgICAgICAgICAgIHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcsIHNwb3ROYW1lKTtcbiAgICAgICAgICAgIHRoaXMudWkuc3BvdElkLnZhbChzcG90KTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdGltZSA9IHRoaXMubW9kZWwuZ2V0KCd0aW1lJyk7XG5cbiAgICAgICAgaWYgKHRpbWUpIHtcbiAgICAgICAgICAgIHRoaXMudWkudGltZS52YWwoIG1vbWVudCh0aW1lKS5mb3JtYXQoJ2g6bW0nKSApO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBzZXJpYWxpemVGb3JtOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgZGF0YSA9IHt9O1xuICAgICAgICB2YXIgc3BvdElkID0gdGhpcy51aS5zcG90SWQudmFsKCk7XG4gICAgICAgIGlmIChzcG90SWQpIHtcbiAgICAgICAgICAgIGRhdGEuc3BvdCA9IHNwb3RJZDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdGltZSA9IHRoaXMucGFyc2VUaW1lKCk7XG4gICAgICAgIGlmICh0aW1lKSB7XG4gICAgICAgICAgICBkYXRhLnRpbWUgPSB0aW1lO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH0sXG4gICAgb25TaG93OiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLnJlbmRlclR5cGVhaGVhZCgpO1xuICAgICAgICB0aGlzLmRlc2VyaWFsaXplTW9kZWwoKTtcbiAgICAgICAgdGhpcy50b2dnbGVTYXZlQnV0dG9uKCk7XG4gICAgfSxcbiAgICByZW5kZXJUeXBlYWhlYWQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzcG90cyA9IG5ldyBCbG9vZGhvdW5kKHtcbiAgICAgICAgICAgIGRhdHVtVG9rZW5pemVyOiBCbG9vZGhvdW5kLnRva2VuaXplcnMub2JqLndoaXRlc3BhY2UoJ25hbWUnKSxcbiAgICAgICAgICAgIHF1ZXJ5VG9rZW5pemVyOiBCbG9vZGhvdW5kLnRva2VuaXplcnMud2hpdGVzcGFjZSxcbiAgICAgICAgICAgIGxvY2FsOiBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykudG9KU09OKClcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy51aS5zcG90LnR5cGVhaGVhZCh7XG4gICAgICAgICAgICBoaW50OiB0cnVlLFxuICAgICAgICAgICAgaGlnaGxpZ2h0OiB0cnVlLFxuICAgICAgICAgICAgbWluTGVuZ3RoOiAxXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICAgIGRpc3BsYXk6ICduYW1lJyxcbiAgICAgICAgICAgIG5hbWU6ICdzcG90cycsXG4gICAgICAgICAgICBzb3VyY2U6IHNwb3RzLFxuICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgZW1wdHk6IF8udGVtcGxhdGUoRW1wdHlRdWVyeVRwbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICB0b2dnbGVTYXZlQnV0dG9uOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgZGF0YSA9IHRoaXMuc2VyaWFsaXplRm9ybSgpO1xuICAgICAgICB2YXIgaXNDb21wbGV0ZSA9IF8uaGFzKGRhdGEsICd0aW1lJykgJiYgXy5oYXMoZGF0YSwgJ3Nwb3QnKTtcbiAgICAgICAgdGhpcy51aS5zdWJtaXQudG9nZ2xlQ2xhc3MoJ2Rpc2FibGVkJywgIWlzQ29tcGxldGUpO1xuICAgIH0sXG4gICAgb25Gb3JtU3VibWl0OiBmdW5jdGlvbihlKXtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB2YXIgZGF0YSA9IHRoaXMuc2VyaWFsaXplRm9ybSgpO1xuICAgICAgICBpZiAoXy5oYXMoZGF0YSwgJ3RpbWUnKSAmJiBfLmhhcyhkYXRhLCAnc3BvdCcpKXtcbiAgICAgICAgICAgIHRoaXMudWkuc3VibWl0LmF0dHIoJ2Rpc2FibGVkJywgdHJ1ZSk7XG4gICAgICAgICAgICB0aGlzLm1vZGVsLnNhdmUoZGF0YSwge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IF8uYmluZChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnVpLnN1Ym1pdC5hdHRyKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGVsLnRyaWdnZXIoJ3VwZGF0ZScpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRlbC5tb2RhbCgnaGlkZScpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbW92ZXMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmVzJyk7XG4gICAgICAgICAgICAgICAgICAgIG1vdmVzLmFkZCh0aGlzLm1vZGVsLCB7bWVyZ2U6IHRydWV9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RlbC50cmlnZ2VyKCd1cGRhdGUnKTtcbiAgICAgICAgICAgICAgICB9LCB0aGlzKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHBhcnNlVGltZTogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHN0cmluZyA9IHRoaXMudWkudGltZS52YWwoKTtcblxuICAgICAgICB2YXIgd29yZE1hcCA9IHtcbiAgICAgICAgICAgICdyaWdodG5vdyc6IDEsXG4gICAgICAgICAgICAnaW1tZWRpYXRlbHknOiAxLFxuICAgICAgICAgICAgJ25vdyc6IDEsXG4gICAgICAgICAgICAnc29vbmlzaCc6IDE1LFxuICAgICAgICAgICAgJ3Nvb24nOiAxNSxcbiAgICAgICAgICAgICdsYXRlcic6IDYwXG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHN0cmluZ1ZhbCA9IHdvcmRNYXBbc3RyaW5nLnJlcGxhY2UoL1xcVysvZywgJycpLnRvTG93ZXJDYXNlKCldO1xuXG4gICAgICAgIGlmIChzdHJpbmdWYWwgKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50KCkuYWRkKHN0cmluZ1ZhbCwgJ20nKS5mb3JtYXQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBudW1WYWwgPSBzdHJpbmcucmVwbGFjZSgvKFteOjAtOV0pL2csICcnKTtcblxuICAgICAgICBpZiAoIW51bVZhbCB8fCAhbnVtVmFsLm1hdGNoKC9cXGR7MSwyfTpcXGR7Mn0vKSl7IHJldHVybiAnJzsgfVxuXG4gICAgICAgIHZhciBzcGxpdCA9IG51bVZhbC5zcGxpdCgnOicpLm1hcChmdW5jdGlvbihudW0pe3JldHVybiArbnVtOyB9KTtcbiAgICAgICAgaWYgKHNwbGl0WzBdIDwgNikge1xuICAgICAgICAgICAgc3BsaXRbMF0gKz0gMTI7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbW9tZW50KHNwbGl0LmpvaW4oJzonKSwgJ2hoOm1tJykuZm9ybWF0KCk7XG4gICAgfSxcbiAgICBvblNwb3RCbHVyOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3BvdHMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJyk7XG4gICAgICAgIHZhciBzcG90SWQgPSB0aGlzLnVpLnNwb3RJZC52YWwoKTtcblxuICAgICAgICBpZiAoIXNwb3RJZCkge1xuICAgICAgICAgICAgdmFyIHNwb3RWYWwgPSB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnKTtcbiAgICAgICAgICAgIHZhciBzZWxlY3RlZFNwb3QgPSBzcG90cy5maW5kKGZ1bmN0aW9uKHNwb3Qpe1xuICAgICAgICAgICAgICAgIHJldHVybiBzcG90LmdldCgnbmFtZScpLnRvTG93ZXJDYXNlKCkgPT0gc3BvdFZhbC50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmIChzZWxlY3RlZFNwb3QpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVpLnNwb3RJZC52YWwoc2VsZWN0ZWRTcG90LmlkKS5jaGFuZ2UoKTtcbiAgICAgICAgICAgICAgICBzcG90SWQgPSBzZWxlY3RlZFNwb3QuaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnLCBzcG90SWQgPyBzcG90cy5nZXQoK3Nwb3RJZCkuZ2V0KCduYW1lJykgOiAnJyk7XG4gICAgfSxcbiAgICBvblR5cGVhaGVhZFNlbGVjdDogZnVuY3Rpb24oZSwgb2JqKXtcbiAgICAgICAgdGhpcy51aS5zcG90SWQudmFsKG9iai5pZCkuY2hhbmdlKCk7XG4gICAgfSxcbiAgICB0ZW1wbGF0ZUhlbHBlcnM6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzcG90czogY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLnRvSlNPTigpXG4gICAgICAgIH1cbiAgICB9XG59KTtcblxudmFyIE5hbWVWaWV3ID0gTW9kYWxGb3JtLmV4dGVuZCh7XG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTmFtZUZvcm1UcGwpLFxuICAgIHVpOiB7XG4gICAgICAgICdmb3JtJzogJ2Zvcm0nLFxuICAgICAgICAndXNlcic6ICdbbmFtZT1cInVzZXJcIl0nLFxuICAgICAgICAnc3VibWl0JzogJ1t0eXBlPVwic3VibWl0XCJdJ1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICAgICdzdWJtaXQgQHVpLmZvcm0nOiAnb25Gb3JtU3VibWl0JyxcbiAgICAgICAgJ2NoYW5nZSBAdWkuZm9ybSc6ICd0b2dnbGVTYXZlQnV0dG9uJyxcbiAgICAgICAgJ2lucHV0IGlucHV0W3R5cGU9XCJ0ZXh0XCJdJzogJ3RvZ2dsZVNhdmVCdXR0b24nXG4gICAgfSxcbiAgICBvblNob3c6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMudG9nZ2xlU2F2ZUJ1dHRvbigpO1xuICAgIH0sXG4gICAgdG9nZ2xlU2F2ZUJ1dHRvbjogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGRhdGEgPSB0aGlzLnNlcmlhbGl6ZUZvcm0oKTtcbiAgICAgICAgdmFyIGlzQ29tcGxldGUgPSBfLmhhcyhkYXRhLCAndXNlcicpO1xuICAgICAgICB0aGlzLnVpLnN1Ym1pdC50b2dnbGVDbGFzcygnZGlzYWJsZWQnLCAhaXNDb21wbGV0ZSk7XG4gICAgfSxcbiAgICBzZXJpYWxpemVGb3JtOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgdXNlciA9IHRoaXMudWkudXNlci52YWwoKTtcbiAgICAgICAgcmV0dXJuICh1c2VyKSA/IHt1c2VyOiB1c2VyfSA6IHVzZXI7XG4gICAgfSxcbiAgICBvbkZvcm1TdWJtaXQ6IGZ1bmN0aW9uKGUpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHZhciBkYXRhID0gdGhpcy5zZXJpYWxpemVGb3JtKCk7XG4gICAgICAgIGlmICghXy5pc0VtcHR5KGRhdGEpKXtcbiAgICAgICAgICAgIHRoaXMubW9kZWwuc2V0KGRhdGEpO1xuICAgICAgICAgICAgdGhpcy4kZWwubW9kYWwoJ2hpZGUnKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoXy5iaW5kKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgdmFyIHZpZXcgPSBuZXcgTW92ZUZvcm1WaWV3KHttb2RlbDogdGhpcy5tb2RlbH0pO1xuICAgICAgICAgICAgICAgIGNoYW5uZWwuY29tbWFuZCgnc2hvdzptb2RhbCcsIHZpZXcpO1xuICAgICAgICAgICAgfSwgdGhpcyksIDEpO1xuICAgICAgICB9XG4gICAgfSxcbn0pO1xuXG5jaGFubmVsLmNvbXBseSgnc2hvdzpmb3JtJywgZnVuY3Rpb24oKXtcbiAgICB2YXIgb3duTW92ZSA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZScpO1xuICAgIHZhciBWaWV3Q2xhc3MgPSBvd25Nb3ZlLmdldCgndXNlcicpID8gTW92ZUZvcm1WaWV3IDogTmFtZVZpZXc7XG4gICAgdmFyIHZpZXcgPSBuZXcgVmlld0NsYXNzKHttb2RlbDogb3duTW92ZX0pO1xuICAgIGNoYW5uZWwuY29tbWFuZCgnc2hvdzptb2RhbCcsIHZpZXcpO1xufSk7XG4iLCJyZXF1aXJlKCdhcHAvZm9ybS12aWV3cycpO1xudmFyIExvYWRpbmdWaWV3ID0gcmVxdWlyZSgnYXBwL3ZpZXdzJykuTG9hZGluZ1ZpZXc7XG52YXIgTGF5b3V0VmlldyA9IHJlcXVpcmUoJ2FwcC92aWV3cycpLkxheW91dFZpZXc7XG5cbnZhciBNb3ZlID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuTW92ZTtcbnZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciByZWdpb25NYW5hZ2VyID0gbmV3IE1hcmlvbmV0dGUuUmVnaW9uTWFuYWdlcih7XG4gICAgcmVnaW9uczoge1xuICAgICAgICBtYWluOiAnI2FwcCcsXG4gICAgICAgIG1vZGFsOiAnI21vZGFsJ1xuICAgIH1cbn0pO1xuXG5jaGFubmVsLmNvbXBseSgnc2hvdzptb2RhbCcsIGZ1bmN0aW9uKHZpZXcpe1xuICAgIHJlZ2lvbk1hbmFnZXIuZ2V0KCdtb2RhbCcpLnNob3codmlldyk7XG4gICAgdmlldy4kZWwubW9kYWwoKTtcbn0pO1xuXG52YXIgUm91dGVyID0gQmFja2JvbmUuUm91dGVyLmV4dGVuZCh7XG4gICAgcm91dGVzOiB7XG4gICAgICAgIFwiXCI6IFwic2hvd01vdmVzXCIsXG4gICAgfSxcblxuICAgIHNob3dNb3ZlczogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlZ2lvbk1hbmFnZXIuZ2V0KCdtYWluJykuc2hvdyhuZXcgTG9hZGluZ1ZpZXcoKSk7XG4gICAgICAgIHZhciBtb3ZlID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlJyk7XG4gICAgICAgIHZhciBtb3ZlcyA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZXMnKTtcbiAgICAgICAgdmFyIHNwb3RzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpO1xuXG4gICAgICAgICQud2hlbihtb3Zlcy5mZXRjaCgpLCBzcG90cy5mZXRjaCgpKS5kb25lKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICB2YXIgbGF5b3V0VmlldyA9IG5ldyBMYXlvdXRWaWV3KHtcbiAgICAgICAgICAgICAgICBtb2RlbDogbW92ZSxcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiBtb3Zlcy5ncm91cEJ5U3BvdCgpXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmVnaW9uTWFuYWdlci5nZXQoJ21haW4nKS5zaG93KGxheW91dFZpZXcpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJvdXRlcjtcbiIsIlxudmFyIExheW91dFRwbCA9IFwiPGRpdiBkYXRhLXJlZ2lvbj1cXFwibW92ZXNcXFwiPjwvZGl2PlxcbjxkaXYgZGF0YS1yZWdpb249XFxcInlvdXJNb3ZlXFxcIj48L2Rpdj5cXG5cIjtcbnZhciBZb3VyTW92ZVRwbCA9IFwiPGRpdiBjbGFzcz1cXFwiY29udGFpbmVyIHlvdXItbW92ZVxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInJvd1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjb2wtc20tMTIgdGV4dC1jZW50ZXJcXFwiPlxcbiAgICAgICAgPCUgaWYgKCFzcG90KSB7ICU+XFxuICAgICAgICAgICAgPGJ1dHRvbiB0eXBlPVxcXCJidXR0b25cXFwiIGRhdGEtdWk9XFxcImVkaXRNb3ZlXFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0IGJ0bi1sZ1xcXCI+V2hlcmUgYXJlIHlvdSBnb2luZz88L2J1dHRvbj5cXG4gICAgICAgIDwlIH0gJT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbnZhciBFbXB0eVRwbCA9IFwiPGRpdiBjbGFzcz1cXFwiY29sLW1kLTEyIHRleHQtY2VudGVyXFxcIj5cXG4gICAgTm8gb25lJ3MgZ29pbmcgYW55d2hlcmUsIGp1c3QgcXVpdGUgeWV0LlxcbjwvZGl2PlxcblwiO1xudmFyIEx1bmNoTW92ZVRwbCA9IFwiPGRpdiBjbGFzcz1cXFwic3BvdC1uYW1lIGNvbC1tZC0xMlxcXCI+XFxuICAgIDxzcGFuPjwlPSBzcG90TmFtZSAlPjwvc3Bhbj5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJzcG90LW1vdmVzIGNvbC1tZC0xMlxcXCI+XFxuICAgIDwlIG1vdmVzLmVhY2goZnVuY3Rpb24obW92ZSl7ICU+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlIDwlPSBpc093bk1vdmUobW92ZSkgPyAnb3duLW1vdmUnIDogJycgJT5cXFwiPlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmUtdGltZVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuPjwlPSBtb3ZlLmdldCgndGltZScpLmZvcm1hdCgnaDptbScpICU+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmUtbmFtZVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPCUgaWYgKGlzT3duTW92ZShtb3ZlKSkgeyAlPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIFlvdSA8c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1wZW5jaWxcXFwiPjwvc3Bhbj5cXG4gICAgICAgICAgICAgICAgICAgIDwlIH0gZWxzZSB7ICU+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPCUtIG1vdmUuZ2V0KCd1c2VyJykgJT5cXG4gICAgICAgICAgICAgICAgICAgIDwlIH0gJT5cXG4gICAgICAgICAgICAgICAgPC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwlIH0pICU+XFxuICAgIDwlIGlmICghaGFzT3duTW92ZSkgeyAlPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZSBtb3ZlLW5ld1xcXCIgZGF0YS11aT1cXFwiYWRkTW92ZVxcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZS1pY29uXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImdseXBoaWNvbiBnbHlwaGljb24tcGx1c1xcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmUtbmFtZVxcXCI+XFxuICAgICAgICAgICAgICAgIDxzcGFuPkdvIEhlcmU8L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPCUgfSAlPlxcbjwvZGl2PlxcblwiO1xudmFyIEx1bmNoTW92ZXNUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbnRhaW5lciBtb3Zlcy1jb250YWluZXJcXFwiPjwvZGl2PlxcblwiO1xudmFyIExvYWRpbmdUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbnRhaW5lclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInJvdyBsb2FkaW5nLWNvbnRhaW5lclxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzay1zcGlubmVyIHNrLXNwaW5uZXItcm90YXRpbmctcGxhbmVcXFwiPjwvZGl2PlxcbiAgICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcblxudmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxudmFyIEx1bmNoTW92ZVZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgbW9kZWxFdmVudHM6IHtcbiAgICAgICAgJ2NoYW5nZTptb3Zlcyc6ICdyZW5kZXInXG4gICAgfSxcbiAgICBlZGl0OiBmdW5jdGlvbihlKXtcbiAgICAgICAgQmFja2JvbmUuaGlzdG9yeS5uYXZpZ2F0ZSgnJywge3RyaWdnZXI6IHRydWV9KTtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICAgICdjbGljayBAdWkuYWRkTW92ZSc6ICdhZGRNb3ZlJyxcbiAgICAgICAgJ2NsaWNrIEB1aS5lZGl0TW92ZSc6ICdhZGRNb3ZlJ1xuICAgIH0sXG4gICAgdWk6IHtcbiAgICAgICAgJ2VkaXRNb3ZlJzogJy5vd24tbW92ZScsXG4gICAgICAgICdhZGRNb3ZlJzogJ1tkYXRhLXVpPVwiYWRkTW92ZVwiXSdcbiAgICB9LFxuICAgIGFkZE1vdmU6IGZ1bmN0aW9uKGUpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZScpLnNldCgnc3BvdCcsIHRoaXMubW9kZWwuaWQpO1xuICAgICAgICBjaGFubmVsLmNvbW1hbmQoJ3Nob3c6Zm9ybScpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbiAgICBjbGFzc05hbWU6ICdyb3cgbW92ZS1yb3cnLFxuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKEx1bmNoTW92ZVRwbCksXG4gICAgdGVtcGxhdGVIZWxwZXJzOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgb3duTW92ZSA9ICBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmUnKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNwb3ROYW1lOiBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykuZ2V0KHRoaXMubW9kZWwuaWQpLmdldCgnbmFtZScpLFxuICAgICAgICAgICAgaXNPd25Nb3ZlOiBmdW5jdGlvbihtb3ZlKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gb3duTW92ZS5pZCA9PT0gbW92ZS5pZDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBoYXNPd25Nb3ZlOiAhIXRoaXMubW9kZWwuZ2V0KCdtb3ZlcycpLmdldChvd25Nb3ZlLmlkKVxuICAgICAgICB9XG4gICAgfVxufSk7XG5cbnZhciBFbXB0eVZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgY2xhc3NOYW1lOiAncm93JyxcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShFbXB0eVRwbClcbn0pO1xuXG52YXIgTHVuY2hNb3Zlc1ZpZXcgPSBNYXJpb25ldHRlLkNvbXBvc2l0ZVZpZXcuZXh0ZW5kKHtcbiAgICBjbGFzc05hbWU6ICdsdW5jaC1tb3Zlcy1saXN0JyxcbiAgICBtb2RlbEV2ZW50czoge1xuICAgICAgICAndXBkYXRlJzogJ3JlY2FsY3VsYXRlTW92ZXMnXG4gICAgfSxcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShMdW5jaE1vdmVzVHBsKSxcbiAgICBjaGlsZFZpZXc6IEx1bmNoTW92ZVZpZXcsXG4gICAgZW1wdHlWaWV3OiBFbXB0eVZpZXcsXG4gICAgY2hpbGRWaWV3Q29udGFpbmVyOiAnLm1vdmVzLWNvbnRhaW5lcicsXG4gICAgcmVjYWxjdWxhdGVNb3ZlczogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5jb2xsZWN0aW9uID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlcycpLmdyb3VwQnlTcG90KCk7XG4gICAgICAgIHRoaXMucmVuZGVyKCk7XG4gICAgfVxufSk7XG5cblxudmFyIFlvdXJNb3ZlVmlldyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICBtb2RlbEV2ZW50czoge1xuICAgICAgICAnY2hhbmdlOnNwb3QnOiAnZGVzdHJveSdcbiAgICB9LFxuICAgIHVpOiB7XG4gICAgICAgICdlZGl0TW92ZSc6ICdbZGF0YS11aT1cImVkaXRNb3ZlXCJdJ1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICAgICdjbGljayBAdWkuZWRpdE1vdmUnOiAnZWRpdE1vdmUnXG4gICAgfSxcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShZb3VyTW92ZVRwbCksXG4gICAgZWRpdE1vdmU6IGZ1bmN0aW9uKGUpe1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNoYW5uZWwuY29tbWFuZCgnc2hvdzpmb3JtJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuICAgIHRlbXBsYXRlSGVscGVyczogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNwb3RzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzcG90TmFtZTogdGhpcy5tb2RlbC5oYXMoJ3Nwb3QnKSA/IHNwb3RzLmdldCh0aGlzLm1vZGVsLmdldCgnc3BvdCcpKS5nZXQoJ25hbWUnKSA6ICcnXG4gICAgICAgIH1cbiAgICB9XG59KTtcblxuXG52YXIgTGF5b3V0VmlldyA9IE1hcmlvbmV0dGUuTGF5b3V0Vmlldy5leHRlbmQoe1xuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKExheW91dFRwbCksXG4gICAgcmVnaW9uczoge1xuICAgICAgICAneW91ck1vdmUnOiAnW2RhdGEtcmVnaW9uPVwieW91ck1vdmVcIl0nLFxuICAgICAgICAnbW92ZXMnOiAnW2RhdGEtcmVnaW9uPVwibW92ZXNcIl0nXG4gICAgfSxcbiAgICBvblNob3c6IGZ1bmN0aW9uKCl7XG4gICAgICAgIGlmICghdGhpcy5tb2RlbC5nZXQoJ3Nwb3QnKSkge1xuICAgICAgICAgICAgdGhpcy5zaG93Q2hpbGRWaWV3KCd5b3VyTW92ZScsIG5ldyBZb3VyTW92ZVZpZXcoe1xuICAgICAgICAgICAgICAgIG1vZGVsOiB0aGlzLm1vZGVsXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnNob3dDaGlsZFZpZXcoJ21vdmVzJywgbmV3IEx1bmNoTW92ZXNWaWV3KHtcbiAgICAgICAgICAgIG1vZGVsOiB0aGlzLm1vZGVsLFxuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5jb2xsZWN0aW9uXG4gICAgICAgIH0pKTtcbiAgICB9XG59KTtcblxuXG52YXIgTG9hZGluZ1ZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTG9hZGluZ1RwbClcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBMb2FkaW5nVmlldzogTG9hZGluZ1ZpZXcsXG4gICAgTGF5b3V0VmlldzogTGF5b3V0Vmlld1xufVxuIl19
