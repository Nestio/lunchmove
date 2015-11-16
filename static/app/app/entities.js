// Dependencies
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var Radio = require('backbone.radio');
var moment = require('moment');

//App
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

var spots = new Spots();
var moves = new Moves();
var move = new Move(lunchmove.recent_move);

var API = Marionette.Object.extend({
    initialize: function(){
        channel.reply('entities:spots', function(){
            return spots;
        });

        channel.reply('entities:moves', function(){
            return moves;
        });

        channel.reply('entities:move', function(){
            return move;
        });
    }, 
    onDestroy: function(){
        channel.stopReplying('entities:spots');
        channel.stopReplying('entities:moves');
        channel.stopReplying('entities:move');
    }
});

module.exports = {
    API: API,
    Spots: Spots,
    Moves: Moves,
    Move: Move,
    Spot: Spot
}
