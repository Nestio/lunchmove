var fs = require('fs');
var EmptyTpl = fs.readFileSync(__dirname + '/templates/empty-moves.html', 'utf8');
var LunchMoveTpl = fs.readFileSync(__dirname + '/templates/lunch-move.html', 'utf8');
var LunchMovesTpl = fs.readFileSync(__dirname + '/templates/lunch-moves.html', 'utf8');

var LunchMoveView = Marionette.ItemView.extend({
    className: 'li',
    template: _.template(EmptyTpl)
});

var EmptyView = Marionette.ItemView.extend({
    className: 'li',
    template: _.template(LunchMoveTpl)
});


var LunchMovesView = Marionette.CompositeView.extend({
    emptyView: EmptyView,
    childView: LunchMoveView,
    childViewContainer: 'ul',
    template: _.template(LunchMovesTpl)

});

module.exports = {
    LunchMovesView: LunchMovesView
}
