var fs = require('fs');
var EmptyTpl = fs.readFileSync(__dirname + '/templates/empty-moves.html', 'utf8');
var LunchMoveTpl = fs.readFileSync(__dirname + '/templates/lunch-move.html', 'utf8');
var MoveFormTpl = fs.readFileSync(__dirname + '/templates/lunch-move-form.html', 'utf8');
var ModalTpl = fs.readFileSync(__dirname + '/templates/modal.html', 'utf8');
var Spot = require('app/entities').Spot;
var SpotResults = require('app/utils').SpotResults;

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

var LunchMovesView = Marionette.CollectionView.extend({
    emptyView: EmptyView,
    childView: LunchMoveView,
    tagName: 'ul',
    className: 'list-group',
});

var MoveFormView = Marionette.ItemView.extend({
    template: _.template(MoveFormTpl),
    ui: {
        'form': 'form',
        'spot': '[name="spot"]',
        'submit': '[type="submit"]',
        'user': '[name="user"]'
    },
    events: {
        'typeahead:select @ui.form': 'onTypeaheadSelect',
        'submit @ui.form': 'submitMove',
        'click @ui.addSpot': 'addSpot',
        'change @ui.form': 'onFormChange'
    },
    addSpot: function(spot){
        var $option = $('<option>').prop('value', spot.id).text(spot.get('name'));
        this.ui.spot.append($option);
        this.ui.spot.val(spot.id).change();
    },
    initialize: function(){
        this.listenTo(channel.request('entities:spots'), 'add', this.addSpot);
    },
    onShow: function(){
        this.ui.spot.select2({
            resultsAdapter: SpotResults
        });

        $('body').on('click', '[data-action="addSpot"]', this.addSpot.bind(this));
    },
    onFormChange: function(){
        var isComplete = !!this.ui.spot.val() && !!this.ui.user.val();
        this.ui.submit.toggleClass('hidden', !isComplete);
    },
    submitMove: function(e){
        var spot = this.ui.spot.val();
        var user = this.ui.user.val();

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
    LunchMovesView: LunchMovesView,
    ModalView: ModalView,
    MoveFormView: MoveFormView
}
