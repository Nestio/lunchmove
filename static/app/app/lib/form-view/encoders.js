var _ = require('underscore');
var moment = require('moment');
var numeral = require('numeral');


var regex = {
    currency: /^\$?\d+(,\d+)*(\.\d+)?$/,
    integer: /^\d+$/,
    decimal: /^\d+(,\d+)*(\.\d+)?$/
};

var Date = module.exports.Date = {
    encode: function(val, options) {
        var format = (options && options.encodedFormat) || 'YYYY-MM-DD';
        var data = moment(val, ['YYYY-MM-DD', 'M/D/YYYY', 'MM/DD/YYYY', 'M-D-YYYY', 'MM-DD-YYYY']);
    
        if (data.isValid()){
            return data.format(format);
        }
        return val;
    },
    decode: function(val, options) {
        options = options || {};
        var encodedFormat = options.encodedFormat || 'YYYY-MM-DD';
        var decodedFormat = options.decodedFormat || 'MM-DD-YYYY';
        var data = moment(val, encodedFormat);
        if (data.isValid()){
            return data.format(decodedFormat);
        }
        return val;
    }
};

var MoveTime = module.exports.MoveTime = {
    encode: function(val) {
        var wordMap = {
            'rightnow': 1,
            'immediately': 1,
            'now': 1,
            'soonish': 15,
            'soon': 15,
            'later': 60
        };

        var stringVal = wordMap[val.replace(/\W+/g, '').toLowerCase()];

        if (stringVal) {
            return moment().add(stringVal, 'm').format();
        }

        var numVal = val.replace(/([^:0-9])/g, '');

        if (!numVal || !numVal.match(/\d{1,2}:\d{2}/)){ return ''; }

        var split = numVal.split(':').map(function(num){return +num; });
        if (split[0] < 6) {
            split[0] += 12;
        }

        return moment(split.join(':'), 'hh:mm').format();
    },
    decode: function(val) {
        return val ? moment(val).format('h:mm') : '';
    }
};

var Currency = module.exports.Currency = {
    encode: function(val) {
        if (val && regex.currency.test(val)){
            return numeral().unformat(val);
        }
        return val;
    },
    decode: function(val) {
        if (!_.isNull(val) && !_.isUndefined(val)) {
            return numeral(val).format('0,0[.]00');   
        }
        return val;
    }
};

var Integer = module.exports.Integer = {
    encode: function(val) {
        if (regex.integer.test(val)) {
            return numeral(val).value();
        }
        return val;
    }
};

var Array = module.exports.Array = {
    encode: function(val){
        if (!val) {
            return [];
        }

        if (_.isEqual([null], val)) {
            return [];
        }
        
        return val;
    },
    decode: function(val) {
        return _.isArray(val) ? val : [val];
    }
};

var Boolean = module.exports.Boolean = {
    encode: function(val) {
        if (_.isBoolean(val)){
            return val;
        }
        else if (_.contains(['false','off','no'], String(val).toLowerCase())){
            return false;
        }
        else if (_.contains(['true','on','yes'], String(val).toLowerCase())){
            return true;
        }
        else {
            return !!val;
        }
    }
}

var Decimal = module.exports.Decimal = {
    encode: function(val){
        if (regex.decimal.test(val)) {
            return numeral(val).value();
        }
        
        return val;
    }
}
