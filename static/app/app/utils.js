var ResultsAdapter = $.fn.select2.amd.require('select2/results');
var Utils = $.fn.select2.amd.require('select2/utils');

var channel = Backbone.Radio.channel('global')

function SpotResults () {
    SpotResults.__super__.constructor.apply(this, arguments);
};

Utils.Extend(SpotResults, ResultsAdapter);

SpotResults.prototype.displayMessage = function (params) {
    var self = this;
    if (params.message !== 'noResults') {
        SpotResults.__super__.displayMessage.call(this, params);
        return;
    }

    this.clear();
    this.hideLoading();

    var $message = $(
        '<li role="treeitem" class="select2-results__option">' +
        '<button class="btn btn-default">+New spot</button>' +
        '</li>'
    );

    this.$results.append($message);

    $message.on('click', function(){
        channel.command('show:modal:spot');
        self.trigger('close', {});
    });
};

module.exports = {
    SpotResults: SpotResults
};
