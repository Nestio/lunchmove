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
