//Dependencies
var fs = require('fs');
var $ = global.jQuery = require('jquery');
var _ = require('underscore');
var Marionette = require('backbone.marionette');
var Radio = require('backbone.radio');
var moment = require('moment');
global.Bloodhound = require('typeahead.js/dist/bloodhound');
require('typeahead.js/dist/typeahead.jquery');

//App
var MoveFormTpl = fs.readFileSync(__dirname + '/templates/lunch-move-form.html', 'utf8');
var NameFormTpl = fs.readFileSync(__dirname + '/templates/name-form.html', 'utf8');
var EmptyQueryTpl = fs.readFileSync(__dirname + '/templates/empty-query.html', 'utf8');
var Spot = require('app/entities').Spot;
var FormView = require('app/lib/form-view');

var channel = Radio.channel('global');

var ModalFormView = FormView.extend({
    className: 'modal',
    _modalFormEvents: {
        'hide.bs.modal': 'destroy',
        'change @ui.form': 'toggleSaveButton',
        'input input[type="text"]': 'toggleSaveButton'
    },
    requiredFields: [],
    constructor: function(){
        this.events = _.extend(this._modalFormEvents, this.events);
        FormView.prototype.constructor.apply(this, arguments);
    }
    isComplete: function(){
        var data = this.serializeForm();
        return _.all(this.requiredFields, function(field){
            return data[field];
        });
    },
    toggleSaveButton: function(){
        this.ui.saveButton.toggleClass('disabled', !this.isComplete());
    },
});

var MoveFormView = ModalFormView.extend({
    template: _.template(MoveFormTpl),
    fields: {
        'spot': {
            encoder: 'Integer',
            rules: ['required']
        },
        'time': {
            encoder: 'MoveTime',
            rules: ['required']
        }
    },
    requiredFields: ['spot', 'time'],
    ui: {
        'spotName': '[name="spotName"]',
        'spot': '[name="spot"]',
        'time': '[name="time"]',
    },
    events: {
        'typeahead:select @ui.spotName': 'onTypeaheadSelect',
        'click [data-action="addSpot"]': 'addSpot',
        'blur @ui.spotName': 'onSpotBlur'
    },
    addSpot: function(){
        var spot = new Spot({
            name: this.ui.spotName.typeahead('val')
        });

        spot.save({}, {
            success: _.bind(function(){
                channel.request('entities:spots').add(spot);
                this.ui.spotName.typeahead('val', spot.get('name')).blur();
            }, this)
        });
    },
    onDeserialize: function(){
        var spot = this.model.get('spot');
        if (spot) {
            var spotName = channel.request('entities:spots').get(spot).get('name');
            this.ui.spotName.typeahead('val', spotName);
            this.ui.spot.val(spot);
        }
        
        this.toggleSaveButton();
    },
    onShow: function(){
        this.renderTypeahead();
    },
    onSubmitSuccess: function(e){
        this.$el.modal('hide');
        var moves = channel.request('entities:moves');
        moves.add(this.model, {merge: true});
        this.model.trigger('update');
    },
    onSpotBlur: function(){
        var spots = channel.request('entities:spots');
        var spotId = this.ui.spotId.val();

        if (!spotId) {
            var spotVal = this.ui.spot.typeahead('val');
            var selectedSpot = spots.find(function(spot){
                return spot.get('name').toLowerCase() == spotVal.toLowerCase();
            });

            if (selectedSpot) {
                this.ui.spotId.val(selectedSpot.id).change();
                spotId = selectedSpot.id;
            }
        }

        this.ui.spot.typeahead('val', spotId ? spots.get(+spotId).get('name') : '');
    },
    onTypeaheadSelect: function(e, obj){
        this.ui.spotId.val(obj.id).change();
    },
    renderTypeahead: function(){
        var spots = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: channel.request('entities:spots').toJSON()
        });

        this.ui.spotName.typeahead({
            hint: true,
            highlight: true,
            minLength: 1
        },
        {
            display: 'name',
            name: 'spots',
            source: spots,
            templates: {
                empty: _.template(EmptyQueryTpl)
            }
        });
    },
    templateHelpers: function(){
        return {
            spots: channel.request('entities:spots').toJSON()
        }
    }
});

var NameView = ModalFormView.extend({
    template: _.template(NameFormTpl),
    fields: {
        'user': {
            rules: 'required'
        }
    },
    requiredFields: ['user'],
    onSubmit: function(e, data){
        e.preventDefault();
        this.model.set(data);
        this.$el.modal('hide');
        setTimeout(_.bind(function(){
            var view = new MoveFormView({model: this.model});
            channel.request('show:modal', view);
        }, this), 1);
    },
    onShow: function(){
        this.toggleSaveButton();
    }
});

channel.reply('show:form', function(){
    var ownMove = channel.request('entities:move');
    var ViewClass = ownMove.get('user') ? MoveFormView : NameView;
    var view = new ViewClass({model: ownMove});
    channel.request('show:modal', view);
});
