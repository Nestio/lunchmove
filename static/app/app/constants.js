// Dependencies
var Radio = require('backbone.radio');
var moment = require('moment');

var channel = Radio.channel('global');

var Constants = {
    RECENT_THRESHOLD: moment().subtract(6, 'hours')
};

channel.reply('get:constant', function(name){
    return Constants[name];
})
