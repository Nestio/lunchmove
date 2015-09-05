var Move = Backbone.Model.extend({
    urlRoot: '/json/moves'
});

var Moves = Backbone.Collection.extend({
    url: '/json/moves'
});

var Spot = Backbone.Model.extend({
    urlRoot: '/json/spots'
});

var Spots = Backbone.Collection.extend({
    url: '/json/spots'
});

module.exports = {
    Spots: Spots,
    Moves: Moves
}
