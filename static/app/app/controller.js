//Dependencies
var $ = require('jquery');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var Radio = require('backbone.radio');

//App
var channel = Radio.channel('global');
var Move = require('app/entities').Move;
var LoadingView = require('app/common/views').LoadingView;
var LayoutView = require('app/list/views').LayoutView;
var MoveFormView = require('app/edit/views').MoveFormView;
var NameView = require('app/edit/views').NameView;

var Controller = Marionette.Object.extend({
    initialize: function(){
        channel.on('call:method', function(methodName){
            if (this[methodName]) {
                this[methodName]();
            }
        }, this);
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
    },
    edit: function(){
        var move = channel.request('entities:move');
        var spots = channel.request('entities:spots');
        
        var callback = function(){
            var ViewClass = move.get('user') ? MoveFormView : NameView;
            var view = new ViewClass({model: move});
            channel.request('show:modal', view);
        };
        
        if (spots.length) {
            callback();
        } else {
            var mainRegion = channel.request('get:region', 'main');
            mainRegion.show(new LoadingView());
            spots.fetch().done(callback);
        }

    }
});

module.exports = Controller;