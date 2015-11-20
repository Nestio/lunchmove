//Dependencies
var $ = require('jquery');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var Radio = require('backbone.radio');
var _ = require('underscore');

//App
var channel = Radio.channel('global');
var Move = require('app/entities').Move;
var LoadingView = require('app/common/views').LoadingView;
var LayoutView = require('app/list/views').LayoutView;
var MoveFormView = require('app/edit/views').MoveFormView;
var NameView = require('app/edit/views').NameView;
var JoinView = require('app/edit/views').JoinView;

var Controller = Marionette.Object.extend({
    initialize: function(){
        channel.on('call:method', function(methodName, arg){
            if (this[methodName]) {
                this[methodName](arg);
            }
        }, this);
    },
    list: function(){

        var move = channel.request('entities:move');
        var spots = channel.request('entities:spots');

        var mainRegion = channel.request('get:region', 'main');
        mainRegion.show(new LoadingView());
        var moves = channel.request('entities:moves');
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
            var mainRegion = channel.request('get:region', 'main');
            mainRegion.show(view);
        };

        if (spots.length) {
            callback();
        } else {
            var mainRegion = channel.request('get:region', 'main');
            mainRegion.show(new LoadingView());
            spots.fetch().done(callback);
        }

    },
    join: function(moveId) {
      // option1: there is no current user

      // option2: there is a current user
        //      a: that current user has no recent move
        //      b: that current user does have a recent move
      var moves = channel.request('entities:moves');
      $.when(moves.fetch()).done(function(){
        var currentMove = channel.request("entities:move");
        var moveToJoin = channel.request('entities:moves').find({id: parseInt(moveId)});
        // channel.request("entities:moves").remove(channel.request("entities:move"));
        currentMove.set('spot', moveToJoin.get('spot'));
        currentMove.set('time', moveToJoin.get('time'));
        if (currentMove.get('user')) {
          debugger
          channel.request('entities:move').save({}, {
            dataType: 'text',
            success: function() {
              channel.trigger('list');
            },
            error: function(model, resp) {
              console.log(resp);
            }
          })
        } else {
          var mainRegion = channel.request('get:region', 'main');
          mainRegion.show(new JoinView);
        }

      });

    }
});

module.exports = Controller;
