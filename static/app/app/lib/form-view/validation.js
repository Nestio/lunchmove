var _ = require('underscore');
var numeral = require('numeral');
var moment = require('moment');

var regex = {
    email: /^(([^<>()\[\]\\.,;:\s@\"]+(\.[^<>()\[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    phoneNumber: /^(\d{1}[\s.-])?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/
};

module.exports = {
    required: {
        message: 'Required',
        test: function(val, options) {
            if (val === false || _.isNull(val) || _.isUndefined(val) || ((_.isString(val) || _.isArray(val)) && val.length === 0)) {
                return false;
            }
            return true;
        }
    },

    // Automatically triggered if "choices" field option is set
    inChoices: {
        message: 'Not a valid choice',
        test: function(val, options){
            if (!options.choices){
                throw new Error('inChoices: {choices: <choices_list>} must be passed into options in order to validate.')
            }
            
            var valArray = _.isArray(val) ? val : [val];

            //make object with property for every val in choices
            //coerce all vals to string to ensure proper comparison
            var choices = options.choices.reduce(function(memo, choice){
                memo[String(choice.val)] = true;
                return memo;
            }, {});
            
            //checks all vals against choices object. 
            //coerces vals in array to String to ensure proper comparison
            return _.every(valArray, function(item){
               return choices[String(item)];
            });
        }
    },
    
    number: {
        message: 'Invalid number',
        test: function(val, options){
            return _.isNumber(val);
        }
    },

    integer: {
        message: 'Invalid integer',
        test: function(val, options){
            return _.isNumber(val) && (val % 1 == 0);
        }
    },
    
    email: {
        message: 'Invalid email address',
        test: function(val, options){
            return regex.email.test(val);
        }
    },

    minLength: {
        message: function(options){
            return 'Min '+options.min+' characters.';
        },
        test: function(val, options){
            if (!options.min) {
                throw new Error('minLength: {min: <integer>} option must be passed into rule validator')
            }
            var length = _.isArray(val) ? val.length : String(val).length;
            return length >= options.min;
        }
    },

    maxLength: {
        message: function(options){
            return 'Max '+options.max+' characters.';
        },
        test: function(val, options){
            if (!options.max) {
                throw new Error('maxLength: {max: <integer>} option must be passed into rule validator')
            }
            var length = _.isArray(val) ? val.length : String(val).length;
            return length <= options.max;
        }
    },

    minNumber: {
        message: function(options){
            return 'Min value of '+options.min+' required.';
        },
        test: function(val, options){
            if (!_.has(options, 'min')) {
                throw new Error('minNumber: {min: <integer|decimal>} option must be passed into rule validator')
            }
            var numberVal = numeral(val).value();
            var minVal = numeral(options.min).value();
            return val >= minVal;
        }
    },


    // FileType Validation
    // -------------------
    // options:
    // - fileTypes (required): Array of accepted file extension strings. e.g. ['png','jpg','gif']
    // - inputEl (optional): jquery object of input el, or wrapping el for reading file or filename

    fileType: {
        message: 'Invalid file type',
        test: function(val, options){
            if (!options || !_.isObject(options)) {
                throw new Error('fileTypes option must be passed into validation rule.');
            }
            
            var fileTypes = options.fileTypes;

            // If val is not passed directly, get the filename from the input el
            if (!val && options.inputEl) {
                var inputEl = options.inputEl;
                // var el = $(options.el);

                if (!inputEl.is('input[type="file"]')) {
                    inputEl = inputEl.find('input[type="file"]');
                }

                // For IE
                if (!window.FileReader) {
                    val = [inputEl.val()];
                }
                else {
                    val = _.first(inputEl).files;
                }
            }

            // If val is a string, wrap it in an array to be compatible with validation check below.
            if (_.isString(val)) {
                val = [val];
            }

            if (val.length && options.fileTypes) {
                var fileTypes = _.invoke(options.fileTypes, 'toLowerCase');

                var isValid = _.every(val, function(file){
                    var filename = _.isString(file) ? file : file.name
                    var extension = _.last(filename.split('.')).toLowerCase();

                    return _.contains(fileTypes, extension);
                });

                return isValid;
            }

            // Can't detect a filetype, skip validation.
            return true;
        }
    },

    fileSize: {
        message: 'File size must be smaller than 10MB',
        test: function(val, options) {
            // return true;
            if (!options || !_.isObject(options)) {
                throw new Error('inputEl option must be passed into validation rule.');
            }

            // Skips validation if browser cannot read files
            if (!window.FileReader) {
                return true;
            }

            // Default limit to 10MB
            var sizeLimit = options.sizeLimit ? options.sizeLimit : 10485760;
            var file = _.first(options.inputEl);

            if (file.files) {
                var isValid = _.every(file.files, function(file){
                    return file.size <= sizeLimit;
                });

                return isValid;
            }

            return true;
        }
    },
    phoneNumber: {
        message: 'Enter a valid phone number',
        test: function(val, options){
            return regex.phoneNumber.test(val);
        }
    },
    
    date: {
        message: 'Enter a date in MM/DD/YYYY format',
        test: function(val){
            return moment(val, ['M/D/YYYY', 'MM/DD/YYYY', 'M-D-YYYY', 'MM-DD-YYYY', 'YYYY-MM-DD'], true).isValid();
        }
    }
};
