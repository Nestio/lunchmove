var Factory = require('factory_girl');

FactoryGirl.sequence('spotName', function(id) {
    return 'name ' + id;
});

FactoryGirl.sequence('spotId', function(id) {
    return 'name ' + id;
});

Factory.define('Spot', function(){
    this.sequence('spotName', 'name');
    this.sequence('spotId', 'id');
});
