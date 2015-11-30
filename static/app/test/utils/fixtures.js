var $ = require('jquery');

var fixtureContainer = $('<div>').attr('id','fixture-container');

var fixtures = {
    append: function(template){
        fixtureContainer.append(template);
    },
    cleanup: function(){
        fixtureContainer.empty();
    },
    create: function(){
        $('body').append(fixtureContainer);
    }
}

fixtures.create();

module.exports = fixtures;
