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

        moves.fetch().done(function(){
            var listView = new LunchMovesView({collection: moves});
            regionManager.get('main').show(listView);
        });
    }

});

module.exports = Router;
