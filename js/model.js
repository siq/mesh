define([
    'vendor/underscore',
    'vendor/jquery',
    'bedrock/class',
    'bedrock/events',
    './fields',
    './collection'
], function(_, $, Class, Eventable, fields, collection) {
    var isArray = _.isArray, isBoolean = _.isBoolean, isEmpty = _.isEmpty,
        isEqual = _.isEqual, isString = _.isString;

    var Manager = Class.extend({
        init: function(model) {
            this.cache = [];
            this.model = model;
            this.models = {};
        },

        associate: function(model, id) {
            if (id == null) {
                id = model.id || model.cid;
            }
            if (this.models[id]) {
                if (this.models[id] !== model) {
                    var name = this.model.prototype.__name__;
                    throw new Error('attempt to associate duplicate ' + name + ', id = ' + id);
                }
            } else {
                this.models[id] = model;
            }
            return this;
        },

        clear: function() {
            this.cache = [];
            this.models = {};
            return this;
        },

        collection: function(query, independent) {
            var cache = this.cache, instance, cached;
            if (independent || !query) {
                return collection.Collection(this, query);
            }

            for (var i = 0, l = cache.length; i < l; i++) {
                cached = cache[i];
                if (isEqual(cached.query, query)) {
                    return cached;
                }
            }

            instance = collection.Collection(this, query);
            cache.push(instance);
            return instance;
        },

        dissociate: function(model) {
            if (model.id) {
                delete this.models[model.id];
            }
            if (model.cid) {
                delete this.models[model.cid];
            }
            return this;
        },

        get: function(id) {
            var model = this.models[id];
            if (!model) {
                model = this.instantiate({id: id});
            }
            return model;
        },

        instantiate: function(model, loaded) {
            var instance;
            if (model.id) {
                instance = this.models[model.id];
                if (instance) {
                    instance.set(model);
                    if (loaded) {
                        instance._loaded = true;
                    }
                    return instance;
                }
            }
            return this.model(model, this, loaded);
        },

        load: function(id, params) {
            if (_.isNumber(id) || isString(id)) {
                return this.get(id).refresh(params, true);
            } else {
                return this.collection(id).load();
            }
        },

        notify: function(model, event) {
            if (model.id && this.models[model.id]) {
                this.trigger('change', this, model);
            }
        },

        query: function(params, request) {
            return collection.Query(this, params, request);
        }
    }, {mixins: [Eventable]});

    var Model = Class.extend({
        __new__: function(constructor, base, prototype) {
            constructor.manager = function() {
                return Manager(constructor);
            };
            constructor.models = prototype.__models__ = constructor.manager();
            constructor.collection = function(params, independent) {
                return constructor.models.collection(params, independent);
            };
            constructor.query = function(params, request) {
                return constructor.models.query(params, request);
            };
        },

        __models__: null,
        __name__: null,
        __requests__: null,
        __schema__: null,

        init: function(attrs, manager, loaded) {
            this.cid = null;
            this.id = null;
            this._changes = {};
            this._loaded = loaded;
            this._manager = manager || this.__models__;
            if (attrs != null) {
                this.set(attrs, true, true);
            }
            if (this.id == null) {
                this.cid = _.uniqueId('_');
            }
            this._manager.associate(this);
        },

        construct: function() {},

        destroy: function(params) {
            var self = this;
            if (self.id == null) {
                self._manager.dissociate(self);
                self.trigger('destroy', self);
                return $.Deferred().resolve();
            }

            return self._initiateRequest('delete', params).done(function(response) {
                self._manager.dissociate(self);
                self.trigger('destroy', self, response);
                return response;
            });
        },

        has: function(attr) {
            var value = this[attr];
            return (value !== undefined && value !== null);
        },

        html: function(attr, fallback) {
            var value = this[attr];
            if (value == null) {
                value = (fallback || '');
            }
            return _.escape('' + value);
        },

        refresh: function(params, conditional) {
            var self = this;
            if (isBoolean(params)) {
                conditional = params;
                params = null;
            } else if (params != null) {
                conditional = false;
            }

            if (self.id == null || (self._loaded && conditional && isEmpty(self._changes))) {
                return $.Deferred().resolve(self);
            }

            return self._initiateRequest('get', params).pipe(function(data) {
                self._changes = {};
                self._loaded = true;
                self.set(data, false, true);
                return self;
            });
        },

        save: function(params, include_all_attrs) {
            // var self = this, creating = (this.id == null), changes = this._changes,
            var self = this, creating = !this._loaded, changes = this._changes,
                request, subject, data;
            request = self._getRequest(creating ? 'create' : 'update');

            subject = self;
            if (!creating && !include_all_attrs) {
                subject = {};
                for (name in changes) {
                    if (changes.hasOwnProperty(name)) {
                        subject[name] = self[name];
                    }
                }
            }

            data = request.extract(subject);
            if (params != null) {
                $.extend(true, data, params);
            }
            if (isEmpty(data)) {
                return $.Deferred().resolve(self);
            }

            return request.initiate(self.id, data).pipe(function(data) {
                if (creating) {
                    self._manager.associate(self, data.id);
                }
                self._changes = {};
                self.set(data, false, true);
                self._loaded = true;
                return self;
            });
        },

        set: function(attr, value, silent, unchanged) {
            var attrs, changing, changed, name, currentValue;
            if (attr != null) {
                if (isString(attr)) {
                    attrs = {};
                    attrs[attr] = value;
                } else {
                    unchanged = silent;
                    silent = value;
                    attrs = attr;
                }
            } else {
                return this;
            }

            changing = this._currentlyChanging;
            this._currentlyChanging = true;

            changed = {};
            for (name in attrs) {
                if (attrs.hasOwnProperty(name)) {
                    currentValue = this[name];
                    value = attrs[name];
                    if (!isEqual(value, currentValue)) {
                        this[name] = value;
                        changed[name] = true;
                        if (!unchanged) {
                            this._changes[name] = true;
                        }
                    }
                }
            }

            if (!changing) {
                if (!isEmpty(changed)) {
                    this.construct();
                    if (!silent) {
                        this.trigger('change', this, changed);
                        this._manager.notify(this, 'change');
                    }
                }
                this._currentlyChanging = false;
            }
            return this;
        },

        _getRequest: function(name) {
            return this.__requests__[name];
        },

        _initiateRequest: function(name, params) {
            return this._getRequest(name).initiate(this.id, params);
        }
    }, {mixins: [Eventable]});

    return {
        Manager: Manager,
        Model: Model
    };
});
