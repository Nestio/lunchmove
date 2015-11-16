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

var ModalForm = Marionette.ItemView.extend({
    className: 'modal',
    _defaultEvents: {
        'hide.bs.modal': 'destroy'
    },
    constructor: function(){
        this.events = _.extend(this._defaultEvents, this.events);
        Marionette.ItemView.prototype.constructor.apply(this, arguments);
    }
});

var ModalFormView = FormView.extend({
    className: 'modal',
    requiredFields: [],
    isComplete: function(){
        var data = this.serializeForm();
        return _.all(this.requiredFields, function(field){
            return data[field];
        });
    },
    toggleSaveButton: function(){
        this.ui.saveButton.toggleClass('disabled', !this.isComplete());
    },
    _modalFormEvents: {
        'hide.bs.modal': 'destroy',
        'change @ui.form': 'toggleSaveButton',
        'input input[type="text"]': 'toggleSaveButton'
    },
    constructor: function(){
        this.events = _.extend(this._modalFormEvents, this.events);
        FormView.prototype.constructor.apply(this, arguments);
        this.on('show', this.toggleSaveButton);
    }
});

var MoveFormView = ModalForm.extend({
    template: _.template(MoveFormTpl),
    ui: {
        'form': 'form',
        'spot': '[name="spot"]',
        'spotId': '[name="spot_id"]',
        'time': '[name="time"]',
        'submit': '[type="submit"]'
    },
    events: {
        'typeahead:select @ui.spot': 'onTypeaheadSelect',
        'click [data-action="addSpot"]': 'addSpot',
        'submit @ui.form': 'onFormSubmit',
        'blur @ui.spot': 'onSpotBlur',
        'change @ui.form': 'toggleSaveButton',
        'input input[type="text"]': 'toggleSaveButton'
    },
    addSpot: function(){
        var spot = new Spot({
            name: this.ui.spot.typeahead('val')
        });

        spot.save({}, {
            success: _.bind(function(){
                channel.request('entities:spots').add(spot);
                this.ui.spot.typeahead('val', spot.get('name')).blur();
            }, this)
        });
    },
    deserializeModel: function(){
        var spot = this.model.get('spot');
        if (spot) {
            var spotName = channel.request('entities:spots').get(spot).get('name');
            this.ui.spot.typeahead('val', spotName);
            this.ui.spotId.val(spot);
        }
        var time = this.model.get('time');

        if (time) {
            this.ui.time.val( moment(time).format('h:mm') );
        }
    },
    serializeForm: function(){
        var data = {};
        var spotId = this.ui.spotId.val();
        if (spotId) {
            data.spot = spotId;
        }
        var time = this.parseTime();
        if (time) {
            data.time = time;
        }
        return data;
    },
    onShow: function(){
        this.renderTypeahead();
        this.deserializeModel();
        this.toggleSaveButton();
    },
    renderTypeahead: function(){
        var spots = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: channel.request('entities:spots').toJSON()
        });

        this.ui.spot.typeahead({
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
    toggleSaveButton: function(){
        var data = this.serializeForm();
        var isComplete = _.has(data, 'time') && _.has(data, 'spot');
        this.ui.submit.toggleClass('disabled', !isComplete);
    },
    onFormSubmit: function(e){
        e.preventDefault();
        var data = this.serializeForm();
        if (_.has(data, 'time') && _.has(data, 'spot')){
            this.ui.submit.attr('disabled', true);
            this.model.save(data, {
                success: _.bind(function(){
                    this.ui.submit.attr('disabled', true);
                    this.model.trigger('update');
                    this.$el.modal('hide');
                    var moves = channel.request('entities:moves');
                    moves.add(this.model, {merge: true});
                    this.model.trigger('update');
                }, this)
            });
        }
    },
    parseTime: function(){
        var string = this.ui.time.val();

        var wordMap = {
            'rightnow': 1,
            'immediately': 1,
            'now': 1,
            'soonish': 15,
            'soon': 15,
            'later': 60
        };

        var stringVal = wordMap[string.replace(/\W+/g, '').toLowerCase()];

        if (stringVal ) {
            return moment().add(stringVal, 'm').format();
        }

        var numVal = string.replace(/([^:0-9])/g, '');

        if (!numVal || !numVal.match(/\d{1,2}:\d{2}/)){ return ''; }

        var split = numVal.split(':').map(function(num){return +num; });
        if (split[0] < 6) {
            split[0] += 12;
        }

        return moment(split.join(':'), 'hh:mm').format();
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
});

channel.reply('show:form', function(){
    var ownMove = channel.request('entities:move');
    var ViewClass = ownMove.get('user') ? MoveFormView : NameView;
    var view = new ViewClass({model: ownMove});
    channel.request('show:modal', view);
});
