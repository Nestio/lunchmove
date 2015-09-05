var LunchMovesView = require('app/views').LunchMovesView;
var Moves = require('app/entities').Moves;
var Spots = require('app/entities').Spots;

var regionManager = new Marionette.RegionManager({
    main: '#app'
});

var moves = new Moves();
var spots = new Spots();

$.when(moves.fetch(), spots.fetch()).done(function(moves, spots){
    var view = new LunchMovesView({collection: moves});
    regionManager.show(view);
})
