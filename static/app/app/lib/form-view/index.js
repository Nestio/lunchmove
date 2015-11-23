// Dependencies
var $ = global.jQuery = require('jquery');
require('jquery.cookie');
require('jquery.iframe-transport');
var _ = require('underscore');
var Backbone = require('backbone');
Backbone.Syphon = require('backbone.syphon');
require('backbone.radio');
require('backbone.babysitter');
var Marionette = require('backbone.marionette');

// App
var fs = require('fs');
var SuccessAlertTpl = fs.readFileSync(__dirname + '/templates/alerts/success.html', 'utf8');
var ErrorAlertTpl = fs.readFileSync(__dirname + '/templates/alerts/error.html', 'utf8');
var Template = require('app/lib/template');
var Encoders = require('app/lib/form-view/encoders');
var ValidationRules = require('app/lib/form-view/validation');
var InputWidgetViews = require('app/lib/input-widgets/input-groups');
var InputGroupWidgetViews = require('app/lib/input-widgets/input-groups');

// Channels
var channel = Backbone.Radio.channel('global');


InputWriterSet = new Backbone.Syphon.InputWriterSet();
InputReaderSet = new Backbone.Syphon.InputReaderSet();

InputWriterSet.registerDefault(function(el, value){
    _.isUndefined(value) ? el.val(null) : el.val(value);

    var widgetView = el.parent().get(0)._widget;
    if (widgetView){
        widgetView.trigger('deserialize', value);
    }
});

InputReaderSet.registerDefault(function(el){
    return el.val();
});

// trigger this so Select2 can register change
InputWriterSet.register('select', function(el, value){
    el.val(value).change();

    var widgetView = el.parent().get(0)._widget;
    if (widgetView){
        widgetView.trigger('deserialize', value);
    }
});

InputWriterSet.register('file', function(el, value){
    return; // Because trying to set a file input causes an error!
});

InputWriterSet.register('checkbox', function(el, value){
    if (_.isArray(value)) {
        var values = _.map(value, String);
        if ( _.contains(values, String(el.val()))) {
            el.prop('checked', true);
        }
    }
    else {
        var state = (value == true || value == 'on' || value === "true");
        el.prop('checked', state);
    }
});

InputReaderSet.register('checkbox', function(el){
    if (!_.isUndefined(el.attr('value'))) {
        return el.is(':checked') ? el.val() : '';
    }
    return el.is(':checked');
});

Backbone.Syphon.InputWriters = InputWriterSet;
Backbone.Syphon.InputReaders = InputReaderSet;

