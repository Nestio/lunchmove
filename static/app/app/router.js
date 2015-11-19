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
    list: function(saveAlert) {
        channel.trigger('call:method', 'list', saveAlert);
    }
};

channel.on('edit', function(){
    Backbone.history.navigate('edit');
    API.edit();
});

channel.on('list', function(saveAlert){
    Backbone.history.navigate('');
    API.list(saveAlert);
});

var Router = Backbone.Router.extend({
    routes: {
        "": "list",
        "edit": "edit"
    },
    edit: function(){
        API.edit();
    },
    list: function() {
        API.list();
    }
});

module.exports = Router;
