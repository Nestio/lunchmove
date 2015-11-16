// Dependencies
var $ = global.jQuery = require('jquery');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var Radio = require('backbone.radio');
require('bootstrap');

new (require('app/constants').API);
new (require('app/entities').API);
var Router = require('app/router');
var Controller = require('app/controller');
var channel = Radio.channel('global');

var regionManager = new Marionette.RegionManager({
    regions: {
        main: '#app',
        modal: '#modal'
    }
});

channel.reply('get:region', function(region){
    return regionManager.get(region);
});

channel.reply('show:modal', function(view){
    regionManager.get('modal').show(view);
    view.$el.modal();
});

new Controller();
new Router();
Backbone.history.start({pushState: true});
