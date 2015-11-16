//Dependencies
var fs = require('fs');
var _ = require('underscore');
var Marionette = require('backbone.marionette');

//App
var LoadingTpl = fs.readFileSync(__dirname + '/templates/loading.html', 'utf8');

var LoadingView = Marionette.ItemView.extend({
    template: _.template(LoadingTpl)
});

module.exports = {
    LoadingView: LoadingView
};
