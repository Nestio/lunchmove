var LunchMovesView = require('app/views').LunchMovesView;
var Move = require('app/entities').Move;
var Moves = require('app/entities').Moves;
var Spots = require('app/entities').Spots;

var regionManager = new Marionette.RegionManager({
    regions: {
        main: '#app'
    }
});

var moves = new Moves();
var spots = new Spots();

$.when(moves.fetch(), spots.fetch()).done(function(){
    var view = new LunchMovesView({
        collection: moves,
        spots: spots,
        model: new Move()
    });
    regionManager.get('main').show(view);
})
