define([
    'vendor/underscore',
    'vendor/jquery',
    'bedrock/class',
    'bedrock/events',
    'bedrock/assettable',
    './fields',
    './collection'

], function(_, $, Class, Eventable, asSettable, fields, collection) {
    var ret,
        $models = $('head script[type="application/json"][data-models=true]'),
        isArray = _.isArray, isBoolean = _.isBoolean, isEmpty = _.isEmpty,
        isEqual = _.isEqual, isString = _.isString;


    var Manager = Class.extend({
        init: function(model) {
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
            this.models = {};
            this.off();
            return this;
        },

        collection: function(query, independent) {
            return collection.Collection(this, query);
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
                return this.get(id).refresh(params, {conditional: true});
            } else {
                return this.collection(id).load();
            }
        },

        notify: function(model, eventName) {
            var rest = Array.prototype.slice.call(arguments, 2), args;
            if (model.id && this.models[model.id]) {
                this.trigger.apply(this, [eventName, this, model].concat(rest));
            }
            return this;
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

        defaults: {
            pollInterval: 1000,
            pollTimeout: 60000
        },

        init: function(attrs, manager, loaded, options) {
            this.cid = null;
            this.id = null;
            this._changes = {};
            this._loaded = loaded;
            this._manager = manager || this.__models__;
            if (attrs != null) {
                this.set(attrs, {silent: true, unchanged: true});
            }
            if (this.id == null) {
                this.cid = _.uniqueId('_');
            }
            this._options = $.extend(true, this.defaults, options);
            this._manager.associate(this);
            this._httpStatus = null;
            this._inFlight = {refresh: [], save: [], destroy: []};
        },

        construct: function() {},

        getStatus: function() {
            return this._httpStatus;
        },

        destroy: function() {
            var self = this, inFlight = self._inFlight.destroy, dfd;

            if (inFlight.length &&
                    _.last(inFlight).promise.state() !== 'rejected') {
                return _.last(inFlight).promise;
            }

            if (self.get('id') == null) {
                self._manager.notify(self, 'destroy').dissociate(self);
                self.trigger('destroy', self);
                return $.Deferred().resolve();
            }

            inFlight.push({dfd: dfd = self._initiateRequest('delete')});

            return _.last(inFlight).promise = dfd.done(function(response) {
                delete self._loaded;
                self._manager.notify(self, 'destroy').dissociate(self);
                self.del('id', {unchanged: true});
                self.trigger('destroy', self, response);
                return response;
            });
        },

        html: function(attr, fallback) {
            var value = this[attr];
            if (value == null) {
                value = (fallback || '');
            }
            return _.escape('' + value);
        },

        load: function() {
            return this.refresh(null, {conditional: true});
        },

        refresh: function(params, options) {
            var dfd, self = this, conditional = options && options.conditional,
                inFlight = self._inFlight.refresh;

            if (self.get('id') == null) {
                return $.Deferred().reject(self);
            }

            if (conditional && self._loaded) {
                return inFlight.length?
                    _.last(inFlight).promise : $.Deferred().resolve(self);
            }

            inFlight.push({dfd: dfd = self._initiateRequest('get', params)});

            return _.last(inFlight).promise = dfd.pipe(function(data) {
                var i = 0, prevDfd, inFlight = self._inFlight.refresh;
                self._loaded = true;
                self.set(data, {unchanged: true, noclobber: true});
                while ((prevDfd = inFlight[i++].dfd) !== dfd) {
                    prevDfd.resolve(data);
                }
                self._inFlight.refresh = inFlight.slice(i - 1);
                return self;
            });
        },

        poll: function(params) {
            var self = this,
                interval = params.interval != null? params.interval : this._options.pollInterval,
                deferred = $.Deferred(),
                startTime = new Date();

            if (!params.timeout) {
                params.timeout = self._options.pollTimeout;
            }
            self._poller(params, interval, deferred, startTime);
            return deferred;
        },

        _poller: function(params, interval, deferred, startTime) {
            var self = this;
            // check of request timeout
            if (new Date() - startTime > params.timeout) {
                // TODO: need to pass some error code or something in the reject call 
                // to indicate request timeout
                deferred.reject();
                return;
            }
            self.refresh().then(function(result, xhr) {
                // Check to verify if the condition is true or not.
                if (typeof params['while'] !== 'undefined') {
                    if (params['while'](result)) {
                        _.delay(_.bind(self._poller, self), interval, params, interval, deferred, startTime);
                    } else {
                        deferred.resolve(result, xhr);
                    }
                } else if (typeof params['until'] !== 'undefined') {
                    if (params['until'](result)) {
                        deferred.resolve(result, xhr);
                    } else {
                        _.delay(_.bind(self._poller, self), interval, params, interval, deferred, startTime);
                    }
                }
            }, function(error, xhr) {
                deferred.reject(error, xhr);
            });
        },

        save: function() {
            var request, subject, data, name, dfd, self = this,
                args = Array.prototype.slice(0),
                changes = self._changes,
                inFlight = self._inFlight.save,
                creating = !self._loaded && inFlight.length === 0;

            request = self._getRequest(creating ? 'create' : 'update');

            subject = self;

            if (!creating) {
                subject = {};
                var i, l, changeArray = [], isBaseProp, thisChange;
                for (name in changes) {
                    if (changes.hasOwnProperty(name)) {
                        changeArray.push(name);
                    }
                }
                for (name in changes) {
                    if (changes.hasOwnProperty(name)) {
                        isBaseProp = false;
                        for (i = 0, l = changeArray.length; i < l; i++) {
                            thisChange = changeArray[i];
                            if (thisChange.length > name.length && thisChange.slice(0, name.length) === name) {
                                isBaseProp = true;
                                break;
                            }
                        }
                        if (!isBaseProp) {
                            subject[name] = self.get(name);
                        }
                    }
                }
            }

            data = request.extract(subject);

            if (isEmpty(data)) {
                return inFlight.length?
                    _.last(inFlight).promise : $.Deferred().resolve(self);
            }

            // handle the case where there's an in-flight 'create' call, but we
            // can't make the 'update' call until we've got the ID the server
            // gave us from the 'create'
            if (!creating && !self._loaded) {
                return _.last(inFlight).promise.then(function() {
                    return self.save.apply(self, args);
                });
            }

            inFlight.push({
                dfd: dfd = request.initiate(self.get('id'), data),
                changes: changes
            });

            self._changes = {};

            // if the request failed, re-list those properties as changed
            dfd.fail(function() { _.extend(self._changes, changes); });

            return _.last(inFlight).promise = dfd.pipe(function(data, xhr) {
                var inFlight = self._inFlight.save,
                    idx = _.indexOf(_.pluck(inFlight, 'dfd'), dfd);
                if (creating) {
                    self._manager.associate(self, data.id);
                }
                self._inFlight.save =_.reduce(inFlight,
                    function(inFlight, o, i) {
                        if (i >= idx || o.promise.state() === 'pending') {
                            inFlight.push(o);
                        }
                        return inFlight;
                    }, []);
                self._inFlight.destroy = [];
                self.set(data, {unchanged: true});
                self._loaded = true;
                self._httpStatus = request.STATUS_CODES[xhr.status];
                return self;
            });
        },

        onChange: function(changed, opts) {
            if (!opts.unchanged) {
                _.extend(this._changes, changed);
            }
            this.construct({silent: true});
            this._manager.notify(this, 'change', changed);
            this.trigger('change', this, changed);
        },

        validate: function() {
            var request = this._getRequest(this._loaded? 'update' : 'create'),
                dfd = $.Deferred();
            try {
                request.validate(request.extract(this));
            } catch (e) {
                dfd.reject(e);
            }
            if (dfd.state() === 'pending') {
                dfd.resolve();
            }
            return dfd;
        },

        _getRequest: function(name) {
            return this.__requests__[name];
        },

        _initiateRequest: function(name, params) {
            return this._getRequest(name).initiate(this.get('id'), params);
        }
    }, {mixins: [Eventable]});

    asSettable.call(Model.prototype, {
        onChange: 'onChange',
        areEqual: _.isEqual,
        propName: null
    });

    Model.prototype._set = _.wrap(Model.prototype._set,
        function(f, newProps, opts) {
            var args = Array.prototype.slice.call(arguments, 2),
                _changes = this._changes,
                props = opts.noclobber?
                    _.reduce(newProps, function(memo, val, key) {
                        if (!_changes.hasOwnProperty(key)) {
                            memo[key] = val;
                        }
                        return memo;
                    }, {}) :
                    newProps;

            return f.apply(this, [props].concat(args));
        });

    ret = {Manager: Manager, Model: Model};

    if ($models.length) {
        ret.preloaded = JSON.parse($models.html());
    }

    return ret;
});
