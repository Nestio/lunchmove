(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Router = require('app/router');
var Spots = require('app/entities').Spots;
var Moves = require('app/entities').Moves;
var Move = require('app/entities').Move;
var channel = Backbone.Radio.channel('global');

var spots = new Spots();
var moves = new Moves();
var move = new Move();

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

},{"app/entities":2,"app/router":3}],2:[function(require,module,exports){
var Move = Backbone.Model.extend({
    urlRoot: '/json/moves/',
    fetchRecent: function(options){
        options = options || {};
        _.extend(options, {url: '/json/moves/recent/'})
        return this.fetch(options);
    }
});

var Moves = Backbone.Collection.extend({
    url: '/json/moves/',
    parse: function(response){
        return response.results;
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

},{}],3:[function(require,module,exports){
var LunchMovesView = require('app/views').LunchMovesView;
var MoveFormView = require('app/views').MoveFormView;
var HeaderView = require('app/views').HeaderView;

var Move = require('app/entities').Move;
var channel = Backbone.Radio.channel('global');

var regionManager = new Marionette.RegionManager({
    regions: {
        main: '#app',
    }
});

var headerView = new HeaderView({
    $el: $('#header')
});

var Router = Backbone.Router.extend({
    routes: {
        "": "makeMove",
        "moves": "showMoves",
    },

    makeMove: function() {
        var move = channel.request('entities:move');
        var spots = channel.request('entities:spots');

        $.when(spots.fetch(), move.fetchRecent()).done(function(){
            var formView = new MoveFormView({
                model: move
            });

            regionManager.get('main').show(formView);
        });
    },

    showMoves: function() {
        var move = channel.request('entities:move');
        var moves = channel.request('entities:moves');
        var spots = channel.request('entities:spots');

        $.when(moves.fetch(), spots.fetch(), move.fetchRecent()).done(function(){
            var listView = new LunchMovesView({
                model: move,
                collection: moves
            });
            regionManager.get('main').show(listView);
        });
    }

});

module.exports = Router;

},{"app/entities":2,"app/views":4}],4:[function(require,module,exports){

var EmptyTpl = "Not one's going anywhere, just quite yet.\n";
var LunchMoveTpl = "<strong><%= isOwnMove ? 'You' : user %></strong> <%= isOwnMove ? 'are' : 'is' %> going to <strong><%= spotName %></strong>\n<% if (isOwnMove) { %>\n    <a href='../'>edit</a>\n<% } %>\n<em class=\"pull-right\"><%= moment(updated_at).format('h:mm:ss a') %></em>\n";
var LunchMovesTpl = "<div class=\"container\">\n    <div class=\"row\">\n        <div class=\"col-md-6 col-md-offset-3\">\n            <h1 class=\"text-center\">Lunch Moves!</h1>\n            <ul class=\"list-group\"></ul>\n        </div>\n    </div>\n</div>\n"
var MoveFormTpl = "<div class=\"jumbotron lunch-move-form\">\n    <div class=\"container\">\n        <div class=\"row\">\n            <div class=\"col-md-12 text-center\">\n                <h1 class=\"question\">What's your lunch move?</h1>\n                <form>\n                    <div class=\"form-inline\">\n                        <div class=\"form-group\">\n                            <input type=\"text\" class=\"form-control name-field\" name=\"user\" placeholder=\"you\">\n                        </div>\n                        <div class=\"form-group\">\n                            <p class=\"form-control-static\">is going to</p>\n                        </div>\n                        <div class=\"form-group\">\n                            <input class=\"form-control spot-field\" type=\"text\" name=\"spot\" placeholder=\"place\">\n                            <input type=\"hidden\" name=\"spot_id\">\n                        </div>\n                    </div>\n                </form>\n            </div>\n        </div>\n    </div>\n</div>\n";
var EmptyQueryTpl = "<div class=\"tt-empty\">\n    <button type=\"button\" class=\"btn btn-default\" data-action=\"addSpot\">Add \"<%= query %>\"</button>\n</div>\n";
var Spot = require('app/entities').Spot;

var channel = Backbone.Radio.channel('global');

var LunchMoveView = Marionette.ItemView.extend({
    tagName: 'li',
    className: 'list-group-item',
    edit: function(e){
        Backbone.history.navigate('', {trigger: true});
        e.preventDefault();
    },
    events: {
        'click a': 'edit'
    },
    template: _.template(LunchMoveTpl),
    templateHelpers: function(){
        return {
            spotName: channel.request('entities:spots').get(this.model.get('spot')).get('name'),
            isOwnMove: this.getOption('ownMove').id === this.model.id
        }
    }
});

var EmptyView = Marionette.ItemView.extend({
    tagName: 'li',
    className: 'list-group-item',
    template: _.template(EmptyTpl)
});

var LunchMovesView = Marionette.CompositeView.extend({
    emptyView: EmptyView,
    childView: LunchMoveView,
    childViewContainer: 'ul',
    template: _.template(LunchMovesTpl),
    childViewOptions: function(){
        return {
            ownMove: this.model
        };
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
    template: false
})

module.exports = {
    LunchMovesView: LunchMovesView,
    MoveFormView: MoveFormView,
    HeaderView: HeaderView
}

},{"app/entities":2}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvYXBwLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9lbnRpdGllcy5qcyIsIm5vZGVfbW9kdWxlcy9hcHAvcm91dGVyLmpzIiwibm9kZV9tb2R1bGVzL2FwcC92aWV3cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgUm91dGVyID0gcmVxdWlyZSgnYXBwL3JvdXRlcicpO1xudmFyIFNwb3RzID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuU3BvdHM7XG52YXIgTW92ZXMgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5Nb3ZlcztcbnZhciBNb3ZlID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuTW92ZTtcbnZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciBzcG90cyA9IG5ldyBTcG90cygpO1xudmFyIG1vdmVzID0gbmV3IE1vdmVzKCk7XG52YXIgbW92ZSA9IG5ldyBNb3ZlKCk7XG5cbmNoYW5uZWwucmVwbHkoJ2VudGl0aWVzOnNwb3RzJywgZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gc3BvdHM7XG59KTtcblxuY2hhbm5lbC5yZXBseSgnZW50aXRpZXM6bW92ZXMnLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBtb3Zlcztcbn0pO1xuXG5jaGFubmVsLnJlcGx5KCdlbnRpdGllczptb3ZlJywgZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gbW92ZTtcbn0pO1xuXG5uZXcgUm91dGVyKCk7XG5cbkJhY2tib25lLmhpc3Rvcnkuc3RhcnQoe3B1c2hTdGF0ZTogdHJ1ZX0pO1xuIiwidmFyIE1vdmUgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgIHVybFJvb3Q6ICcvanNvbi9tb3Zlcy8nLFxuICAgIGZldGNoUmVjZW50OiBmdW5jdGlvbihvcHRpb25zKXtcbiAgICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIF8uZXh0ZW5kKG9wdGlvbnMsIHt1cmw6ICcvanNvbi9tb3Zlcy9yZWNlbnQvJ30pXG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoKG9wdGlvbnMpO1xuICAgIH1cbn0pO1xuXG52YXIgTW92ZXMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgdXJsOiAnL2pzb24vbW92ZXMvJyxcbiAgICBwYXJzZTogZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVzdWx0cztcbiAgICB9XG59KTtcblxudmFyIFNwb3QgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgIHVybFJvb3Q6ICcvanNvbi9zcG90cy8nXG59KTtcblxudmFyIFNwb3RzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIHVybDogJy9qc29uL3Nwb3RzLycsXG4gICAgcGFyc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJlc3VsdHM7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFNwb3RzOiBTcG90cyxcbiAgICBNb3ZlczogTW92ZXMsXG4gICAgTW92ZTogTW92ZSxcbiAgICBTcG90OiBTcG90XG59XG4iLCJ2YXIgTHVuY2hNb3Zlc1ZpZXcgPSByZXF1aXJlKCdhcHAvdmlld3MnKS5MdW5jaE1vdmVzVmlldztcbnZhciBNb3ZlRm9ybVZpZXcgPSByZXF1aXJlKCdhcHAvdmlld3MnKS5Nb3ZlRm9ybVZpZXc7XG52YXIgSGVhZGVyVmlldyA9IHJlcXVpcmUoJ2FwcC92aWV3cycpLkhlYWRlclZpZXc7XG5cbnZhciBNb3ZlID0gcmVxdWlyZSgnYXBwL2VudGl0aWVzJykuTW92ZTtcbnZhciBjaGFubmVsID0gQmFja2JvbmUuUmFkaW8uY2hhbm5lbCgnZ2xvYmFsJyk7XG5cbnZhciByZWdpb25NYW5hZ2VyID0gbmV3IE1hcmlvbmV0dGUuUmVnaW9uTWFuYWdlcih7XG4gICAgcmVnaW9uczoge1xuICAgICAgICBtYWluOiAnI2FwcCcsXG4gICAgfVxufSk7XG5cbnZhciBoZWFkZXJWaWV3ID0gbmV3IEhlYWRlclZpZXcoe1xuICAgICRlbDogJCgnI2hlYWRlcicpXG59KTtcblxudmFyIFJvdXRlciA9IEJhY2tib25lLlJvdXRlci5leHRlbmQoe1xuICAgIHJvdXRlczoge1xuICAgICAgICBcIlwiOiBcIm1ha2VNb3ZlXCIsXG4gICAgICAgIFwibW92ZXNcIjogXCJzaG93TW92ZXNcIixcbiAgICB9LFxuXG4gICAgbWFrZU1vdmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbW92ZSA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6bW92ZScpO1xuICAgICAgICB2YXIgc3BvdHMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJyk7XG5cbiAgICAgICAgJC53aGVuKHNwb3RzLmZldGNoKCksIG1vdmUuZmV0Y2hSZWNlbnQoKSkuZG9uZShmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIGZvcm1WaWV3ID0gbmV3IE1vdmVGb3JtVmlldyh7XG4gICAgICAgICAgICAgICAgbW9kZWw6IG1vdmVcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZWdpb25NYW5hZ2VyLmdldCgnbWFpbicpLnNob3coZm9ybVZpZXcpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgc2hvd01vdmVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1vdmUgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOm1vdmUnKTtcbiAgICAgICAgdmFyIG1vdmVzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlcycpO1xuICAgICAgICB2YXIgc3BvdHMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJyk7XG5cbiAgICAgICAgJC53aGVuKG1vdmVzLmZldGNoKCksIHNwb3RzLmZldGNoKCksIG1vdmUuZmV0Y2hSZWNlbnQoKSkuZG9uZShmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIGxpc3RWaWV3ID0gbmV3IEx1bmNoTW92ZXNWaWV3KHtcbiAgICAgICAgICAgICAgICBtb2RlbDogbW92ZSxcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiBtb3Zlc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZWdpb25NYW5hZ2VyLmdldCgnbWFpbicpLnNob3cobGlzdFZpZXcpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJvdXRlcjtcbiIsIlxudmFyIEVtcHR5VHBsID0gXCJOb3Qgb25lJ3MgZ29pbmcgYW55d2hlcmUsIGp1c3QgcXVpdGUgeWV0LlxcblwiO1xudmFyIEx1bmNoTW92ZVRwbCA9IFwiPHN0cm9uZz48JT0gaXNPd25Nb3ZlID8gJ1lvdScgOiB1c2VyICU+PC9zdHJvbmc+IDwlPSBpc093bk1vdmUgPyAnYXJlJyA6ICdpcycgJT4gZ29pbmcgdG8gPHN0cm9uZz48JT0gc3BvdE5hbWUgJT48L3N0cm9uZz5cXG48JSBpZiAoaXNPd25Nb3ZlKSB7ICU+XFxuICAgIDxhIGhyZWY9Jy4uLyc+ZWRpdDwvYT5cXG48JSB9ICU+XFxuPGVtIGNsYXNzPVxcXCJwdWxsLXJpZ2h0XFxcIj48JT0gbW9tZW50KHVwZGF0ZWRfYXQpLmZvcm1hdCgnaDptbTpzcyBhJykgJT48L2VtPlxcblwiO1xudmFyIEx1bmNoTW92ZXNUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbnRhaW5lclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInJvd1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjb2wtbWQtNiBjb2wtbWQtb2Zmc2V0LTNcXFwiPlxcbiAgICAgICAgICAgIDxoMSBjbGFzcz1cXFwidGV4dC1jZW50ZXJcXFwiPkx1bmNoIE1vdmVzITwvaDE+XFxuICAgICAgICAgICAgPHVsIGNsYXNzPVxcXCJsaXN0LWdyb3VwXFxcIj48L3VsPlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblwiXG52YXIgTW92ZUZvcm1UcGwgPSBcIjxkaXYgY2xhc3M9XFxcImp1bWJvdHJvbiBsdW5jaC1tb3ZlLWZvcm1cXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjb250YWluZXJcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwicm93XFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjb2wtbWQtMTIgdGV4dC1jZW50ZXJcXFwiPlxcbiAgICAgICAgICAgICAgICA8aDEgY2xhc3M9XFxcInF1ZXN0aW9uXFxcIj5XaGF0J3MgeW91ciBsdW5jaCBtb3ZlPzwvaDE+XFxuICAgICAgICAgICAgICAgIDxmb3JtPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1pbmxpbmVcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbCBuYW1lLWZpZWxkXFxcIiBuYW1lPVxcXCJ1c2VyXFxcIiBwbGFjZWhvbGRlcj1cXFwieW91XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3M9XFxcImZvcm0tY29udHJvbC1zdGF0aWNcXFwiPmlzIGdvaW5nIHRvPC9wPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XFxcImZvcm0tY29udHJvbCBzcG90LWZpZWxkXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJzcG90XFxcIiBwbGFjZWhvbGRlcj1cXFwicGxhY2VcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiaGlkZGVuXFxcIiBuYW1lPVxcXCJzcG90X2lkXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8L2Zvcm0+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG52YXIgRW1wdHlRdWVyeVRwbCA9IFwiPGRpdiBjbGFzcz1cXFwidHQtZW1wdHlcXFwiPlxcbiAgICA8YnV0dG9uIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCIgZGF0YS1hY3Rpb249XFxcImFkZFNwb3RcXFwiPkFkZCBcXFwiPCU9IHF1ZXJ5ICU+XFxcIjwvYnV0dG9uPlxcbjwvZGl2PlxcblwiO1xudmFyIFNwb3QgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5TcG90O1xuXG52YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgTHVuY2hNb3ZlVmlldyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICB0YWdOYW1lOiAnbGknLFxuICAgIGNsYXNzTmFtZTogJ2xpc3QtZ3JvdXAtaXRlbScsXG4gICAgZWRpdDogZnVuY3Rpb24oZSl7XG4gICAgICAgIEJhY2tib25lLmhpc3RvcnkubmF2aWdhdGUoJycsIHt0cmlnZ2VyOiB0cnVlfSk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgICAnY2xpY2sgYSc6ICdlZGl0J1xuICAgIH0sXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTHVuY2hNb3ZlVHBsKSxcbiAgICB0ZW1wbGF0ZUhlbHBlcnM6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzcG90TmFtZTogY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLmdldCh0aGlzLm1vZGVsLmdldCgnc3BvdCcpKS5nZXQoJ25hbWUnKSxcbiAgICAgICAgICAgIGlzT3duTW92ZTogdGhpcy5nZXRPcHRpb24oJ293bk1vdmUnKS5pZCA9PT0gdGhpcy5tb2RlbC5pZFxuICAgICAgICB9XG4gICAgfVxufSk7XG5cbnZhciBFbXB0eVZpZXcgPSBNYXJpb25ldHRlLkl0ZW1WaWV3LmV4dGVuZCh7XG4gICAgdGFnTmFtZTogJ2xpJyxcbiAgICBjbGFzc05hbWU6ICdsaXN0LWdyb3VwLWl0ZW0nLFxuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKEVtcHR5VHBsKVxufSk7XG5cbnZhciBMdW5jaE1vdmVzVmlldyA9IE1hcmlvbmV0dGUuQ29tcG9zaXRlVmlldy5leHRlbmQoe1xuICAgIGVtcHR5VmlldzogRW1wdHlWaWV3LFxuICAgIGNoaWxkVmlldzogTHVuY2hNb3ZlVmlldyxcbiAgICBjaGlsZFZpZXdDb250YWluZXI6ICd1bCcsXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTHVuY2hNb3Zlc1RwbCksXG4gICAgY2hpbGRWaWV3T3B0aW9uczogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG93bk1vdmU6IHRoaXMubW9kZWxcbiAgICAgICAgfTtcbiAgICB9XG59KTtcblxudmFyIE1vdmVGb3JtVmlldyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShNb3ZlRm9ybVRwbCksXG4gICAgdWk6IHtcbiAgICAgICAgJ2Zvcm0nOiAnZm9ybScsXG4gICAgICAgICdzcG90JzogJ1tuYW1lPVwic3BvdFwiXScsXG4gICAgICAgICdzcG90SWQnOiAnW25hbWU9XCJzcG90X2lkXCJdJyxcbiAgICAgICAgJ3VzZXInOiAnW25hbWU9XCJ1c2VyXCJdJ1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICAgICd0eXBlYWhlYWQ6c2VsZWN0IEB1aS5zcG90JzogJ29uVHlwZWFoZWFkU2VsZWN0JyxcbiAgICAgICAgJ2NsaWNrIFtkYXRhLWFjdGlvbj1cImFkZFNwb3RcIl0nOiAnYWRkU3BvdCcsXG4gICAgICAgICdjaGFuZ2UgQHVpLmZvcm0nOiAnb25Gb3JtQ2hhbmdlJyxcbiAgICAgICAgJ2JsdXIgQHVpLnNwb3QnOiAnb25TcG90Qmx1cicsXG4gICAgICAgICdrZXlkb3duIGlucHV0JzogZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAkKGUuY3VycmVudFRhcmdldCkuYmx1cigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBhZGRTcG90OiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3BvdCA9IG5ldyBTcG90KHtcbiAgICAgICAgICAgIG5hbWU6IHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNwb3Quc2F2ZSh7fSwge1xuICAgICAgICAgICAgc3VjY2VzczogXy5iaW5kKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLmFkZChzcG90KTtcbiAgICAgICAgICAgICAgICB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnLCBzcG90LmdldCgnbmFtZScpKS5ibHVyKCk7XG4gICAgICAgICAgICB9LCB0aGlzKVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGRlc2VyaWFsaXplTW9kZWw6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciB1c2VyID0gdGhpcy5tb2RlbC5nZXQoJ3VzZXInKTtcbiAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMudWkudXNlci52YWwodXNlcik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHNwb3QgPSB0aGlzLm1vZGVsLmdldCgnc3BvdCcpXG4gICAgICAgIGlmIChzcG90KSB7XG4gICAgICAgICAgICB2YXIgc3BvdE5hbWUgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykuZ2V0KHNwb3QpLmdldCgnbmFtZScpO1xuICAgICAgICAgICAgdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJywgc3BvdE5hbWUpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBvblNob3c6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMucmVuZGVyVHlwZWFoZWFkKCk7XG4gICAgICAgIHRoaXMuZGVzZXJpYWxpemVNb2RlbCgpO1xuICAgIH0sXG4gICAgcmVuZGVyVHlwZWFoZWFkOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3BvdHMgPSBuZXcgQmxvb2Rob3VuZCh7XG4gICAgICAgICAgICBkYXR1bVRva2VuaXplcjogQmxvb2Rob3VuZC50b2tlbml6ZXJzLm9iai53aGl0ZXNwYWNlKCduYW1lJyksXG4gICAgICAgICAgICBxdWVyeVRva2VuaXplcjogQmxvb2Rob3VuZC50b2tlbml6ZXJzLndoaXRlc3BhY2UsXG4gICAgICAgICAgICBsb2NhbDogY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLnRvSlNPTigpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMudWkuc3BvdC50eXBlYWhlYWQoe1xuICAgICAgICAgICAgaGludDogdHJ1ZSxcbiAgICAgICAgICAgIGhpZ2hsaWdodDogdHJ1ZSxcbiAgICAgICAgICAgIG1pbkxlbmd0aDogMVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgICBkaXNwbGF5OiAnbmFtZScsXG4gICAgICAgICAgICBuYW1lOiAnc3BvdHMnLFxuICAgICAgICAgICAgc291cmNlOiBzcG90cyxcbiAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgIGVtcHR5OiBfLnRlbXBsYXRlKEVtcHR5UXVlcnlUcGwpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgb25Gb3JtQ2hhbmdlOiBmdW5jdGlvbigpe1xuICAgICAgICBpZiAodGhpcy5fZGlzYWJsZVNhdmluZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHNwb3RJZCA9IHRoaXMudWkuc3BvdElkLnZhbCgpO1xuICAgICAgICB2YXIgdXNlciA9IHRoaXMudWkudXNlci52YWwoKTtcblxuICAgICAgICBpZiAoc3BvdElkICYmIHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMuX2Rpc2FibGVTYXZpbmcgPSB0cnVlO1xuXG4gICAgICAgICAgICB0aGlzLm1vZGVsLnNhdmUoe1xuICAgICAgICAgICAgICAgIHNwb3Q6IHNwb3RJZCxcbiAgICAgICAgICAgICAgICB1c2VyOiB1c2VyXG4gICAgICAgICAgICB9LCB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgQmFja2JvbmUuaGlzdG9yeS5uYXZpZ2F0ZSgnL21vdmVzJywge3RyaWdnZXI6IHRydWV9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgb25TcG90Qmx1cjogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNwb3RzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpO1xuICAgICAgICB2YXIgc3BvdElkID0gdGhpcy51aS5zcG90SWQudmFsKCk7XG5cbiAgICAgICAgaWYgKCFzcG90SWQpIHtcbiAgICAgICAgICAgIHZhciBzcG90VmFsID0gdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJyk7XG4gICAgICAgICAgICB2YXIgc2VsZWN0ZWRTcG90ID0gc3BvdHMuZmluZChmdW5jdGlvbihzcG90KXtcbiAgICAgICAgICAgICAgICByZXR1cm4gc3BvdC5nZXQoJ25hbWUnKS50b0xvd2VyQ2FzZSgpID09IHNwb3RWYWwudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoc2VsZWN0ZWRTcG90KSB7XG4gICAgICAgICAgICAgICAgdGhpcy51aS5zcG90SWQudmFsKHNlbGVjdGVkU3BvdC5pZCkuY2hhbmdlKCk7XG4gICAgICAgICAgICAgICAgc3BvdElkID0gc2VsZWN0ZWRTcG90LmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy51aS5zcG90LnR5cGVhaGVhZCgndmFsJywgc3BvdElkID8gc3BvdHMuZ2V0KCtzcG90SWQpLmdldCgnbmFtZScpIDogJycpO1xuICAgIH0sXG4gICAgb25UeXBlYWhlYWRTZWxlY3Q6IGZ1bmN0aW9uKGUsIG9iail7XG4gICAgICAgIHRoaXMudWkuc3BvdElkLnZhbChvYmouaWQpLmNoYW5nZSgpO1xuICAgIH0sXG4gICAgdGVtcGxhdGVIZWxwZXJzOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3BvdHM6IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS50b0pTT04oKVxuICAgICAgICB9XG4gICAgfVxufSk7XG5cbnZhciBIZWFkZXJWaWV3ID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuICAgIHRlbXBsYXRlOiBmYWxzZVxufSlcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgTHVuY2hNb3Zlc1ZpZXc6IEx1bmNoTW92ZXNWaWV3LFxuICAgIE1vdmVGb3JtVmlldzogTW92ZUZvcm1WaWV3LFxuICAgIEhlYWRlclZpZXc6IEhlYWRlclZpZXdcbn1cbiJdfQ==
