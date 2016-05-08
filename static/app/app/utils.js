import moment from 'moment';

export function parseTimeInput(val) {
    const wordMap = {
        'rightnow': 1,
        'immediately': 1,
        'now': 1,
        'soonish': 15,
        'soon': 15,
        'later': 60
    };

    let stringVal = wordMap[val.replace(/\W+/g, '').toLowerCase()];

    if (stringVal) {
        return moment().add(stringVal, 'm').format('hh:mm');
    }

    let numVal = val.replace(/([^:0-9])/g, '');

    if (!numVal || !numVal.match(/\d{1,2}:\d{2}/)){ return ''; }

    let split = numVal.split(':').map(function(num){return +num; });
    if (split[0] < 6) {
        split[0] += 12;
    }
    
    return split.join(':');
}
