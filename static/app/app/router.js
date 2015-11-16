// Dependencies
var $ = require('jquery');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var Radio = require('backbone.radio');
var moment = require('moment');

var channel = Radio.channel('global');

var Router = Backbone.Router.extend({
    routes: {
        "": "list",
        "edit": "edit"
    },
    edit: function(){
        channel.trigger('edit');
    },
    list: function() {
        channel.trigger('list');
    }

});

module.exports = Router;
