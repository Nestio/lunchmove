var fs = require('fs');
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
    template: _.template(MoveFormTpl),
    ui: {
        'form': 'form',
        'spot': '[name="spot"]',
        'spotId': '[name="spot_id"]',
        'user': '[name="user"]'
    },
    events: {
        'typeahead:select @ui.spot': 'onTypeaheadSelect',
        'click [data-action="addSpot"]': 'addSpot',
        'change @ui.form': 'onFormChange',
        'blur @ui.spot': 'onSpotBlur',
        'keydown input': function(e){
            if (e.keyCode === 13) {
                e.preventDefault();
                $(e.currentTarget).blur();
            }
        }
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
        var user = this.model.get('user');
        if (user) {
            this.ui.user.val(user);
        }
        var spot = this.model.get('spot')
        if (spot) {
            var spotName = channel.request('entities:spots').get(spot).get('name');
            this.ui.spot.typeahead('val', spotName);
        }
    },
    onShow: function(){
        this.renderTypeahead();
        this.deserializeModel();
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
    onFormChange: function(){
        if (this._disableSaving) {
            return;
        }

        var spotId = this.ui.spotId.val();
        var user = this.ui.user.val();

        if (spotId && user) {
            this._disableSaving = true;

            this.model.save({
                spot: spotId,
                user: user
            }, {
                success: function(){
                    Backbone.history.navigate('/moves', {trigger: true});
                }
            });
        }
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

var HeaderView = Marionette.ItemView.extend({
    el: '#header',
    events: {
        'click a': 'navigate'
    },
    template: false,
    activate: function(methodName){
        this.$('.navbar-nav li').removeClass('active');
        this.$('[data-action="' + methodName + '"]').addClass('active');
    },
    navigate: function(e){
        e.preventDefault();
        var route = $(e.currentTarget).attr('href').replace('../', '');
        Backbone.history.navigate(route, {trigger: true});
    }
});

var LoadingView = Marionette.ItemView.extend({
    template: _.template(LoadingTpl)
});



module.exports = {
    LunchMovesView: LunchMovesView,
    LoadingView: LoadingView,
    MoveFormView: MoveFormView,
    HeaderView: HeaderView
}
