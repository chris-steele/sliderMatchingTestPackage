define(function(require) {
    var Slider = require('components/adapt-contrib-slider/js/adapt-contrib-slider');
    var Adapt = require('coreJS/adapt');

    var ConfidenceSlider = Slider.extend({

        /* override */
        setupQuestion: function() {
            if (this.model.get('_linkedToId')) {
                this._setupLinkedModel();
                this.listenTo(Adapt, "buttonsView:postRender", this.onButtonsRendered);
            }
            Slider.prototype.setupQuestion.apply(this, arguments);
        },

        /* override */
        disableQuestion: function() {
            this.setAllItemsEnabled(false);
            if (this.model.has('_linkedModel')) this.$('.buttons-action').a11y_cntrl_enabled(false);
        },

        /* override */
        enableQuestion: function() {
            this.setAllItemsEnabled(true);
            if (this.model.has('_linkedModel')) this.$('.buttons-action').a11y_cntrl_enabled(true);
        },

        /* override to indicate that all options are correct */
        setupModelItems: function() {
            var items = [];
            var start = this.model.get('_scaleStart');
            var end = this.model.get('_scaleEnd');

            for (var i = start; i <= end; i++) {
                items.push({value: i, selected: false, correct: true});
            }

            this.model.set('_items', items);
        },

        /* override */
        canSubmit: function() {
            return !this.model.has('_linkedModel') || this.model.get('_linkedModel').get('_isSubmitted');
        },

        /* override */
        showFeedback: function() {
            this.model.set('feedbackTitle', this.model.get('title'));
            this.model.set('feedbackMessage', this._getFeedbackString());

            Slider.prototype.showFeedback.apply(this, arguments);
        },

        _setupLinkedModel: function() {
            var linkedModel = Adapt.components.findWhere({_id: this.model.get('_linkedToId')});
            this.model.set({
                '_showNumber':linkedModel.get('_showNumber'),
                '_showScaleIndicator':linkedModel.get('_showScaleIndicator'),
                '_showScale':linkedModel.get('_showScale'),
                'labelStart':linkedModel.get('labelStart'),
                'labelEnd':linkedModel.get('labelEnd'),
                '_scaleStart':linkedModel.get('_scaleStart'),
                '_scaleEnd':linkedModel.get('_scaleEnd'),
            });
            this.model.set('_linkedModel', linkedModel);
        },

        _listenToLinkedModel: function() {
            this.listenTo(this.model.get('_linkedModel'), 'change:_selectedItem', this.onLinkedConfidenceChanged);
            this.listenTo(this.model.get('_linkedModel'), 'change:_isSubmitted', this.onLinkedSubmittedChanged);
        },

        _updateLinkedConfidenceIndicator: function() {
            var linkedSelectedItemIndex = this.getIndexFromValue(this.model.get('_linkedSelectedItem').value);

            this.$('.linked-confidence-bar').css({
                width: this.mapIndexToPixels(linkedSelectedItemIndex) + this.$slider.data('plugin_rangeslider').grabPos
            })
        },

        _getFeedbackString: function() {
            var feedbackSeparator = this.model.get('_feedback').feedbackSeparator,
                genericFeedback = this._getGenericFeedback(),
                comparisonFeedback = this.model.has('_linkedModel') ? this._getComparisonFeedback() : null,
                thresholdFeedback = this._getThresholdFeedback(),
                needsSeparator = false,
                feedbackString = "";

            if (genericFeedback) {
                feedbackString += genericFeedback;
                needsSeparator = true;
            }
            if (comparisonFeedback) {
                if(needsSeparator) feedbackString += feedbackSeparator;
                feedbackString += comparisonFeedback;
                needsSeparator = true;
            }
            if (thresholdFeedback) {
                if(needsSeparator) feedbackString += feedbackSeparator;
                feedbackString += thresholdFeedback;
            }

            return feedbackString;

        },

        _getGenericFeedback: function() {
            return this.model.get('_feedback').generic;
        },

        _getComparisonFeedback: function() {
            var confidence = this.model.get('_selectedItem').value,
                linkedConfidence = this.model.get('_linkedSelectedItem').value,
                feedbackString;
            if (linkedConfidence < confidence) {
                feedbackString = this.model.get('_feedback')._comparison.higher;
            } else if (linkedConfidence > confidence) {
                feedbackString = this.model.get('_feedback')._comparison.lower;
            } else {
                feedbackString = this.model.get('_feedback')._comparison.same;
            }
            return feedbackString;
        },

        _getThresholdFeedback: function() {
            if (!this.model.get('_feedback')._threshold) return;
            var confidenceValue = this.model.get('_selectedItem').value,
                appropriateFeedback = _.filter(this.model.get('_feedback')._threshold, function(feedbackItem) {
                    return confidenceValue >= feedbackItem._values._low && confidenceValue <= feedbackItem._values._high;
                }, this);

            return appropriateFeedback[0].text;
        },

        onQuestionRendered: function() {
            Slider.prototype.onQuestionRendered.apply(this, arguments);

            if (this.model.has('_linkedModel')) {
                this.$('.rangeslider').prepend($('<div class="linked-confidence-bar"/>'))
                this._listenToLinkedModel();
                if(this.model.get('_linkedModel').get('_isSubmitted')) {
                    this.onLinkedConfidenceChanged(this.model.get('_linkedModel'));
                } else {
                    this.model.set('_isEnabled', false);
                    //this.$('.linkedConfidenceSlider-body').html(this.model.get('disabledBody'));
                }
            }
        },

        onScreenSizeChanged: function() {
            Slider.prototype.onScreenSizeChanged.apply(this, arguments);

            if (this.model.has('_linkedModel') && this.model.has('_linkedSelectedItem')) {
                this._updateLinkedConfidenceIndicator();
            }
        },

        onButtonsRendered:function(buttonsView) {
            // necessary due to deferred ButtonsView::postRender
            if (!this.model.get('_isEnabled') && this.buttonsView == buttonsView) this.$('.buttons-action').a11y_cntrl_enabled(false);
        },

        onLinkedConfidenceChanged: function(linkedModel) {
            var linkedSelectedItem = linkedModel.get('_selectedItem');
            this.model.set('_linkedSelectedItem', linkedSelectedItem);
            this._updateLinkedConfidenceIndicator();
        },

        onLinkedSubmittedChanged: function(linkedModel) {
            if (linkedModel.get('_isSubmitted')) {
                this.model.set('_isEnabled', true);
            }
        }
    }, {
        template:'confidenceSlider'
    });
    
    Adapt.register("confidenceSlider", ConfidenceSlider);
    
    return ConfidenceSlider;
});