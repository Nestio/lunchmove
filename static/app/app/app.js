// Dependencies
var $ = global.jQuery = require('jquery');
var Backbone = require('backbone');
var Radio = require('backbone.radio');
require('bootstrap');

//App
new (require('app/constants').API);
new (require('app/entities').API);
var Router = require('app/router');

new Router();
Backbone.history.start({pushState: true});
