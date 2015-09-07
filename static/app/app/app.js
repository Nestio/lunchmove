var Router = require('app/router');
var Spots = require('app/entities').Spots;
var Moves = require('app/entities').Moves;
var channel = Backbone.Radio.channel('global');

var spots = new Spots();
var moves = new Moves();

channel.reply('entities:spots', function(){
    return spots;
});

channel.reply('entities:moves', function(){
    return moves;
});

new Router();

Backbone.history.start();
