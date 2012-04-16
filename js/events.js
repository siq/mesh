define([
    'path!mesh:class'
], function(Class) {
    return Class.extend({
        on: function(name, callback, context) {
            var events = this._eventCallbacks;
            if (!events) {
                events = this._eventCallbacks = {};
            }
            if (events[name] == null) {
                events[name] = [];
            }
            events[name].push([callback, context]);
            return this;
        },

        trigger: function(name) {
            var events = this._eventCallbacks, both = 2, callbacks, callback;
            if (events) {
                while (both--) {
                    callbacks = events[both ? name : 'all'];
                    if (callbacks) {
                        for (var i = 0, l = callbacks.length; i < l; i++) {
                            callback = callbacks[i];
                            if (callback) {
                                if (callback[0].apply(callback[1] || this, arguments) === false) {
                                    callback = null;
                                }
                            }
                            if (!callback) {
                                callbacks.splice(i, 1);
                                i--;
                                l--;
                            }
                        }
                    }
                }
            }
            return this;
        },

        off: function(name, callback) {
            var events = this._eventCallbacks, callbacks;
            if (!name) {
                this._eventCallbacks = {};
            } else if (events) {
                if (callback) {
                    callbacks = events[name];
                    if (callbacks) {
                        for (var i = 0, l = callbacks.length; i < l; i++) {
                            if (callbacks[i] && callbacks[i][0] === callback) {
                                callbacks[i] = null;
                                break;
                            }
                        }
                    }
                } else {
                    events[name] = [];
                }
            }
            return this;
        }
    });
});
