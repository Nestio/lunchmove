// Dependencies
var $ = global.jQuery = require('jquery');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var Radio = require('backbone.radio');
require('bootstrap/js/tooltip');
require('bootstrap');
$(function(){
  require('app/lib/ajax-csrf');
});

new (require('app/constants').API);
new (require('app/entities').API);
var Router = require('app/router');
var Controller = require('app/controller');
var channel = Radio.channel('global');

var regionManager = new Marionette.RegionManager({
    regions: {
        main: '#app'
    }
});

channel.reply('get:region', function(region){
    return regionManager.get(region);
});

new Controller();
new Router();
Backbone.history.start({pushState: true});
