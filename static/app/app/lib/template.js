// Dependencies
var _ = require('underscore');

// App
var helpers = require('app/lib/helpers');


var Template = function(tpl) {
    var template = _.template(tpl);

    return function(data) {
        return template(_.extend({helpers: helpers}, data));
    }
};

module.exports = Template;
