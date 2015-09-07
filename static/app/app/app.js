var LunchMovesView = require('app/views').LunchMovesView;
var MoveFormView = require('app/views').MoveFormView;
var Move = require('app/entities').Move;
var Moves = require('app/entities').Moves;
var Spots = require('app/entities').Spots;
var Spot = require('app/entities').Spot;

var channel = Backbone.Radio.channel('global');

var regionManager = new Marionette.RegionManager({
    regions: {
        main: '#app'
    }
});

var moves = new Moves();
var spots = new Spots();

channel.reply('entities:spots', function(){
    return spots;
});

spots.fetch().done(function(){
    var move = new Move();

    var formView = new MoveFormView({
        model: move
    });

    regionManager.get('main').show(formView);

    move.on('sync', function(){
        moves.fetch().done(function(){
            var listView = new LunchMovesView({collection: moves});
            regionManager.get('main').show(listView);
        });
    });
})
