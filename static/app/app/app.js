var LunchMovesView = require('app/views').LunchMovesView;
var Move = require('app/entities').Move;
var Moves = require('app/entities').Moves;
var Spots = require('app/entities').Spots;
var Spot = require('app/entities').Spot;
var ModalView = require('app/views').ModalView;

var channel = Backbone.Radio.channel('global');

var regionManager = new Marionette.RegionManager({
    regions: {
        main: '#app',
        modal: '#modal'
    }
});

var moves = new Moves();
var spots = new Spots();

channel.reply('entities:spots', function(){
    return spots;
});

channel.comply('show:modal', function(view){
    var modalRegion = regionManager.get('modal');

    modalRegion.show(view);
    view.$el.modal();

    view.$el.on('hidden.bs.modal', function(){
        modalRegion.empty();
    });
});

channel.comply('show:modal:spot', function(){
    var spot = new Spot();
    var view = new ModalView({
        model: spot
    });

    channel.command('show:modal', view);

    spot.on('sync', function(){
        channel.request('entities:spots').add(spot);
    });
});


$.when(moves.fetch(), spots.fetch()).done(function(){
    var view = new LunchMovesView({
        collection: moves,
        model: new Move()
    });
    regionManager.get('main').show(view);
})
