// Dependencies
var fs = require('fs');
var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var Radio = require('backbone.radio');

//App
var LayoutTpl = fs.readFileSync(__dirname + '/templates/layout.html', 'utf8');
var YourMoveTpl = fs.readFileSync(__dirname + '/templates/your-move.html', 'utf8');
var EmptyTpl = fs.readFileSync(__dirname + '/templates/empty-moves.html', 'utf8');
var LunchMoveTpl = fs.readFileSync(__dirname + '/templates/lunch-move.html', 'utf8');
var LunchMovesTpl = fs.readFileSync(__dirname + '/templates/lunch-moves.html', 'utf8');

var channel = Radio.channel('global');

var LunchMoveView = Marionette.ItemView.extend({
    modelEvents: {
        'change:moves': 'render'
    },
    events: {
        'click @ui.addMove': 'addMove',
        'click @ui.editMove': 'addMove',
        'click @ui.delete': 'deleteMove'
    },
    ui: {
        'delete': '[data-ui="delete"]',
        'editMove': '.own-move',
        'addMove': '[data-ui="addMove"]',
    },
    addMove: function(e){
        e.preventDefault();
        channel.request('entities:move').set('spot', this.model.id);
        channel.trigger('edit');
        return false;
    },
    activateTooltips: function() {
        $(function () {
            $('[data-toggle="tooltip"]').tooltip()
        })
    },
    deleteMove: function(e) {
        e.preventDefault();
        channel.request('entities:move:reset', {
            success: function() {
                channel.trigger('list');
            }
        });
    },
    onShow: function() {
        if (this.getOption('recentlySaved')) {
           this.recentSaveAlert();
        }
        this.activateTooltips();
    },
    recentSaveAlert: function() {
        this.ui.editMove.addClass('background-flash');
        setTimeout(function(){
            this.ui.editMove.removeClass('background-flash');
        }.bind(this), 600)
    },
    className: 'row move-row',
    template: _.template(LunchMoveTpl),
    templateHelpers: function(){
        var ownMove =  channel.request('entities:move');
        return {
            spotName: channel.request('entities:spots').get(this.model.id).get('name'),
            isOwnMove: function(move){
                return ownMove.id === move.id;
            },
            hasOwnMove: !!this.model.get('moves').get(ownMove.id)
        }
    }
});

var EmptyView = Marionette.ItemView.extend({
    className: 'row',
    template: _.template(EmptyTpl)
});

var LunchMovesView = Marionette.CompositeView.extend({
    className: 'lunch-moves-list',
    modelEvents: {
        'update': 'recalculateMoves'
    },
    template: _.template(LunchMovesTpl),
    childView: LunchMoveView,
    childViewOptions: function() {
        return { recentlySaved: this.getOption('recentlySaved') };
    },
    onChildviewDeleteMove: function() {
        channel.trigger('list');
    },
    emptyView: EmptyView,
    childViewContainer: '.moves-container',
    recalculateMoves: function(){
        this.collection = channel.request('entities:moves').groupBySpot();
        this.render();
    }
});


var YourMoveView = Marionette.ItemView.extend({
    modelEvents: {
        'change:spot': 'destroy'
    },
    ui: {
        'editMove': '[data-ui="editMove"]'
    },
    events: {
        'click @ui.editMove': 'editMove'
    },
    template: _.template(YourMoveTpl),
    editMove: function(e){
        e.preventDefault();
        channel.trigger('edit');
        return false;
    },
    templateHelpers: function(){
        var spots = channel.request('entities:spots');

        return {
            spotName: this.model.has('spot') ? spots.get(this.model.get('spot')).get('name') : ''
        }
    }
});


var LayoutView = Marionette.LayoutView.extend({
    template: _.template(LayoutTpl),
    regions: {
        'yourMove': '[data-region="yourMove"]',
        'moves': '[data-region="moves"]'
    },
    onShow: function(){
        if (!this.model.get('spot')) {
            this.showChildView('yourMove', new YourMoveView({
                model: this.model
            }));
        }

        this.showChildView('moves', new LunchMovesView({
            model: this.model,
            collection: this.collection,
            recentlySaved: this.getOption('recentSave')
        }));
    }
});

module.exports = {
    LayoutView: LayoutView
}
