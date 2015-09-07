(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Router = require('app/router');
var Spots = require('app/entities').Spots;
var Moves = require('app/entities').Moves;
var channel = Backbone.Radio.channel('global');

var spots = new Spots();
var moves = new Moves();

channel.reply('entities:spots', function(){
    return spots;
});

channel.reply('entities:moves', function(){
    return moves;
});

new Router();

Backbone.history.start({pushState: true});

},{"app/entities":2,"app/router":3}],2:[function(require,module,exports){
var Move = Backbone.Model.extend({
    urlRoot: '/json/moves/'
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
var Move = require('app/entities').Move;
var channel = Backbone.Radio.channel('global');

var regionManager = new Marionette.RegionManager({
    regions: {
        main: '#app'
    }
});

var Router = Backbone.Router.extend({
    routes: {
        "": "makeMove",
        "moves": "showMoves",
    },

    makeMove: function() {
        var spots = channel.request('entities:spots');
        spots.fetch().done(function(){
            var move = new Move();

            var formView = new MoveFormView({
                model: move
            });

            regionManager.get('main').show(formView);
        });
    },

    showMoves: function() {
        var moves = channel.request('entities:moves');
        var spots = channel.request('entities:spots');

        $.when(moves.fetch(), spots.fetch()).done(function(){
            var listView = new LunchMovesView({collection: moves});
            regionManager.get('main').show(listView);
        });
    }

});

module.exports = Router;

},{"app/entities":2,"app/views":4}],4:[function(require,module,exports){

var EmptyTpl = "Not one's going anywhere, just quite yet.\n";
var LunchMoveTpl = "<strong><%= user %></strong> is going to <%= spotName() %><em class=\"pull-right\"><%= moment(updated_at).format('h:mm:ss a') %></em>\n";
var LunchMovesTpl = "<div class=\"container\">\n    <div class=\"row\">\n        <div class=\"col-md-6 col-md-offset-3\">\n            <h1 class=\"text-center\">Lunch Moves!</h1>\n            <ul class=\"list-group\"></ul>\n        </div>\n    </div>\n</div>\n"
var MoveFormTpl = "<div class=\"jumbotron lunch-move-form\">\n    <div class=\"container\">\n        <div class=\"row\">\n            <div class=\"col-md-12 text-center\">\n                <h1 class=\"question\">What's your lunch move?</h1>\n                <form>\n                    <div class=\"form-inline\">\n                        <div class=\"form-group\">\n                            <input type=\"text\" class=\"form-control name-field\" name=\"user\" placeholder=\"You\" autocomplete=\"false\">\n                        </div>\n                        <div class=\"form-group\">\n                            <p class=\"form-control-static\">is going to</p>\n                        </div>\n                        <div class=\"form-group\">\n                            <input class=\"form-control spot-field\" type=\"text\" name=\"spot\" placeholder=\"place\">\n                            <input type=\"hidden\" name=\"spot_id\">\n                        </div>\n                    </div>\n                </form>\n            </div>\n        </div>\n    </div>\n</div>\n";
var EmptyQueryTpl = "<div class=\"tt-empty\">\n    <button type=\"button\" class=\"btn btn-default\" data-action=\"addSpot\">Add \"<%= query %>\"</button>\n</div>\n";
var Spot = require('app/entities').Spot;

var channel = Backbone.Radio.channel('global');

var LunchMoveView = Marionette.ItemView.extend({
    tagName: 'li',
    className: 'list-group-item',
    template: _.template(LunchMoveTpl),
    templateHelpers: {
        spotName: function(){
            console.log(this.spot);
            return channel.request('entities:spots').get(this.spot).get('name');
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
    template: _.template(LunchMovesTpl)
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
    onShow: function(){
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

module.exports = {
    LunchMovesView: LunchMovesView,
    MoveFormView: MoveFormView
}

},{"app/entities":2}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvYXBwLmpzIiwibm9kZV9tb2R1bGVzL2FwcC9lbnRpdGllcy5qcyIsIm5vZGVfbW9kdWxlcy9hcHAvcm91dGVyLmpzIiwibm9kZV9tb2R1bGVzL2FwcC92aWV3cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBSb3V0ZXIgPSByZXF1aXJlKCdhcHAvcm91dGVyJyk7XG52YXIgU3BvdHMgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5TcG90cztcbnZhciBNb3ZlcyA9IHJlcXVpcmUoJ2FwcC9lbnRpdGllcycpLk1vdmVzO1xudmFyIGNoYW5uZWwgPSBCYWNrYm9uZS5SYWRpby5jaGFubmVsKCdnbG9iYWwnKTtcblxudmFyIHNwb3RzID0gbmV3IFNwb3RzKCk7XG52YXIgbW92ZXMgPSBuZXcgTW92ZXMoKTtcblxuY2hhbm5lbC5yZXBseSgnZW50aXRpZXM6c3BvdHMnLCBmdW5jdGlvbigpe1xuICAgIHJldHVybiBzcG90cztcbn0pO1xuXG5jaGFubmVsLnJlcGx5KCdlbnRpdGllczptb3ZlcycsIGZ1bmN0aW9uKCl7XG4gICAgcmV0dXJuIG1vdmVzO1xufSk7XG5cbm5ldyBSb3V0ZXIoKTtcblxuQmFja2JvbmUuaGlzdG9yeS5zdGFydCh7cHVzaFN0YXRlOiB0cnVlfSk7XG4iLCJ2YXIgTW92ZSA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgdXJsUm9vdDogJy9qc29uL21vdmVzLydcbn0pO1xuXG52YXIgTW92ZXMgPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgdXJsOiAnL2pzb24vbW92ZXMvJyxcbiAgICBwYXJzZTogZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UucmVzdWx0cztcbiAgICB9XG59KTtcblxudmFyIFNwb3QgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgIHVybFJvb3Q6ICcvanNvbi9zcG90cy8nXG59KTtcblxudmFyIFNwb3RzID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuICAgIHVybDogJy9qc29uL3Nwb3RzLycsXG4gICAgcGFyc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJlc3VsdHM7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIFNwb3RzOiBTcG90cyxcbiAgICBNb3ZlczogTW92ZXMsXG4gICAgTW92ZTogTW92ZSxcbiAgICBTcG90OiBTcG90XG59XG4iLCJ2YXIgTHVuY2hNb3Zlc1ZpZXcgPSByZXF1aXJlKCdhcHAvdmlld3MnKS5MdW5jaE1vdmVzVmlldztcbnZhciBNb3ZlRm9ybVZpZXcgPSByZXF1aXJlKCdhcHAvdmlld3MnKS5Nb3ZlRm9ybVZpZXc7XG52YXIgTW92ZSA9IHJlcXVpcmUoJ2FwcC9lbnRpdGllcycpLk1vdmU7XG52YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgcmVnaW9uTWFuYWdlciA9IG5ldyBNYXJpb25ldHRlLlJlZ2lvbk1hbmFnZXIoe1xuICAgIHJlZ2lvbnM6IHtcbiAgICAgICAgbWFpbjogJyNhcHAnXG4gICAgfVxufSk7XG5cbnZhciBSb3V0ZXIgPSBCYWNrYm9uZS5Sb3V0ZXIuZXh0ZW5kKHtcbiAgICByb3V0ZXM6IHtcbiAgICAgICAgXCJcIjogXCJtYWtlTW92ZVwiLFxuICAgICAgICBcIm1vdmVzXCI6IFwic2hvd01vdmVzXCIsXG4gICAgfSxcblxuICAgIG1ha2VNb3ZlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNwb3RzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpO1xuICAgICAgICBzcG90cy5mZXRjaCgpLmRvbmUoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciBtb3ZlID0gbmV3IE1vdmUoKTtcblxuICAgICAgICAgICAgdmFyIGZvcm1WaWV3ID0gbmV3IE1vdmVGb3JtVmlldyh7XG4gICAgICAgICAgICAgICAgbW9kZWw6IG1vdmVcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZWdpb25NYW5hZ2VyLmdldCgnbWFpbicpLnNob3coZm9ybVZpZXcpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgc2hvd01vdmVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1vdmVzID0gY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczptb3ZlcycpO1xuICAgICAgICB2YXIgc3BvdHMgPSBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJyk7XG5cbiAgICAgICAgJC53aGVuKG1vdmVzLmZldGNoKCksIHNwb3RzLmZldGNoKCkpLmRvbmUoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHZhciBsaXN0VmlldyA9IG5ldyBMdW5jaE1vdmVzVmlldyh7Y29sbGVjdGlvbjogbW92ZXN9KTtcbiAgICAgICAgICAgIHJlZ2lvbk1hbmFnZXIuZ2V0KCdtYWluJykuc2hvdyhsaXN0Vmlldyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gUm91dGVyO1xuIiwiXG52YXIgRW1wdHlUcGwgPSBcIk5vdCBvbmUncyBnb2luZyBhbnl3aGVyZSwganVzdCBxdWl0ZSB5ZXQuXFxuXCI7XG52YXIgTHVuY2hNb3ZlVHBsID0gXCI8c3Ryb25nPjwlPSB1c2VyICU+PC9zdHJvbmc+IGlzIGdvaW5nIHRvIDwlPSBzcG90TmFtZSgpICU+PGVtIGNsYXNzPVxcXCJwdWxsLXJpZ2h0XFxcIj48JT0gbW9tZW50KHVwZGF0ZWRfYXQpLmZvcm1hdCgnaDptbTpzcyBhJykgJT48L2VtPlxcblwiO1xudmFyIEx1bmNoTW92ZXNUcGwgPSBcIjxkaXYgY2xhc3M9XFxcImNvbnRhaW5lclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInJvd1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjb2wtbWQtNiBjb2wtbWQtb2Zmc2V0LTNcXFwiPlxcbiAgICAgICAgICAgIDxoMSBjbGFzcz1cXFwidGV4dC1jZW50ZXJcXFwiPkx1bmNoIE1vdmVzITwvaDE+XFxuICAgICAgICAgICAgPHVsIGNsYXNzPVxcXCJsaXN0LWdyb3VwXFxcIj48L3VsPlxcbiAgICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbjwvZGl2PlxcblwiXG52YXIgTW92ZUZvcm1UcGwgPSBcIjxkaXYgY2xhc3M9XFxcImp1bWJvdHJvbiBsdW5jaC1tb3ZlLWZvcm1cXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjb250YWluZXJcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwicm93XFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjb2wtbWQtMTIgdGV4dC1jZW50ZXJcXFwiPlxcbiAgICAgICAgICAgICAgICA8aDEgY2xhc3M9XFxcInF1ZXN0aW9uXFxcIj5XaGF0J3MgeW91ciBsdW5jaCBtb3ZlPzwvaDE+XFxuICAgICAgICAgICAgICAgIDxmb3JtPlxcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiZm9ybS1pbmxpbmVcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbCBuYW1lLWZpZWxkXFxcIiBuYW1lPVxcXCJ1c2VyXFxcIiBwbGFjZWhvbGRlcj1cXFwiWW91XFxcIiBhdXRvY29tcGxldGU9XFxcImZhbHNlXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJmb3JtLWdyb3VwXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3M9XFxcImZvcm0tY29udHJvbC1zdGF0aWNcXFwiPmlzIGdvaW5nIHRvPC9wPlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImZvcm0tZ3JvdXBcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9XFxcImZvcm0tY29udHJvbCBzcG90LWZpZWxkXFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiBuYW1lPVxcXCJzcG90XFxcIiBwbGFjZWhvbGRlcj1cXFwicGxhY2VcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiaGlkZGVuXFxcIiBuYW1lPVxcXCJzcG90X2lkXFxcIj5cXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICAgICAgICA8L2Zvcm0+XFxuICAgICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG52YXIgRW1wdHlRdWVyeVRwbCA9IFwiPGRpdiBjbGFzcz1cXFwidHQtZW1wdHlcXFwiPlxcbiAgICA8YnV0dG9uIHR5cGU9XFxcImJ1dHRvblxcXCIgY2xhc3M9XFxcImJ0biBidG4tZGVmYXVsdFxcXCIgZGF0YS1hY3Rpb249XFxcImFkZFNwb3RcXFwiPkFkZCBcXFwiPCU9IHF1ZXJ5ICU+XFxcIjwvYnV0dG9uPlxcbjwvZGl2PlxcblwiO1xudmFyIFNwb3QgPSByZXF1aXJlKCdhcHAvZW50aXRpZXMnKS5TcG90O1xuXG52YXIgY2hhbm5lbCA9IEJhY2tib25lLlJhZGlvLmNoYW5uZWwoJ2dsb2JhbCcpO1xuXG52YXIgTHVuY2hNb3ZlVmlldyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICB0YWdOYW1lOiAnbGknLFxuICAgIGNsYXNzTmFtZTogJ2xpc3QtZ3JvdXAtaXRlbScsXG4gICAgdGVtcGxhdGU6IF8udGVtcGxhdGUoTHVuY2hNb3ZlVHBsKSxcbiAgICB0ZW1wbGF0ZUhlbHBlcnM6IHtcbiAgICAgICAgc3BvdE5hbWU6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnNwb3QpO1xuICAgICAgICAgICAgcmV0dXJuIGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS5nZXQodGhpcy5zcG90KS5nZXQoJ25hbWUnKTtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG52YXIgRW1wdHlWaWV3ID0gTWFyaW9uZXR0ZS5JdGVtVmlldy5leHRlbmQoe1xuICAgIHRhZ05hbWU6ICdsaScsXG4gICAgY2xhc3NOYW1lOiAnbGlzdC1ncm91cC1pdGVtJyxcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShFbXB0eVRwbClcbn0pO1xuXG52YXIgTHVuY2hNb3Zlc1ZpZXcgPSBNYXJpb25ldHRlLkNvbXBvc2l0ZVZpZXcuZXh0ZW5kKHtcbiAgICBlbXB0eVZpZXc6IEVtcHR5VmlldyxcbiAgICBjaGlsZFZpZXc6IEx1bmNoTW92ZVZpZXcsXG4gICAgY2hpbGRWaWV3Q29udGFpbmVyOiAndWwnLFxuICAgIHRlbXBsYXRlOiBfLnRlbXBsYXRlKEx1bmNoTW92ZXNUcGwpXG59KTtcblxudmFyIE1vdmVGb3JtVmlldyA9IE1hcmlvbmV0dGUuSXRlbVZpZXcuZXh0ZW5kKHtcbiAgICB0ZW1wbGF0ZTogXy50ZW1wbGF0ZShNb3ZlRm9ybVRwbCksXG4gICAgdWk6IHtcbiAgICAgICAgJ2Zvcm0nOiAnZm9ybScsXG4gICAgICAgICdzcG90JzogJ1tuYW1lPVwic3BvdFwiXScsXG4gICAgICAgICdzcG90SWQnOiAnW25hbWU9XCJzcG90X2lkXCJdJyxcbiAgICAgICAgJ3VzZXInOiAnW25hbWU9XCJ1c2VyXCJdJ1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICAgICd0eXBlYWhlYWQ6c2VsZWN0IEB1aS5zcG90JzogJ29uVHlwZWFoZWFkU2VsZWN0JyxcbiAgICAgICAgJ2NsaWNrIFtkYXRhLWFjdGlvbj1cImFkZFNwb3RcIl0nOiAnYWRkU3BvdCcsXG4gICAgICAgICdjaGFuZ2UgQHVpLmZvcm0nOiAnb25Gb3JtQ2hhbmdlJyxcbiAgICAgICAgJ2JsdXIgQHVpLnNwb3QnOiAnb25TcG90Qmx1cicsXG4gICAgICAgICdrZXlkb3duIGlucHV0JzogZnVuY3Rpb24oZSl7XG4gICAgICAgICAgICBpZiAoZS5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAkKGUuY3VycmVudFRhcmdldCkuYmx1cigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBhZGRTcG90OiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgc3BvdCA9IG5ldyBTcG90KHtcbiAgICAgICAgICAgIG5hbWU6IHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcpXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNwb3Quc2F2ZSh7fSwge1xuICAgICAgICAgICAgc3VjY2VzczogXy5iaW5kKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgY2hhbm5lbC5yZXF1ZXN0KCdlbnRpdGllczpzcG90cycpLmFkZChzcG90KTtcbiAgICAgICAgICAgICAgICB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKCd2YWwnLCBzcG90LmdldCgnbmFtZScpKS5ibHVyKCk7XG4gICAgICAgICAgICB9LCB0aGlzKVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIG9uU2hvdzogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIHNwb3RzID0gbmV3IEJsb29kaG91bmQoe1xuICAgICAgICAgICAgZGF0dW1Ub2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy5vYmoud2hpdGVzcGFjZSgnbmFtZScpLFxuICAgICAgICAgICAgcXVlcnlUb2tlbml6ZXI6IEJsb29kaG91bmQudG9rZW5pemVycy53aGl0ZXNwYWNlLFxuICAgICAgICAgICAgbG9jYWw6IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKS50b0pTT04oKVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnVpLnNwb3QudHlwZWFoZWFkKHtcbiAgICAgICAgICAgIGhpbnQ6IHRydWUsXG4gICAgICAgICAgICBoaWdobGlnaHQ6IHRydWUsXG4gICAgICAgICAgICBtaW5MZW5ndGg6IDFcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgICAgZGlzcGxheTogJ25hbWUnLFxuICAgICAgICAgICAgbmFtZTogJ3Nwb3RzJyxcbiAgICAgICAgICAgIHNvdXJjZTogc3BvdHMsXG4gICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICBlbXB0eTogXy50ZW1wbGF0ZShFbXB0eVF1ZXJ5VHBsKVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIG9uRm9ybUNoYW5nZTogZnVuY3Rpb24oKXtcbiAgICAgICAgaWYgKHRoaXMuX2Rpc2FibGVTYXZpbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzcG90SWQgPSB0aGlzLnVpLnNwb3RJZC52YWwoKTtcbiAgICAgICAgdmFyIHVzZXIgPSB0aGlzLnVpLnVzZXIudmFsKCk7XG5cbiAgICAgICAgaWYgKHNwb3RJZCAmJiB1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLl9kaXNhYmxlU2F2aW5nID0gdHJ1ZTtcblxuICAgICAgICAgICAgdGhpcy5tb2RlbC5zYXZlKHtcbiAgICAgICAgICAgICAgICBzcG90OiBzcG90SWQsXG4gICAgICAgICAgICAgICAgdXNlcjogdXNlclxuICAgICAgICAgICAgfSwge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICAgIEJhY2tib25lLmhpc3RvcnkubmF2aWdhdGUoJy9tb3ZlcycsIHt0cmlnZ2VyOiB0cnVlfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIG9uU3BvdEJsdXI6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBzcG90cyA9IGNoYW5uZWwucmVxdWVzdCgnZW50aXRpZXM6c3BvdHMnKTtcbiAgICAgICAgdmFyIHNwb3RJZCA9IHRoaXMudWkuc3BvdElkLnZhbCgpO1xuXG4gICAgICAgIGlmICghc3BvdElkKSB7XG4gICAgICAgICAgICB2YXIgc3BvdFZhbCA9IHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcpO1xuICAgICAgICAgICAgdmFyIHNlbGVjdGVkU3BvdCA9IHNwb3RzLmZpbmQoZnVuY3Rpb24oc3BvdCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNwb3QuZ2V0KCduYW1lJykudG9Mb3dlckNhc2UoKSA9PSBzcG90VmFsLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHNlbGVjdGVkU3BvdCkge1xuICAgICAgICAgICAgICAgIHRoaXMudWkuc3BvdElkLnZhbChzZWxlY3RlZFNwb3QuaWQpLmNoYW5nZSgpO1xuICAgICAgICAgICAgICAgIHNwb3RJZCA9IHNlbGVjdGVkU3BvdC5pZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMudWkuc3BvdC50eXBlYWhlYWQoJ3ZhbCcsIHNwb3RJZCA/IHNwb3RzLmdldCgrc3BvdElkKS5nZXQoJ25hbWUnKSA6ICcnKTtcbiAgICB9LFxuICAgIG9uVHlwZWFoZWFkU2VsZWN0OiBmdW5jdGlvbihlLCBvYmope1xuICAgICAgICB0aGlzLnVpLnNwb3RJZC52YWwob2JqLmlkKS5jaGFuZ2UoKTtcbiAgICB9LFxuICAgIHRlbXBsYXRlSGVscGVyczogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNwb3RzOiBjaGFubmVsLnJlcXVlc3QoJ2VudGl0aWVzOnNwb3RzJykudG9KU09OKClcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBMdW5jaE1vdmVzVmlldzogTHVuY2hNb3Zlc1ZpZXcsXG4gICAgTW92ZUZvcm1WaWV3OiBNb3ZlRm9ybVZpZXdcbn1cbiJdfQ==
