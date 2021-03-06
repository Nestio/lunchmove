// Dependencies
var Marionette = require('backbone.marionette');
var Radio = require('backbone.radio');
var moment = require('moment');

var channel = Radio.channel('global');

var Constants = {
    RECENT_THRESHOLD: moment().subtract(6, 'hours')
};

var API = Marionette.Object.extend({
    initialize: function(){
        channel.reply('get:constant', function(name){
            return this.replyConstants(name);
        }, this);
    },
    onDestroy: function(){
        channel.stopReplying('get:constant');
    },
    replyConstants: function(name){
        return Constants[name];
    }
});

module.exports = {
    API: API
};
