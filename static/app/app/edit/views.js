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

var BaseFormView = FormView.extend({

    lunchmoveUI: {
      cancel: '[data-ui="cancel"]'
    },

    _lunchmoveBaseFormEvents: {
        'change @ui.form': 'toggleSaveButton',
        'input input[type="text"]': 'toggleSaveButton',
        'click @ui.cancel': 'cancel'
    },
    requiredFields: [],
    constructor: function(){
        this.events = _.extend({}, this._lunchmoveBaseFormEvents, this.events);
        this.ui = _.extend({}, this.lunchmoveUI, this.ui);
        FormView.prototype.constructor.apply(this, arguments);
    },
    isComplete: function(){
        var data = this.serializeForm();
        return _.all(this.requiredFields, function(field){
            return data[field];
        });
    },
    toggleSaveButton: function(){
        this.ui.saveButton.toggleClass('disabled', !this.isComplete());
    },
    cancel: function(e) {
      e.preventDefault();
      channel.trigger('list');
    }
});

var MoveFormView = BaseFormView.extend({
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
                this.ui.spot.val(spot.id);
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
      channel.trigger('list', true);
    },
    onSpotBlur: function(){
        var spots = channel.request('entities:spots');
        var spotId = this.ui.spot.val();

        if (!spotId) {
            var spotVal = this.ui.spotName.typeahead('val');
            var selectedSpot = spots.find(function(spot){
                return spot.get('name').toLowerCase() == spotVal.toLowerCase();
            });

            if (selectedSpot) {
                this.ui.spot.val(selectedSpot.id).change();
                spotId = selectedSpot.id;
            }
        }

        this.ui.spotName.typeahead('val', spotId ? spots.get(+spotId).get('name') : '');
    },
    onTypeaheadSelect: function(e, obj){
        this.ui.spot.val(obj.id).change();
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

var NameView = BaseFormView.extend({
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
        channel.trigger('edit');
    },
    onShow: function(){
        this.toggleSaveButton();
    }
});

module.exports = {
    NameView: NameView,
    MoveFormView: MoveFormView
};
