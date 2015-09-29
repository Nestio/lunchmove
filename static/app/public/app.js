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

},{}],5:[function(require,module,exports){
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

},{"app/entities":3}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvYXBwLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9jb25zdGFudHMuanMiLCJub2RlX21vZHVsZXMvYXBwL2VudGl0aWVzLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9mb3JtLXZpZXdzLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9yb3V0ZXIuanMiLCJub2RlX21vZHVsZXMvYXBwL3ZpZXdzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIkKGZ1bmN0aW9uKCl7XG5yZXF1aXJlKCdhcHAvY29uc3RhbnRzJyk7XG5cbnZhciBSb3V0ZXIgPSByZXF1aXJlKCdhcHAvcm91dGVyJyk7XG52YXIgU3BvdHMgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5TcG90cztcbnZhciBNb3ZlcyA9IHJlcXVpcmUoJ2FwcC9lbnRpdGllcycpLk1vdmVzO1xudmFyIE1vdmUgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5Nb3ZlO1xudmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxudmFyIHNwb3RzID0gbmV3IFNwb3RzKCk7XG52YXIgbW92ZXMgPSBuZXcgTW92ZXMoKTtcbnZhciBtb3ZlID0gbmV3IE1vdmUobHVuY2htb3ZlLnJlY2VudF9tb3ZlKTtcblxuY2hhbm5lbC5yZXBseSgnZW50aXRpZXM6c3BvdHMnLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBzcG90cztcbn0pO1xuXG5jaGFubmVsLnJlcGx5KCdlbnRpdGllczptb3ZlcycsIGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIG1vdmVzO1xufSk7XG5cbmNoYW5uZWwucmVwbHkoJ2VudGl0aWVzOm1vdmUnLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBtb3ZlO1xufSk7XG5cbm5ldyBSb3V0ZXIoKTtcblxuQmFja2JvbmUuaGlzdG9yeS5zdGFydCh7cHVzaFN0YXRlOiB0cnVlfSk7XG59KTtcbiIsInZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciBDb25zdGFudHMgPSB7XG4gICAgUkVDRU5UX1RIUkVTSE9MRDogbW9tZW50KCkuc3VidHJhY3QoNiwgJ2hvdXJzJylcbn07XG5cbmNoYW5uZWwuY29tcGx5KCdnZXQ6Y29uc3RhbnQnLCBmdW5jdGlvbihuYW1lKXtcbiAgICByZXR1cm4gQ29uc3RhbnRzW25hbWVdO1xufSlcbiIsInZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciBNb3ZlID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgICBkZWZhdWx0czoge1xuICAgICAgICBuYW1lOiBudWxsLFxuICAgICAgICBzcG90OiBudWxsLFxuICAgICAgICB0aW1lOiBudWxsXG4gICAgfSxcbiAgICB1cmxSb290OiAnL2pzb24vbW92ZXMvJyxcbiAgICBwYXJzZTogZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICByZXNwb25zZS50aW1lID0gbW9tZW50KHJlc3BvbnNlLnRpbWUgfHwgdW5kZWZpbmVkKTtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgIH1cbn0pO1xuXG52YXIgR3JvdXBlZE1vdmVzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIGNvbXBhcmF0b3I6IGZ1bmN0aW9uKG1vZGVsKXtcbiAgICAgICAgcmV0dXJuIGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS5nZXQobW9kZWwuaWQpLmdldCgnbmFtZScpO1xuICAgIH1cbn0pO1xuXG52YXIgTW92ZXMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgbW9kZWw6IE1vdmUsXG4gICAgdXJsOiAnL2pzb24vbW92ZXMvJyxcbiAgICBwYXJzZTogZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVzdWx0cztcbiAgICB9LFxuICAgIGdyb3VwQnlTcG90OiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gdGhpcy5yZWR1Y2UoZnVuY3Rpb24oY29sbGVjdGlvbiwgbW92ZSl7XG4gICAgICAgICAgICB2YXIgbW9kZWwgPSBjb2xsZWN0aW9uLmFkZCh7aWQ6IG1vdmUuZ2V0KCdzcG90Jyl9KTtcblxuICAgICAgICAgICAgaWYgKCFtb2RlbC5oYXMoJ21vdmVzJykpe1xuICAgICAgICAgICAgICAgIG1vZGVsLnNldCgnbW92ZXMnLCBuZXcgTW92ZXMoKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG1vZGVsLmdldCgnbW92ZXMnKS5hZGQobW92ZSk7XG5cbiAgICAgICAgICAgIHJldHVybiBjb2xsZWN0aW9uO1xuICAgICAgICB9LCBuZXcgR3JvdXBlZE1vdmVzKCkpO1xuICAgIH0sXG4gICAgY29tcGFyYXRvcjogZnVuY3Rpb24obW9kZWwpe1xuICAgICAgICByZXR1cm4gbW9tZW50KG1vZGVsLmdldCgndGltZScpKS52YWx1ZU9mKCk7XG4gICAgfVxufSk7XG5cbnZhciBTcG90ID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgICB1cmxSb290OiAnL2pzb24vc3BvdHMvJ1xufSk7XG5cbnZhciBTcG90cyA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICB1cmw6ICcvanNvbi9zcG90cy8nLFxuICAgIHBhcnNlOiBmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgIHJldHVybiByZXNwb25zZS5yZXN1bHRzO1xuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBTcG90czogU3BvdHMsXG4gICAgTW92ZXM6IE1vdmVzLFxuICAgIE1vdmU6IE1vdmUsXG4gICAgU3BvdDogU3BvdFxufVxuIiwiXG52YXIgTW92ZUZvcm1UcGwgPSBcIjxkaXYgY2xhc3M9XFxcIm1vZGFsLWRpYWxvZ1xcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcIm1vZGFsLWNvbnRlbnRcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwibW9kYWwtYm9keVxcXCIgZGF0YS11aT1cXFwibW9kYWxCb2R5XFxcIj5cXG4gICAgICAgICAgICA8Zm9ybSBjbGFzcz1cXFwiZm9ybS1pbmxpbmUgbHVuY2gtbW92ZS1mb3JtXFxcIj5cXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibHVuY2gtbW92ZS1mb3JtLXJvd1xcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8cCBjbGFzcz1cXFwiZm9ybS1jb250cm9sLXN0YXRpY1xcXCI+WW91IGFyZSBlYXRpbmc8L3A+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz1cXFwiZm9ybS1jb250cm9sIHNwb3QtZmllbGRcXFwiIHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInNwb3RcXFwiIHBsYWNlaG9sZGVyPVxcXCJwbGFjZVxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XFxcImhpZGRlblxcXCIgbmFtZT1cXFwic3BvdF9pZFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzPVxcXCJmb3JtLWNvbnRyb2wtc3RhdGljXFxcIj5hdDwvcD5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJmb3JtLWNvbnRyb2wgdGltZS1maWVsZFxcXCIgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwidGltZVxcXCIgcGxhY2Vob2xkZXI9XFxcInRpbWVcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJsdW5jaC1tb3ZlLWZvcm0tcm93XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIj5TYXZlPC9idXR0b24+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvZm9ybT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj48IS0tIC8ubW9kYWwtY29udGVudCAtLT5cXG48L2Rpdj48IS0tIC8ubW9kYWwtZGlhbG9nIC0tPlxcblwiO1xudmFyIE5hbWVGb3JtVHBsID0gXCI8ZGl2IGNsYXNzPVxcXCJtb2RhbC1kaWFsb2dcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJtb2RhbC1jb250ZW50XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vZGFsLWJvZHlcXFwiIGRhdGEtdWk9XFxcIm1vZGFsQm9keVxcXCI+XFxuICAgICAgICAgICAgPGZvcm0gY2xhc3M9XFxcImZvcm0taW5saW5lIGx1bmNoLW1vdmUtZm9ybVxcXCI+XFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImx1bmNoLW1vdmUtZm9ybS1yb3dcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3M9XFxcImZvcm0tY29udHJvbC1zdGF0aWNcXFwiPllvdXIgbmFtZSBpczwvcD5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1ncm91cFxcXCI+XFxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJmb3JtLWNvbnRyb2xcXFwiIHR5cGU9XFxcInRleHRcXFwiIG5hbWU9XFxcInVzZXJcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJsdW5jaC1tb3ZlLWZvcm0tcm93XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cXFwic3VibWl0XFxcIiBjbGFzcz1cXFwiYnRuIGJ0bi1kZWZhdWx0XFxcIj5TYXZlPC9idXR0b24+XFxuICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgIDwvZm9ybT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj48IS0tIC8ubW9kYWwtY29udGVudCAtLT5cXG48L2Rpdj48IS0tIC8ubW9kYWwtZGlhbG9nIC0tPlxcblwiO1xudmFyIEVtcHR5UXVlcnlUcGwgPSBcIjxkaXYgY2xhc3M9XFxcInR0LWVtcHR5XFxcIj5cXG4gICAgPGJ1dHRvbiB0eXBlPVxcXCJidXR0b25cXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHRcXFwiIGRhdGEtYWN0aW9uPVxcXCJhZGRTcG90XFxcIj5BZGQgXFxcIjwlLSBxdWVyeSAlPlxcXCI8L2J1dHRvbj5cXG48L2Rpdj5cXG5cIjtcblxudmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxudmFyIE1vZGFsRm9ybSA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICBjbGFzc05hbWU6ICdtb2RhbCcsXG4gICAgX2RlZmF1bHRFdmVudHM6IHtcbiAgICAgICAgJ2hpZGUuYnMubW9kYWwnOiAnZGVzdHJveSdcbiAgICB9LFxuICAgIGNvbnN0cnVjdG9yOiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmV2ZW50cyA9IF8uZXh0ZW5kKHRoaXMuX2RlZmF1bHRFdmVudHMsIHRoaXMuZXZlbnRzKTtcbiAgICAgICAgTWFyaW9uZXR0ZS5JdGVtVmlldy5wcm90b3R5cGUuY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgLy8gZGVzZXJpYWxpemVNb2RlbDogZnVuY3Rpb24oKXtcbiAgICAvLyAgICAgXy5lYWNoKHRoaXMuZmllbGRzLCBmdW5jdGlvbihtb2RlbEZpZWxkLCBmaWVsZE5hbWUpe1xuICAgIC8vICAgICAgICAgdGhpcy5nZXRGaWVsZChuYW1lKS52YWwodGhpcy5tb2RlbC5nZXQobW9kZWxGaWVsZCkpO1xuICAgIC8vICAgICB9KTtcbiAgICAvLyB9LFxuICAgIC8vIGdldEZpZWxkOiBmdW5jdGlvbihuYW1lKXtcbiAgICAvLyAgICAgcmV0dXJuIHRoaXMuJCgnW25hbWU9XCInICsgbmFtZSArICdcIicpO1xuICAgIC8vIH1cbn0pO1xuXG52YXIgTW92ZUZvcm1WaWV3ID0gTW9kYWxGb3JtLmV4dGVuZCh7XG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTW92ZUZvcm1UcGwpLFxuICAgIHVpOiB7XG4gICAgICAgICdmb3JtJzogJ2Zvcm0nLFxuICAgICAgICAnc3BvdCc6ICdbbmFtZT1cInNwb3RcIl0nLFxuICAgICAgICAnc3BvdElkJzogJ1tuYW1lPVwic3BvdF9pZFwiXScsXG4gICAgICAgICd0aW1lJzogJ1tuYW1lPVwidGltZVwiXScsXG4gICAgICAgICdzdWJtaXQnOiAnW3R5cGU9XCJzdWJtaXRcIl0nXG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgICAgJ3R5cGVhaGVhZDpzZWxlY3QgQHVpLnNwb3QnOiAnb25UeXBlYWhlYWRTZWxlY3QnLFxuICAgICAgICAnY2xpY2sgW2RhdGEtYWN0aW9uPVwiYWRkU3BvdFwiXSc6ICdhZGRTcG90JyxcbiAgICAgICAgJ3N1Ym1pdCBAdWkuZm9ybSc6ICdvbkZvcm1TdWJtaXQnLFxuICAgICAgICAnYmx1ciBAdWkuc3BvdCc6ICdvblNwb3RCbHVyJyxcbiAgICAgICAgJ2NoYW5nZSBAdWkuZm9ybSc6ICd0b2dnbGVTYXZlQnV0dG9uJyxcbiAgICAgICAgJ2lucHV0IGlucHV0W3R5cGU9XCJ0ZXh0XCJdJzogJ3RvZ2dsZVNhdmVCdXR0b24nXG4gICAgfSxcbiAgICBhZGRTcG90OiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3BvdCA9IG5ldyBTcG90KHtcbiAgICAgICAgICAgIG5hbWU6IHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNwb3Quc2F2ZSh7fSwge1xuICAgICAgICAgICAgc3VjY2VzczogXy5iaW5kKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLmFkZChzcG90KTtcbiAgICAgICAgICAgICAgICB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnLCBzcG90LmdldCgnbmFtZScpKS5ibHVyKCk7XG4gICAgICAgICAgICB9LCB0aGlzKVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGRlc2VyaWFsaXplTW9kZWw6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzcG90ID0gdGhpcy5tb2RlbC5nZXQoJ3Nwb3QnKTtcbiAgICAgICAgaWYgKHNwb3QpIHtcbiAgICAgICAgICAgIHZhciBzcG90TmFtZSA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS5nZXQoc3BvdCkuZ2V0KCduYW1lJyk7XG4gICAgICAgICAgICB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnLCBzcG90TmFtZSk7XG4gICAgICAgICAgICB0aGlzLnVpLnNwb3RJZC52YWwoc3BvdCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRpbWUgPSB0aGlzLm1vZGVsLmdldCgndGltZScpO1xuXG4gICAgICAgIGlmICh0aW1lKSB7XG4gICAgICAgICAgICB0aGlzLnVpLnRpbWUudmFsKCBtb21lbnQodGltZSkuZm9ybWF0KCdoOm1tJykgKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgc2VyaWFsaXplRm9ybTogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGRhdGEgPSB7fTtcbiAgICAgICAgdmFyIHNwb3RJZCA9IHRoaXMudWkuc3BvdElkLnZhbCgpO1xuICAgICAgICBpZiAoc3BvdElkKSB7XG4gICAgICAgICAgICBkYXRhLnNwb3QgPSBzcG90SWQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRpbWUgPSB0aGlzLnBhcnNlVGltZSgpO1xuICAgICAgICBpZiAodGltZSkge1xuICAgICAgICAgICAgZGF0YS50aW1lID0gdGltZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuICAgIG9uU2hvdzogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5yZW5kZXJUeXBlYWhlYWQoKTtcbiAgICAgICAgdGhpcy5kZXNlcmlhbGl6ZU1vZGVsKCk7XG4gICAgICAgIHRoaXMudG9nZ2xlU2F2ZUJ1dHRvbigpO1xuICAgIH0sXG4gICAgcmVuZGVyVHlwZWFoZWFkOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3BvdHMgPSBuZXcgQmxvb2Rob3VuZCh7XG4gICAgICAgICAgICBkYXR1bVRva2VuaXplcjogQmxvb2Rob3VuZC50b2tlbml6ZXJzLm9iai53aGl0ZXNwYWNlKCduYW1lJyksXG4gICAgICAgICAgICBxdWVyeVRva2VuaXplcjogQmxvb2Rob3VuZC50b2tlbml6ZXJzLndoaXRlc3BhY2UsXG4gICAgICAgICAgICBsb2NhbDogY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLnRvSlNPTigpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMudWkuc3BvdC50eXBlYWhlYWQoe1xuICAgICAgICAgICAgaGludDogdHJ1ZSxcbiAgICAgICAgICAgIGhpZ2hsaWdodDogdHJ1ZSxcbiAgICAgICAgICAgIG1pbkxlbmd0aDogMVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBkaXNwbGF5OiAnbmFtZScsXG4gICAgICAgICAgICBuYW1lOiAnc3BvdHMnLFxuICAgICAgICAgICAgc291cmNlOiBzcG90cyxcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIGVtcHR5OiBfLnRlbXBsYXRlKEVtcHR5UXVlcnlUcGwpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgdG9nZ2xlU2F2ZUJ1dHRvbjogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGRhdGEgPSB0aGlzLnNlcmlhbGl6ZUZvcm0oKTtcbiAgICAgICAgdmFyIGlzQ29tcGxldGUgPSBfLmhhcyhkYXRhLCAndGltZScpICYmIF8uaGFzKGRhdGEsICdzcG90Jyk7XG4gICAgICAgIHRoaXMudWkuc3VibWl0LnRvZ2dsZUNsYXNzKCdkaXNhYmxlZCcsICFpc0NvbXBsZXRlKTtcbiAgICB9LFxuICAgIG9uRm9ybVN1Ym1pdDogZnVuY3Rpb24oZSl7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIGRhdGEgPSB0aGlzLnNlcmlhbGl6ZUZvcm0oKTtcbiAgICAgICAgaWYgKF8uaGFzKGRhdGEsICd0aW1lJykgJiYgXy5oYXMoZGF0YSwgJ3Nwb3QnKSl7XG4gICAgICAgICAgICB0aGlzLm1vZGVsLnNhdmUoZGF0YSwge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IF8uYmluZChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vZGVsLnRyaWdnZXIoJ3VwZGF0ZScpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRlbC5tb2RhbCgnaGlkZScpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbW92ZXMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmVzJyk7XG4gICAgICAgICAgICAgICAgICAgIG1vdmVzLmFkZCh0aGlzLm1vZGVsLCB7bWVyZ2U6IHRydWV9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb2RlbC50cmlnZ2VyKCd1cGRhdGUnKTtcbiAgICAgICAgICAgICAgICB9LCB0aGlzKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHBhcnNlVGltZTogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHN0cmluZyA9IHRoaXMudWkudGltZS52YWwoKTtcblxuICAgICAgICB2YXIgd29yZE1hcCA9IHtcbiAgICAgICAgICAgICdyaWdodG5vdyc6IDEsXG4gICAgICAgICAgICAnaW1tZWRpYXRlbHknOiAxLFxuICAgICAgICAgICAgJ25vdyc6IDEsXG4gICAgICAgICAgICAnc29vbmlzaCc6IDE1LFxuICAgICAgICAgICAgJ3Nvb24nOiAxNSxcbiAgICAgICAgICAgICdsYXRlcic6IDYwXG4gICAgICAgIH07XG5cbiAgICAgICAgdmFyIHN0cmluZ1ZhbCA9IHdvcmRNYXBbc3RyaW5nLnJlcGxhY2UoL1xcVysvZywgJycpLnRvTG93ZXJDYXNlKCldO1xuXG4gICAgICAgIGlmIChzdHJpbmdWYWwgKSB7XG4gICAgICAgICAgICByZXR1cm4gbW9tZW50KCkuYWRkKHN0cmluZ1ZhbCwgJ20nKS5mb3JtYXQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc3RyaW5nIHx8ICFzdHJpbmcubWF0Y2goL1xcZHsxLDJ9OlxcZHsyfS8pKXsgcmV0dXJuICcnOyB9XG5cbiAgICAgICAgdmFyIHNwbGl0ID0gc3RyaW5nLnNwbGl0KCc6JykubWFwKGZ1bmN0aW9uKG51bSl7cmV0dXJuICtudW07IH0pO1xuICAgICAgICBpZiAoc3BsaXRbMF0gPCA2KSB7XG4gICAgICAgICAgICBzcGxpdFswXSArPSAxMjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtb21lbnQoc3BsaXQuam9pbignOicpLCAnaGg6bW0nKS5mb3JtYXQoKTtcbiAgICB9LFxuICAgIG9uU3BvdEJsdXI6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzcG90cyA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKTtcbiAgICAgICAgdmFyIHNwb3RJZCA9IHRoaXMudWkuc3BvdElkLnZhbCgpO1xuXG4gICAgICAgIGlmICghc3BvdElkKSB7XG4gICAgICAgICAgICB2YXIgc3BvdFZhbCA9IHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcpO1xuICAgICAgICAgICAgdmFyIHNlbGVjdGVkU3BvdCA9IHNwb3RzLmZpbmQoZnVuY3Rpb24oc3BvdCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNwb3QuZ2V0KCduYW1lJykudG9Mb3dlckNhc2UoKSA9PSBzcG90VmFsLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHNlbGVjdGVkU3BvdCkge1xuICAgICAgICAgICAgICAgIHRoaXMudWkuc3BvdElkLnZhbChzZWxlY3RlZFNwb3QuaWQpLmNoYW5nZSgpO1xuICAgICAgICAgICAgICAgIHNwb3RJZCA9IHNlbGVjdGVkU3BvdC5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcsIHNwb3RJZCA/IHNwb3RzLmdldCgrc3BvdElkKS5nZXQoJ25hbWUnKSA6ICcnKTtcbiAgICB9LFxuICAgIG9uVHlwZWFoZWFkU2VsZWN0OiBmdW5jdGlvbihlLCBvYmope1xuICAgICAgICB0aGlzLnVpLnNwb3RJZC52YWwob2JqLmlkKS5jaGFuZ2UoKTtcbiAgICB9LFxuICAgIHRlbXBsYXRlSGVscGVyczogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNwb3RzOiBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykudG9KU09OKClcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG52YXIgTmFtZVZpZXcgPSBNb2RhbEZvcm0uZXh0ZW5kKHtcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShOYW1lRm9ybVRwbCksXG4gICAgdWk6IHtcbiAgICAgICAgJ2Zvcm0nOiAnZm9ybScsXG4gICAgICAgICd1c2VyJzogJ1tuYW1lPVwidXNlclwiXScsXG4gICAgICAgICdzdWJtaXQnOiAnW3R5cGU9XCJzdWJtaXRcIl0nXG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgICAgJ3N1Ym1pdCBAdWkuZm9ybSc6ICdvbkZvcm1TdWJtaXQnLFxuICAgICAgICAnY2hhbmdlIEB1aS5mb3JtJzogJ3RvZ2dsZVNhdmVCdXR0b24nLFxuICAgICAgICAnaW5wdXQgaW5wdXRbdHlwZT1cInRleHRcIl0nOiAndG9nZ2xlU2F2ZUJ1dHRvbidcbiAgICB9LFxuICAgIG9uU2hvdzogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy50b2dnbGVTYXZlQnV0dG9uKCk7XG4gICAgfSxcbiAgICB0b2dnbGVTYXZlQnV0dG9uOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgZGF0YSA9IHRoaXMuc2VyaWFsaXplRm9ybSgpO1xuICAgICAgICB2YXIgaXNDb21wbGV0ZSA9IF8uaGFzKGRhdGEsICd1c2VyJyk7XG4gICAgICAgIHRoaXMudWkuc3VibWl0LnRvZ2dsZUNsYXNzKCdkaXNhYmxlZCcsICFpc0NvbXBsZXRlKTtcbiAgICB9LFxuICAgIHNlcmlhbGl6ZUZvcm06IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciB1c2VyID0gdGhpcy51aS51c2VyLnZhbCgpO1xuICAgICAgICByZXR1cm4gKHVzZXIpID8ge3VzZXI6IHVzZXJ9IDogdXNlcjtcbiAgICB9LFxuICAgIG9uRm9ybVN1Ym1pdDogZnVuY3Rpb24oZSl7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdmFyIGRhdGEgPSB0aGlzLnNlcmlhbGl6ZUZvcm0oKTtcbiAgICAgICAgaWYgKCFfLmlzRW1wdHkoZGF0YSkpe1xuICAgICAgICAgICAgdGhpcy5tb2RlbC5zZXQoZGF0YSk7XG4gICAgICAgICAgICB0aGlzLiRlbC5tb2RhbCgnaGlkZScpO1xuICAgICAgICAgICAgc2V0VGltZW91dChfLmJpbmQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICB2YXIgdmlldyA9IG5ldyBNb3ZlRm9ybVZpZXcoe21vZGVsOiB0aGlzLm1vZGVsfSk7XG4gICAgICAgICAgICAgICAgY2hhbm5lbC5jb21tYW5kKCdzaG93Om1vZGFsJywgdmlldyk7XG4gICAgICAgICAgICB9LCB0aGlzKSwgMSk7XG4gICAgICAgIH1cbiAgICB9LFxufSk7XG5cbmNoYW5uZWwuY29tcGx5KCdzaG93OmZvcm0nLCBmdW5jdGlvbigpe1xuICAgIHZhciBvd25Nb3ZlID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlJyk7XG4gICAgdmFyIFZpZXdDbGFzcyA9IG93bk1vdmUuZ2V0KCd1c2VyJykgPyBNb3ZlRm9ybVZpZXcgOiBOYW1lVmlldztcbiAgICB2YXIgdmlldyA9IG5ldyBWaWV3Q2xhc3Moe21vZGVsOiBvd25Nb3ZlfSk7XG4gICAgY2hhbm5lbC5jb21tYW5kKCdzaG93Om1vZGFsJywgdmlldyk7XG59KTtcbiIsInJlcXVpcmUoJ2FwcC9mb3JtLXZpZXdzJyk7XG52YXIgTG9hZGluZ1ZpZXcgPSByZXF1aXJlKCdhcHAvdmlld3MnKS5Mb2FkaW5nVmlldztcbnZhciBMYXlvdXRWaWV3ID0gcmVxdWlyZSgnYXBwL3ZpZXdzJykuTGF5b3V0VmlldztcblxudmFyIE1vdmUgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5Nb3ZlO1xudmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxudmFyIHJlZ2lvbk1hbmFnZXIgPSBuZXcgTWFyaW9uZXR0ZS5SZWdpb25NYW5hZ2VyKHtcbiAgICByZWdpb25zOiB7XG4gICAgICAgIG1haW46ICcjYXBwJyxcbiAgICAgICAgbW9kYWw6ICcjbW9kYWwnXG4gICAgfVxufSk7XG5cbmNoYW5uZWwuY29tcGx5KCdzaG93Om1vZGFsJywgZnVuY3Rpb24odmlldyl7XG4gICAgcmVnaW9uTWFuYWdlci5nZXQoJ21vZGFsJykuc2hvdyh2aWV3KTtcbiAgICB2aWV3LiRlbC5tb2RhbCgpO1xufSk7XG5cbnZhciBSb3V0ZXIgPSBCYWNrYm9uZS5Sb3V0ZXIuZXh0ZW5kKHtcbiAgICByb3V0ZXM6IHtcbiAgICAgICAgXCJcIjogXCJzaG93TW92ZXNcIixcbiAgICB9LFxuXG4gICAgc2hvd01vdmVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmVnaW9uTWFuYWdlci5nZXQoJ21haW4nKS5zaG93KG5ldyBMb2FkaW5nVmlldygpKTtcbiAgICAgICAgdmFyIG1vdmUgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmUnKTtcbiAgICAgICAgdmFyIG1vdmVzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlcycpO1xuICAgICAgICB2YXIgc3BvdHMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJyk7XG5cbiAgICAgICAgJC53aGVuKG1vdmVzLmZldGNoKCksIHNwb3RzLmZldGNoKCkpLmRvbmUoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciBsYXlvdXRWaWV3ID0gbmV3IExheW91dFZpZXcoe1xuICAgICAgICAgICAgICAgIG1vZGVsOiBtb3ZlLFxuICAgICAgICAgICAgICAgIGNvbGxlY3Rpb246IG1vdmVzLmdyb3VwQnlTcG90KClcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZWdpb25NYW5hZ2VyLmdldCgnbWFpbicpLnNob3cobGF5b3V0Vmlldyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gUm91dGVyO1xuIiwiXG52YXIgTGF5b3V0VHBsID0gXCI8ZGl2IGRhdGEtcmVnaW9uPVxcXCJtb3Zlc1xcXCI+PC9kaXY+XFxuPGRpdiBkYXRhLXJlZ2lvbj1cXFwieW91ck1vdmVcXFwiPjwvZGl2PlxcblwiO1xudmFyIFlvdXJNb3ZlVHBsID0gXCI8ZGl2IGNsYXNzPVxcXCJjb250YWluZXIgeW91ci1tb3ZlXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicm93XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImNvbC1zbS0xMiB0ZXh0LWNlbnRlclxcXCI+XFxuICAgICAgICA8JSBpZiAoIXNwb3QpIHsgJT5cXG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XFxcImJ1dHRvblxcXCIgZGF0YS11aT1cXFwiZWRpdE1vdmVcXFwiIGNsYXNzPVxcXCJidG4gYnRuLWRlZmF1bHQgYnRuLWxnXFxcIj5XaGVyZSBhcmUgeW91IGdvaW5nPzwvYnV0dG9uPlxcbiAgICAgICAgPCUgfSAlPlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xudmFyIEVtcHR5VHBsID0gXCI8ZGl2IGNsYXNzPVxcXCJjb2wtbWQtMTIgdGV4dC1jZW50ZXJcXFwiPlxcbiAgICBObyBvbmUncyBnb2luZyBhbnl3aGVyZSwganVzdCBxdWl0ZSB5ZXQuXFxuPC9kaXY+XFxuXCI7XG52YXIgTHVuY2hNb3ZlVHBsID0gXCI8ZGl2IGNsYXNzPVxcXCJzcG90LW5hbWUgY29sLW1kLTEyXFxcIj5cXG4gICAgPHNwYW4+PCU9IHNwb3ROYW1lICU+PC9zcGFuPlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcInNwb3QtbW92ZXMgY29sLW1kLTEyXFxcIj5cXG4gICAgPCUgbW92ZXMuZWFjaChmdW5jdGlvbihtb3ZlKXsgJT5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcIm1vdmUgPCU9IGlzT3duTW92ZShtb3ZlKSA/ICdvd24tbW92ZScgOiAnJyAlPlxcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZS10aW1lXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4+PCU9IG1vdmUuZ2V0KCd0aW1lJykuZm9ybWF0KCdoOm1tJykgJT48L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZS1uYW1lXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4+XFxuICAgICAgICAgICAgICAgICAgICA8JSBpZiAoaXNPd25Nb3ZlKG1vdmUpKSB7ICU+XFxuICAgICAgICAgICAgICAgICAgICAgICAgWW91IDxzcGFuIGNsYXNzPVxcXCJnbHlwaGljb24gZ2x5cGhpY29uLXBlbmNpbFxcXCI+PC9zcGFuPlxcbiAgICAgICAgICAgICAgICAgICAgPCUgfSBlbHNlIHsgJT5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8JS0gbW92ZS5nZXQoJ3VzZXInKSAlPlxcbiAgICAgICAgICAgICAgICAgICAgPCUgfSAlPlxcbiAgICAgICAgICAgICAgICA8L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPCUgfSkgJT5cXG4gICAgPCUgaWYgKCFoYXNPd25Nb3ZlKSB7ICU+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlIG1vdmUtbmV3XFxcIiBkYXRhLXVpPVxcXCJhZGRNb3ZlXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJtb3ZlLWljb25cXFwiPlxcbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cXFwiZ2x5cGhpY29uIGdseXBoaWNvbi1wbHVzXFxcIj48L3NwYW4+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwibW92ZS1uYW1lXFxcIj5cXG4gICAgICAgICAgICAgICAgPHNwYW4+R28gSGVyZTwvc3Bhbj5cXG4gICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICA8JSB9ICU+XFxuPC9kaXY+XFxuXCI7XG52YXIgTHVuY2hNb3Zlc1RwbCA9IFwiPGRpdiBjbGFzcz1cXFwiY29udGFpbmVyIG1vdmVzLWNvbnRhaW5lclxcXCI+PC9kaXY+XFxuXCI7XG52YXIgTG9hZGluZ1RwbCA9IFwiPGRpdiBjbGFzcz1cXFwiY29udGFpbmVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwicm93IGxvYWRpbmctY29udGFpbmVyXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInNrLXNwaW5uZXIgc2stc3Bpbm5lci1yb3RhdGluZy1wbGFuZVxcXCI+PC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xudmFyIFNwb3QgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5TcG90O1xuXG52YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgTHVuY2hNb3ZlVmlldyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICBtb2RlbEV2ZW50czoge1xuICAgICAgICAnY2hhbmdlOm1vdmVzJzogJ3JlbmRlcidcbiAgICB9LFxuICAgIGVkaXQ6IGZ1bmN0aW9uKGUpe1xuICAgICAgICBCYWNrYm9uZS5oaXN0b3J5Lm5hdmlnYXRlKCcnLCB7dHJpZ2dlcjogdHJ1ZX0pO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgICAgJ2NsaWNrIEB1aS5hZGRNb3ZlJzogJ2FkZE1vdmUnLFxuICAgICAgICAnY2xpY2sgQHVpLmVkaXRNb3ZlJzogJ2FkZE1vdmUnXG4gICAgfSxcbiAgICB1aToge1xuICAgICAgICAnZWRpdE1vdmUnOiAnLm93bi1tb3ZlJyxcbiAgICAgICAgJ2FkZE1vdmUnOiAnW2RhdGEtdWk9XCJhZGRNb3ZlXCJdJ1xuICAgIH0sXG4gICAgYWRkTW92ZTogZnVuY3Rpb24oZSl7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlJykuc2V0KCdzcG90JywgdGhpcy5tb2RlbC5pZCk7XG4gICAgICAgIGNoYW5uZWwuY29tbWFuZCgnc2hvdzpmb3JtJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuICAgIGNsYXNzTmFtZTogJ3JvdyBtb3ZlLXJvdycsXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTHVuY2hNb3ZlVHBsKSxcbiAgICB0ZW1wbGF0ZUhlbHBlcnM6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBvd25Nb3ZlID0gIGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZScpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3BvdE5hbWU6IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS5nZXQodGhpcy5tb2RlbC5pZCkuZ2V0KCduYW1lJyksXG4gICAgICAgICAgICBpc093bk1vdmU6IGZ1bmN0aW9uKG1vdmUpe1xuICAgICAgICAgICAgICAgIHJldHVybiBvd25Nb3ZlLmlkID09PSBtb3ZlLmlkO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhhc093bk1vdmU6ICEhdGhpcy5tb2RlbC5nZXQoJ21vdmVzJykuZ2V0KG93bk1vdmUuaWQpXG4gICAgICAgIH1cbiAgICB9XG59KTtcblxudmFyIEVtcHR5VmlldyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICBjbGFzc05hbWU6ICdyb3cnLFxuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKEVtcHR5VHBsKVxufSk7XG5cbnZhciBMdW5jaE1vdmVzVmlldyA9IE1hcmlvbmV0dGUuQ29tcG9zaXRlVmlldy5leHRlbmQoe1xuICAgIGNsYXNzTmFtZTogJ2x1bmNoLW1vdmVzLWxpc3QnLFxuICAgIG1vZGVsRXZlbnRzOiB7XG4gICAgICAgICd1cGRhdGUnOiAncmVjYWxjdWxhdGVNb3ZlcydcbiAgICB9LFxuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKEx1bmNoTW92ZXNUcGwpLFxuICAgIGNoaWxkVmlldzogTHVuY2hNb3ZlVmlldyxcbiAgICBlbXB0eVZpZXc6IEVtcHR5VmlldyxcbiAgICBjaGlsZFZpZXdDb250YWluZXI6ICcubW92ZXMtY29udGFpbmVyJyxcbiAgICByZWNhbGN1bGF0ZU1vdmVzOiBmdW5jdGlvbigpe1xuICAgICAgICB0aGlzLmNvbGxlY3Rpb24gPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmVzJykuZ3JvdXBCeVNwb3QoKTtcbiAgICAgICAgdGhpcy5yZW5kZXIoKTtcbiAgICB9XG59KTtcblxuXG52YXIgWW91ck1vdmVWaWV3ID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuICAgIG1vZGVsRXZlbnRzOiB7XG4gICAgICAgICdjaGFuZ2U6c3BvdCc6ICdkZXN0cm95J1xuICAgIH0sXG4gICAgdWk6IHtcbiAgICAgICAgJ2VkaXRNb3ZlJzogJ1tkYXRhLXVpPVwiZWRpdE1vdmVcIl0nXG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgICAgJ2NsaWNrIEB1aS5lZGl0TW92ZSc6ICdlZGl0TW92ZSdcbiAgICB9LFxuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKFlvdXJNb3ZlVHBsKSxcbiAgICBlZGl0TW92ZTogZnVuY3Rpb24oZSl7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY2hhbm5lbC5jb21tYW5kKCdzaG93OmZvcm0nKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgdGVtcGxhdGVIZWxwZXJzOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3BvdHMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNwb3ROYW1lOiB0aGlzLm1vZGVsLmhhcygnc3BvdCcpID8gc3BvdHMuZ2V0KHRoaXMubW9kZWwuZ2V0KCdzcG90JykpLmdldCgnbmFtZScpIDogJydcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5cbnZhciBMYXlvdXRWaWV3ID0gTWFyaW9uZXR0ZS5MYXlvdXRWaWV3LmV4dGVuZCh7XG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTGF5b3V0VHBsKSxcbiAgICByZWdpb25zOiB7XG4gICAgICAgICd5b3VyTW92ZSc6ICdbZGF0YS1yZWdpb249XCJ5b3VyTW92ZVwiXScsXG4gICAgICAgICdtb3Zlcyc6ICdbZGF0YS1yZWdpb249XCJtb3Zlc1wiXSdcbiAgICB9LFxuICAgIG9uU2hvdzogZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKCF0aGlzLm1vZGVsLmdldCgnc3BvdCcpKSB7XG4gICAgICAgICAgICB0aGlzLnNob3dDaGlsZFZpZXcoJ3lvdXJNb3ZlJywgbmV3IFlvdXJNb3ZlVmlldyh7XG4gICAgICAgICAgICAgICAgbW9kZWw6IHRoaXMubW9kZWxcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc2hvd0NoaWxkVmlldygnbW92ZXMnLCBuZXcgTHVuY2hNb3Zlc1ZpZXcoe1xuICAgICAgICAgICAgbW9kZWw6IHRoaXMubW9kZWwsXG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLmNvbGxlY3Rpb25cbiAgICAgICAgfSkpO1xuICAgIH1cbn0pO1xuXG5cbnZhciBMb2FkaW5nVmlldyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShMb2FkaW5nVHBsKVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIExvYWRpbmdWaWV3OiBMb2FkaW5nVmlldyxcbiAgICBMYXlvdXRWaWV3OiBMYXlvdXRWaWV3XG59XG4iXX0=
