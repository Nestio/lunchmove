var fs = require('fs');
var EmptyTpl = fs.readFileSync(__dirname + '/templates/empty-moves.html', 'utf8');
var LunchMoveTpl = fs.readFileSync(__dirname + '/templates/lunch-move.html', 'utf8');
var LunchMovesTpl = fs.readFileSync(__dirname + '/templates/lunch-moves.html', 'utf8');
var ModalTpl = fs.readFileSync(__dirname + '/templates/modal.html', 'utf8');
var Spot = require('app/entities').Spot;

var channel = Backbone.Radio.channel('global');

var LunchMoveView = Marionette.ItemView.extend({
    tagName: 'li',
    className: 'list-group-item',
    template: _.template(LunchMoveTpl),
    templateHelpers: {
        spotName: function(){
            return channel.request('entities:spots').get(this.spot).get('name');
        }
    }
});

var EmptyView = Marionette.ItemView.extend({
    tagName: 'li',
    className: 'list-group-item',
    template: _.template(EmptyTpl)
});

var ModalView = Marionette.ItemView.extend({
    template: _.template(ModalTpl),
    className: 'modal',

    ui: {
        closeModal: '[data-ui="closeModal"]',
        form: 'form'
    },

    events: {
        'click @ui.closeModal': 'closeModal',
        'submit form': 'onSubmit'
    },

    closeModal: function(){
        this.$el.modal('hide');
    },

    onSubmit: function(e){
        e.preventDefault();
        var name = this.ui.form.find('[name="name"]').val();

        if (!name) {
            return;
        }

        this.model.save({
            name: name
        }, {
            success: this.closeModal.bind(this)
        });
    }
});

var LunchMovesView = Marionette.CompositeView.extend({
    ui: {
        'form': 'form',
        'addSpot': '[data-ui="addSpot"]'
    },
    events: {
        'typeahead:select @ui.form': 'onTypeaheadSelect',
        'submit @ui.form': 'submitMove',
        'click @ui.addSpot': 'addSpot'
    },
    emptyView: EmptyView,
    childView: LunchMoveView,
    childViewContainer: 'ul',
    template: _.template(LunchMovesTpl),
    addSpot: function(e){
        e.preventDefault();
        var spot = new Spot();
        var view = new ModalView({
            model: spot
        });

        channel.command('show:modal', view);

        this.listenTo(spot, 'sync', function(){
            channel.request('entities:spots').add(spot);
            var $select = this.ui.form.find('[name="spot"]')
            $select.append(
                $('<option>').prop('value', spot.id).text(spot.get('name'))
            );
            $select.val(spot.id).change();
        });

        return false;
    },
    onShow: function(){
        this.ui.form.find('[name="spot"]').select2()
    },
    submitMove: function(e){
        var spot = this.ui.form.find('[name="spot"]').val();
        var user = this.ui.form.find('[name="user"]').val();

        this.model.save({
            spot: spot,
            user: user
        }, {
            success: _.bind(function(){
                this.ui.form.hide();
            }, this)
        });

        e.preventDefault();
    },
    templateHelpers: function(){
        return {
            spots: channel.request('entities:spots').toJSON()
        }
    }
});

module.exports = {
    LunchMovesView: LunchMovesView
}
