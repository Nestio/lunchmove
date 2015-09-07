var DropdownAdapter = $.fn.select2.amd.require('select2/dropdown');
var AttachContainer = $.fn.select2.amd.require('select2/dropdown/attachContainer');
var Utils = $.fn.select2.amd.require('select2/utils');

function SpotDropdown () {
    SpotDropdown.__super__.constructor.apply(this, arguments);
};

Utils.Extend(SpotDropdown, DropdownAdapter);

SpotDropdown.prototype.bind = function () {};

module.exports = Utils.Decorate(SpotDropdown, AttachContainer);