var FormView = Marionette.ItemView.extend({

    _className: 'form-view',
    errorClass: 'has-error',
    errorBlockClass: 'help-block-error',

    successAlertTemplate: _.template(SuccessAlertTpl),
    errorAlertTemplate: _.template(ErrorAlertTpl),

    messages: {
        saveError: 'There was an error saving.',
        validationError: 'Some of the fields entered are invalid.'
    },

    // Object of fields
    fields: {},

    // (Optional) Widgets which will apply to groups of inputs
    inputGroups: {},

    // (Optional) Rules specific to form only
    rules: {},

    // Base encoders and validators
    encoders: Encoders,
    validationRules: ValidationRules,

    // (Optional) Base widget views
    inputWidgetViews: InputWidgetViews,
    inputGroupWidgetViews: InputGroupWidgetViews,

    // Enable/Disable submit via iframe to support file uploading
    hasFiles: false,

    // Enable/Disable form submit on enter keypress
    enterFormSubmit: false,

    // Default UI elements get added to this.ui in constructor
    _defaultUI: {
        form: 'form:first',
        saveButton: '[type="submit"]',
        alertContainer: '[data-ui="alertContainer"]',
        formActions: '[data-ui="formActions"]'
    },

    // Default events get added to this.events in constructor
    _defaultEvents: {
        'submit @ui.form': 'beforeFormSubmit',
        'keydown input': function(e){
            if (! this.getOption('enterFormSubmit') && e.keyCode === 13) {
                e.preventDefault();
            }
        }
    },
    _defaultBehaviors:  {},

    // Data Context Helpers

    serializeData: function(){
        var context = {
            model: this.model.toJSON(),
            choices: this.getFieldChoices()
        };

        return context;
    },

    getChoicesCollection: function(choicesName){
        return channel.request('constants:pick', choicesName);
    },

    getFieldChoices: function(){
        // Returns Constant Choice objects that are defined in this.fields options
        // - Stores them to field name keys in an object
        // - Optionally prepends a null option value if defined in the field's options

        var fieldChoices = this._fieldChoices = {};

        _.each(this.fields, function(fieldOptions, key){
            if (_.isObject(fieldOptions) && fieldOptions.choices) {
                // Choices declaration can either be a string of the constants, or an object of options
                var choicesName = _.isObject(fieldOptions.choices) ? fieldOptions.choices.name : fieldOptions.choices;
                var choicesCollection = this.getChoicesCollection(choicesName);

                if (!choicesCollection) {
                    throw new Error(choicesName+' collection not found!');
                    return;
                }

                var choices = choicesCollection.get('choices').toJSON();

                // nullOption prepends a blank value to the start of the list.
                // If nullOption is a string, use that as the label
                var nullOption = fieldOptions.choices.nullOption;
                if (nullOption) {
                    var nullChoice = {label: '', val: null}
                    if (_.isString(nullOption)) {
                        nullChoice.label = nullOption;
                    }
                    choices.unshift(nullChoice);
                }

                fieldChoices[key] = choices;
            }
        }, this);

        return fieldChoices;
    },

    getInputEl: function(fieldName){
        return this.$('[name="'+fieldName+'"]');
    },

    getFieldEl: function(fieldName){
        // Returns the input field el
        return this.$('[data-field="'+fieldName+'"]');
    },

    getInputGroupEl: function(fieldName){
        // Returns the input group el
        return this.$('[data-input-group="' + fieldName + '"]');
    },



    // Initializers

    constructor: function(){
        // Take behaviors defined in the inheritor and fill out with defaults form _defaultBehaviors
        this.behaviors = _.mapObject(this.behaviors, function(options, key){
            var result = _.extend({}, options);
            _.defaults(result, this._defaultBehaviors[key])
            return result;
        }, this);

        this.className = this._className + ' ' + (this.className || '');

        // Extend default ui hash
        this.ui = _.extend({}, this._defaultUI, this.ui);

        // Extend default events hash
        this.events = _.extend({}, this._defaultEvents, this.events);

        Marionette.ItemView.prototype.constructor.apply(this, arguments);

        if (!this.model) { this.model = new Backbone.Model(); }

        // Allow for fields to be passed in when initializing
        if (this.options.fields){
            this.fields = this.options.fields;
        }

        // Clone rules so they can be bound to form
        if (!_.isEmpty(this.rules)){
            this.rules = _.mapObject(this.rules, _.clone);
        }

        // Array for storing rendered widgets, so they can be destroyed later
        this._widgetViews = new Backbone.ChildViewContainer();

        this.once('show', this.enablePlugins, this);
        this.once('show', function(){
            this.prepareFormState();
            this.on('render', this.prepareFormState, this);
        }, this);

        this.once('before:destroy', this.disablePlugins, this);
        this.once('before:destroy', this.destroyWidgets, this);
    },

    prepareFormState: function(){
        if (this._widgetViews.length) {
            this.destroyWidgets();
        }

        this.renderInputWidgets();
        this.renderInputGroupWidgets();

        this.deserializeForm();
    },
    // Data Serializers, Encoders, and Cleaners

    _encode: function(data, encodeDirection){
        var encodedData = _.mapObject(data, function(val, key){
            var fieldOptions = this.fields[key];

            if (!_.isString(fieldOptions) && !_.isObject(fieldOptions)) {
                throw new Error('Field options must be a string of the encoder type, or an object of options.');
            }

            var encoderName = 'Text', encoderOptions = {};

            if (_.isString(fieldOptions)) {
                encoderName = fieldOptions;
            } else if (_.isString(fieldOptions.encoder)) {
                encoderName = fieldOptions.encoder;
            } else if (_.isObject(fieldOptions.encoder))  {
                encoderName = fieldOptions.encoder.name || encoderName;
                encoderOptions = _.omit(fieldOptions.encoder, 'name');
            }

            var encoder = this.encoders[encoderName];

            if (encoder) {
                if (_.isArray(val) && encoderName != 'Array'){
                    // TODO: do things to each item
                    return val;
                }
                return encoder[encodeDirection] ? encoder[encodeDirection](val, encoderOptions) : val;
            }
            else if (encoderName !== 'Text') {
                throw new Error(encoderName + ' not found in encoders');
            }

            return val;
        }, this);

        return encodedData;
    },

    serializeForm: function(){
        this.triggerMethod('before:serialize');
        var keys = this._getFieldKeys({includeSquareBrackets: true});
        var data = Backbone.Syphon.serialize(this, {include: keys});
        return this._encode(data, 'encode');
    },

    deserializeForm: function(){
        // Only include values set in fields object
        var modelKeys = this._getFieldKeys();
        var inputElKeys = this._getFieldKeys({includeSquareBrackets: true});
        var data = _.pick(this.model.toJSON(), modelKeys);
        var decodedData = this._encode(data, 'decode');

        this.deserializing = true;

        Backbone.Syphon.deserialize(this, decodedData, {include: inputElKeys});

        this.deserializing = false;
        this.triggerMethod('deserialize');
    },
    _getFieldKeys: function(options){
        options = options || {};

        // Convert fields to an array of key
        return _.reduce(this.fields, function(keys, val, key){
            if (val.nested) {
                // if we are serializing, add the [] suffixed key
                if (options.includeSquareBrackets) {
                    keys.push(key + '[]');
                } else if (_.contains(['Select','Checkboxes'], val.nested)) {
                    keys.push(key);
                }
            } else {
                keys.push(key)
            }
            return keys;
        }, []);
    },

    _bundleRules: function(fieldOptions){
        // Bundle up rules into an array depending on how they were configured in fieldOptions
        var rules = fieldOptions.rules || [];

        if (_.isString(rules)) {
            rules = [rules];
        }
        else if (!_.isArray(rules)) {
            // Create array of rule objects
            rules = _.map(rules, function(val, key){
                var rule = {};
                rule[key] = val;
                return rule;
            });
        };

        return rules;
    },

    validate: function(data){
        if (!data){
            data = this.serializeForm();
        }

        var errors = {};

        _.each(this.fields, function(fieldOptions, field){
            var rules = this._bundleRules(fieldOptions);
            var value = data[field];

            // Automatically validate choices fields
            if (fieldOptions.choices && this._fieldChoices[field]) {
                var error = this.validateFieldRule(field, value, 'inChoices', {choices: this._fieldChoices[field]});

                if (error) {
                    _.extend(errors, error);
                }
            }

            _.each(rules, function(rule){
                var error = this.validateFieldRule(field, value, rule);

                if (error) {
                    _.extend(errors, error);
                }
            }, this);
        }, this);

        return errors;
    },

    validateFieldRule: function(field, value, rule, _ruleOptions){
        // If rule is an object, get first property for name/values (only one key/val set allowed)
        var ruleName = _.isObject(rule) ? _.first(_.keys(rule)) : rule;

        // If not required, not a local rule, and value is null/empty, do not validate.
        if (ruleName !== 'required' && !this.rules[ruleName] && !value) {
            return;
        }

        // Build options object to pass into each rule validator
        var ruleOptions = {
            inputEl: this.getInputEl(field),
            formView: this
        };
        if (_.isObject(rule)) {
            var options = _.first(_.values(rule));

            // If options is a string, use it as the error message
            if (_.isString(options)) {
                ruleOptions.message = options;
            }
            else {
                _.extend(ruleOptions, options);
            }
        }

        _.extend(ruleOptions, _ruleOptions);

        var ruleValidator = this.rules[ruleName] || this.validationRules[ruleName];

        // If rule is local to the form, bind the function to the form
        if (this.rules[ruleName]) {
            ruleValidator.test = _.bind(ruleValidator.test, this);
        }

        if (! ruleValidator) {
            throw new Error('Validation rule "'+ruleName+'" does not exist in global form rules or local form rules');
        }

        var ruleMessage = ruleOptions.message || ruleValidator.message || 'Not Valid';
        if (_.isFunction(ruleMessage)){
            ruleMessage = ruleMessage(ruleOptions);
        };
        var error = ruleValidator.test(value, ruleOptions) ? null : ruleMessage;

        if (error){
            var errorObj = {};
            errorObj[field] = error;
            return errorObj;
        }
        return null;
    },

    _cleanFormData: function(data){
        if (this.getOption('hasFiles')) {
            // Remove file fields from serialized data
            _.each(this.fields, function(field, fieldName){
                if (this.$('[name="'+fieldName+'"]').is('input[type="file"]')) {
                    data = _.omit(data, fieldName);
                }
            }, this);
        }

        return data;
    },

    _cleanIframeData: function(model){
        // Unset non-attribute values saved to model on an iframe submit
        _.each(['_method','csrfmiddlewaretoken'], function(fieldName){
            model.unset(fieldName, {silent: true});
        });
    },

    // Submit Handlers & Methods
    beforeFormSubmit: function (e) {
        var data = this.serializeForm();

        var errors = this.validate(data);
        var isValid = _.isEmpty(errors);

        if (isValid) {
            this.triggerMethod('submit', e, data);
        }
        else {
            this.triggerMethod('submit:fail', errors);
            e.stopImmediatePropagation();

            this.showErrors(errors);

            return false;
        }
    },

    submit: function() {
        this.ui.form.submit();
    },

    onSubmit: function(e, data){
        e.preventDefault();

        this.clearAlerts();
        this.clearErrors();
        this.disableSaving();

        data = this._cleanFormData(data);

        var options = {
            success: _.bind(function(model, response, options){
                if (this.getOption('hasFiles')){
                    this._cleanIframeData(model);
                }

                // Handle iframe POSTs that always return 'success'
                var responseData = response.responseJSON || response;
                if (responseData.status == 'error'){
                    this.handleSubmitError(responseData);
                    return;
                }

                this.handleSubmitSuccess();
                this.triggerMethod('submit:success');
            }, this),

            error: _.bind(function(model, response, options){
                if (this.getOption('hasFiles')){
                    this._cleanIframeData(model);
                }

                this.handleSubmitError(response.responseJSON);
                this.triggerMethod('submit:error')
            }, this)
        };

        if (this.getOption('hasFiles')) {
            // Add support for jquery-iframe-transport plugin
            options = _.extend(options, {
                iframe: true,
                files: this.$('form :file'),
                data: _.extend(data, {
                    csrfmiddlewaretoken: $.cookie('csrftoken'),
                    // Send method so server knows correct view to send request to
                    // (Server always uses POST when requesting through an iframe)
                    _method: this.model.isNew() ? 'POST' : 'PUT'
                })
            });
        }
        
        this.model.save(data, options);
    },

    onSubmitFail: function(errors){
        this.showErrors(errors);
    },

    disableSaving: function(){
        var defaultText = this.ui.saveButton.text();
        var savingText = this.ui.saveButton.data('saving-text') || defaultText;

        this.ui.saveButton
            .prop('disabled', true)
            .addClass('disabled').blur()
            .data('default-text', defaultText)
            .text(savingText);
    },

    enableSaving: function(){
        this.ui.saveButton
            .text(this.ui.saveButton.data('defaultText') || this.ui.saveButton.text())
            .removeClass('disabled btn-success')
            .prop('disabled', false);
    },



    // Response Handlers

    handleSubmitSuccess: function(){
        // Render success alert after save button
        var successText = this.ui.saveButton.data('success-text') || 'Saved!';
        this.showAlert({alertType: 'success', message: successText});

        this.enableSaving();

        // Update form input values with decoded data
        this.deserializeForm();
    },

    handleSubmitError: function(response){
        this.enableSaving();
        var errorAlert = {alertType: 'error', message: this.messages.saveError};

        if (response && response.status_code >= 400) {
            // Form has validation errors
            this.showErrors(response.errors);
            errorAlert.message = this.messages.validationError;
        }
    },



    // Error Handlers

    showErrors: function(errors){
        // Error in validation before submit

        this.clearErrors();
        this.clearAlerts();

        _.each(errors, function(errorMessage, fieldName){
            this.getFieldEl(fieldName)
                .addClass(this.errorClass)
                .find('.'+this.errorBlockClass).text(errorMessage);
        }, this);

        this.showAlert({alertType: 'error', message: this.messages.validationError}, {removeAlert: false});
    },

    getAlertTemplate: function(type){
        return this[type+'AlertTemplate'];
    },

    showAlert: function(alertObj, options){
        // Show success/fail alert next to save button

        var defaults  = {
            delayTime: 3000,
            removeAlert: true
        };
        options = _.extend(defaults, options);

        var alertTemplate = this.getAlertTemplate(alertObj.alertType);
        var alert = $(alertTemplate(alertObj));
        this.ui.alertContainer.append(alert);

        if (options.removeAlert) {
            // (Delay) fade out and remove alert
            _.delay(_.bind(alert.fadeOut, alert), options.delayTime, _.bind(alert.remove, alert));
        }
    },

    clearErrors: function(){
        this.$('.'+this.errorClass)
            .removeClass(this.errorClass)
            .find('.'+this.errorBlockClass).empty();
    },

    clearAlerts: function(){
        this.ui.alertContainer.empty();
    },



    // Widget/Plugin Rendering Methods

    enablePlugins: function(){
        this.$('[data-toggle="popover"]').popover();
        this.$('[data-toggle="tooltip"]').tooltip();


        var formActions = this.ui.formActions;

        this.$('[data-spy="affix"]').each(function(){
            $(this).affix({
                offset: {
                    top: (formActions.offset().top) - 10
                }
            });
        });
    },

    disablePlugins: function(){
        this.$('[data-toggle="popover"]').popover('destroy');
        this.$('[data-toggle="tooltip"]').tooltip('destroy');
        $(window).off('[data-spy="affix"]');
    },

    renderInputWidgets: function(){
        _.each(this.fields, function(fieldOptions, key){
            if (_.isObject(fieldOptions) && fieldOptions.widget) {

                var widgetName = _.isObject(fieldOptions.widget) ? fieldOptions.widget.name : fieldOptions.widget;

                var WidgetView = this.getOption('inputWidgetViews')[widgetName];

                var widgetEl = this.getFieldEl(key);

                if (WidgetView && widgetEl.length) {
                    var options = _.extend({
                        fieldOptions: _.omit(fieldOptions, 'widget'),
                        el: widgetEl
                    }, fieldOptions.widget.options);

                    var widgetView = new WidgetView(options);

                    // set this.fields[fieldName].widget = widgetView ???

                    widgetView.render();

                    // Store widgetView for later destruction
                    this._widgetViews.add(widgetView);

                    widgetEl.get(0)._widget = widgetView;
                }
                else if (!WidgetView) {
                    throw new Error(widgetName + 'widget not found in InputWidgetViews');
                }
            }
        }, this);
    },

    renderInputGroupWidgets: function(){
        _.each(this.inputGroups, _.bind(function(inputGroupOptions, key){
            var inputGroupName = _.isObject(inputGroupOptions) ? inputGroupOptions.name : inputGroupOptions;
            var WidgetView = this.getOption('inputGroupWidgetViews')[inputGroupName];

            if (WidgetView) {
                var widgetView = new WidgetView(_.extend({
                    el: this.getInputGroupEl(key),
                }, inputGroupOptions.options));

                widgetView.render();

                // Store widgetView for later destruction
                this._widgetViews.add(widgetView);
            }
            else {
                throw new Error(widgetName + 'widget not found in InputGroupWidgetViews');
            }
        }, this));
    },

    destroyWidgets: function(){
        this._widgetViews.each(function(view){
            this.remove(view);
            view.destroy();
        }, this._widgetViews);
    }

});

module.exports = FormView;
