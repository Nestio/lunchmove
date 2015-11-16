//Dependencies
var $ = require('jquery');
var Marionette = require('backbone.marionette');
var Radio = require('backbone.radio');

//App
var channel = Radio.channel('global');
var Move = require('app/entities').Move;
var LoadingView = require('app/views').LoadingView;
var LayoutView = require('app/views').LayoutView;
require('app/form-views');

var Controller = Marionette.Object.extend({
    initialize: function(){
        channel.on('list', this.list, this);
    },
    list: function(){
        var mainRegion = channel.request('get:region', 'main');
        mainRegion.show(new LoadingView());
        var move = channel.request('entities:move');
        var moves = channel.request('entities:moves');
        var spots = channel.request('entities:spots');

        $.when(moves.fetch(), spots.fetch()).done(function(){
            var layoutView = new LayoutView({
                model: move,
                collection: moves.groupBySpot()
            });

            mainRegion.show(layoutView);
        });
    }
});

module.exports = Controller;