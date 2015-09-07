var SingleSelectAdapter = $.fn.select2.amd.require('select2/selection/single');
var SelectionSearch = $.fn.select2.amd.require('select2/selection/search')
var Utils = $.fn.select2.amd.require('select2/utils');

var channel = Backbone.Radio.channel('global')

function SpotSelection () {
    SpotSelection.__super__.constructor.apply(this, arguments);
};

Utils.Extend(SpotSelection, SingleSelectAdapter);

SpotSelection.prototype.render = function (params) {
    var $selection = SpotSelection.__super__.render.call(this);

     $selection.addClass('select2-selection--multiple');

     $selection.html(
       '<ul class="select2-selection__rendered"></ul>'
     );

     return $selection;
};

SpotSelection.prototype.bind = function (container, $container) {
    var self = this;
    this.$selection.on('click', function (evt) {
      self.trigger('toggle', {
        originalEvent: evt
      });
    });

    container.on('selection:update', function (params) {
        self.update(params.data);
    });

    container.on('focus', function () {

        self.clear();

    });
};


module.exports = Utils.Decorate(SpotSelection, SelectionSearch);
