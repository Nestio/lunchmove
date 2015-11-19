// Dependencies
var $ = require('jquery');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var Radio = require('backbone.radio');
var moment = require('moment');

var channel = Radio.channel('global');

var API = {
    edit: function(){
        channel.trigger('call:method', 'edit');
    },
    list: function() {
        channel.trigger('call:method', 'list');
    },
    join: function(moveId) {
        channel.trigger('call:method', 'join', moveId);
    }

};

channel.on('edit', function(){
    Backbone.history.navigate('edit');
    API.edit();
});

channel.on('list', function(){
    Backbone.history.navigate('');
    API.list();
});

var Router = Backbone.Router.extend({
    routes: {
        "": "list",
        "edit": "edit",
        "move/:moveId/join": "join"
    },
    edit: function(){
        API.edit();
    },
    list: function() {
        API.list();
    },
    join: function(moveId) {
      API.join(moveId);
    }
});

module.exports = Router;
