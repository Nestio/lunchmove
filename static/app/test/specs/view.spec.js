// Test
var assert = require('chai').assert;
var sinon = require('sinon');
var Factory = require('factory_girl');


// Fixtures
var fs = require('fs');
var fixtures = require('fixtures');
var BaseRegionsFixt = fs.readFileSync(__dirname + '/../fixtures/base-regions.html', 'utf8');


describe('Controller', function(){
    beforeEach(function(){
        this.mainRegion = new Marionette.Region({
            el: '#main-region'
        });
    });

    afterEach(function(){
        this.mainRegion.empty();
    });

    after(function(){
        fixtures.cleanup();
    });

    it('is a passing test', function(){
        assert.isTrue(true);
    });
});
