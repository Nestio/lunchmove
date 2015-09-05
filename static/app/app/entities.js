var Move = Backbone.Model.extend({
    urlRoot: '/json/moves'
});

var Moves = Backbone.Collection.extend({
    url: '/json/moves',
    parse: function(response){
        return response.results;
    }
});

var Spot = Backbone.Model.extend({
    urlRoot: '/json/spots'
});

var Spots = Backbone.Collection.extend({
    url: '/json/spots',
    parse: function(response){
        return response.results;
    }
});

module.exports = {
    Spots: Spots,
    Moves: Moves,
    Move: Move
}
