var channel = Backbone.Radio.channel('global');

var Move = Backbone.Model.extend({
    urlRoot: '/json/moves/'
});

var Moves = Backbone.Collection.extend({
    url: '/json/moves/',
    parse: function(response){
        return response.results;
    },
    groupBySpot: function(){
        return this.reduce(function(collection, move){
            var model = collection.add({id: move.get('spot')});

            if (!model.has('moves'){
                model.set('moves', new Backbone.Collection());
            }

            model.get('moves').add(move);

        }, new Backbone.Collection());
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
