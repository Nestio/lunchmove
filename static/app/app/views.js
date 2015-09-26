var fs = require('fs');
var LayoutTpl = fs.readFileSync(__dirname + '/templates/layout.html', 'utf8');
var YourMoveTpl = fs.readFileSync(__dirname + '/templates/your-move.html', 'utf8');
var EmptyTpl = fs.readFileSync(__dirname + '/templates/empty-moves.html', 'utf8');
var LunchMoveTpl = fs.readFileSync(__dirname + '/templates/lunch-move.html', 'utf8');
var LunchMovesTpl = fs.readFileSync(__dirname + '/templates/lunch-moves.html', 'utf8');
var LoadingTpl = fs.readFileSync(__dirname + '/templates/loading.html', 'utf8');
var MoveFormTpl = fs.readFileSync(__dirname + '/templates/lunch-move-form.html', 'utf8');
var EmptyQueryTpl = fs.readFileSync(__dirname + '/templates/empty-query.html', 'utf8');
var Spot = require('app/entities').Spot;

var channel = Backbone.Radio.channel('global');

var LunchMoveView = Marionette.ItemView.extend({
    modelEvents: {
        'change:moves': 'render'
    },
    edit: function(e){
        Backbone.history.navigate('', {trigger: true});
        e.preventDefault();
    },
    events: {
        'click @ui.addMove': 'addMove'
    },
    ui: {
        'addMove': '[data-ui="addMove"]'
    },
    addMove: function(){
        var view = this;
        var ownMove = channel.request('entities:move')
        ownMove.save({
            spot: this.model.id
        }).done(function(){
            var moves = channel.request('entities:moves');
            moves.add(ownMove, {merge: true});
            ownMove.trigger('update');
        });
    },
    className: 'row move-row',
    template: _.template(LunchMoveTpl),
    templateHelpers: function(){
        var ownMove =  channel.request('entities:move');
        return {
            spotName: channel.request('entities:spots').get(this.model.id).get('name'),
            isOwnMove: function(move){
                return ownMove.id === move.id;
            },
            hasOwnMove: !!this.model.get('moves').get(ownMove.id)
        }
    }
});

var EmptyView = Marionette.ItemView.extend({
    className: 'row',
    template: _.template(EmptyTpl)
});

var LunchMovesView = Marionette.CompositeView.extend({
    className: 'lunch-moves-list',
    modelEvents: {
        'update': 'recalculateMoves'
    },
    template: _.template(LunchMovesTpl),
    childView: LunchMoveView,
    emptyView: EmptyView,
    childViewContainer: '.moves-container',
    recalculateMoves: function(){
        var previousSpot;

        this.collection.each(function(model){
            model.get('moves').each(function(move){
                if (move.id === this.model.id) {
                    previousSpot = model.id;
                }
            }, this);
        }, this);

        if (previousSpot) {
            var previousModel = this.collection.get(previousSpot);
            previousModel.get('moves').remove(this.model.id);
            previousModel.trigger('change:moves');
        }

        var newModel = this.collection.get(this.model.get('spot'));
        newModel.get('moves').add(this.model);
        newModel.trigger('change:moves');
    }
});

var MoveFormView = Marionette.ItemView.extend({
    tagName: 'header',
    className: 'navbar navbar-static-top main-header',
    attributes: {
        id: 'header'
    },
    template: _.template(MoveFormTpl),
    ui: {
        'form': 'form',
        'spot': '[name="spot"]',
        'spotId': '[name="spot_id"]',
        'time': '[name="time"]',
        'submit': '[type="submit"]'
    },
    events: {
        'click': 'focusForm',
        'typeahead:select @ui.spot': 'onTypeaheadSelect',
        'click [data-action="addSpot"]': 'addSpot',
        'submit @ui.form': 'onFormSubmit',
        'blur @ui.spot': 'onSpotBlur',
        'change @ui.form': 'toggleSaveButton',
        'input input[type="text"]': 'toggleSaveButton'
    },
    initialize: function(){
        this.listenTo(channel, 'form:focus', this.formFocus);
        this.listenTo(channel, 'form:blur', this.formBlur);
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
        if (!this.model.has('spot')){
            this.formFocus();
        }
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
        var isComplete = _.has(data, 'time') && _.has(data, 'spot')
        this.ui.submit.toggleClass('disabled', !isComplete);
    },
    onFormSubmit: function(e){
        e.preventDefault();
        var data = this.serializeForm();
        if (!_.isEmpty(data)){
            this.model.save(data, {
                success: _.bind(function(){
                    this.blurForm();
                    this.model.trigger('update');
                }, this)
            });
        }
    },
    parseTime: function(){
        var string = this.ui.time.val();
        if (!string || !string.match(/\d{1,2}:\d{2}/)){ return ''; }

        var split = string.split(':').map(function(num){return +num; });
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
    },
    focusForm: function(){
        this.$el.addClass('focused');
    },
    blurForm: function(){
        this.$el.removeClass('focused');
    }
});

var YourMoveView = Marionette.ItemView.extend({
    template: _.template(YourMoveTpl),
    templateHelpers: function(){
        var spots = channel.request('entities:spots');
        return {
            spotName: this.model.has('spot') ? spots.get(this.model.get('spot')).get('name') : ''
        }
    }
});


var LayoutView = Marionette.LayoutView.extend({
    template: _.template(LayoutTpl),
    regions: {
        'yourMove': '[data-region="yourMove"]',
        'moves': '[data-region="moves"]'
    },
    onShow: function(){
        this.showChildView('yourMove', new YourMoveView({
            model: this.model
        }));

        this.showChildView('moves', new LunchMovesView({
            model: this.model,
            collection: this.collection
        }));
    }
});


var LoadingView = Marionette.ItemView.extend({
    template: _.template(LoadingTpl)
});



module.exports = {
    LunchMovesView: LunchMovesView,
    LoadingView: LoadingView,
    MoveFormView: MoveFormView,
    LayoutView: LayoutView
}
