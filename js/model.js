define([
    'vendor/underscore',
    'vendor/jquery',
    'bedrock/class',
    'bedrock/events',
    'bedrock/mixins/assettable',
    './fields',
    './collection'

], function(_, $, Class, Eventable, asSettable, fields, collection) {
    var ret,
        $models = $('head script[type="application/json"][data-models=true]'),
        isArray = _.isArray, isBoolean = _.isBoolean, isEmpty = _.isEmpty,
        isEqual = _.isEqual, isString = _.isString,
        SettableObject = Class.extend();

    asSettable.call(SettableObject.prototype, {propName: null});

    // if a nested property is changed like 'foo.bar', then the chnanges object
    // will look like:
    //
    //     {foo: true, 'foo.bar': true}
    //
    // since model change tracking is at the property granularity, we generally
    // want something with the 'foo' removed like this:
    //
    //     {'foo.bar': true}
    //
    // this function makes that translation
    function removeBaseProperties(o) {
        var result = {}, isBaseProp, name, changeArray = _.keys(o);
        if (!o) {
            return o;
        }
        for (name in o) {
            if (o.hasOwnProperty(name)) {
                isBaseProp = !!_.find(changeArray, function(k) {
                    return  k.length > name.length &&
                            k.slice(0, name.length) === name;
                });
                if (!isBaseProp) {
                    result[name] = true;
                }
            }
        }
        return result;
    }

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

        instantiate: function(model, loaded, noclobber) {
            var instance;
            if (model.id) {
                instance = this.models[model.id];
                if (instance) {
                    instance.set(model, {noclobber: noclobber});
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
        },

        redefine: function(redefinitions) {
            var model = this.model.prototype, schema, requests;

            schema = {};
            for (var name in model.__schema__) {
                if (model.__schema__.hasOwnProperty(name)) {
                    if (redefinitions.hasOwnProperty(name) && redefinitions[name]) {
                        schema[name] = redefinitions[name];
                    } else {
                        schema[name] = model.__schema__[name];
                    }
                }
            }

            requests = {};
            for (var name in model.__requests__) {
                if (model.__requests__.hasOwnProperty(name)) {
                    requests[name] = model.__requests__[name].redefine(redefinitions);
                }
            }

            return Model.extend({
                __bundle__: model.__bundle__,
                __composite_key__: model.__composite_key__,
                __name__: model.__name__,
                __requests__: requests,
                __schema__: schema
            });
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
            this._loaded = loaded;
            this._changes = {};
            this._inFlight = {refresh: [], save: [], destroy: []};
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
            var dfd, self = this,
                // the 'conditional' paramter makes it so that if the model has
                // already been loaded, this will just return an already-
                // resolved dfd
                conditional = options && options.conditional,
                inFlight = self._inFlight.refresh;

            if (self.get('id') == null) {
                return $.Deferred().reject(
                        [[{token: 'cannot-refresh-without-id'}], null]);
            }

            if (conditional) {
                if (inFlight && inFlight.length) {
                    return _.last(inFlight).promise;
                }
                if (self._loaded) {
                    $.Deferred().resolve(self);
                }
            }

            inFlight.push({dfd: dfd = self._initiateRequest('get', params)});

            _.last(inFlight).promise = dfd.pipe(function(data) {
                var i = 0, prevDfd, inFlight = self._inFlight.refresh;
                self._loaded = true;
                self.set(data, {unchanged: true, noclobber: true});
                while ((prevDfd = inFlight[i++].dfd) !== dfd) {
                    prevDfd.resolve(data);
                }
                return self;
            });

            _.last(inFlight).promise.always(function() {
                var previous = self._inFlight.refresh,
                    inFlight = self._inFlight.refresh = [],
                    req, i, l = previous.length;
                for (i = 0; i < l; i++) {
                    req = previous[i];
                    if (i + 1 >= l || req.dfd.state() === 'pending') {
                        inFlight.push(req);
                    }
                }
            });

            return _.last(inFlight).promise;
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
                deferred.reject([[{
                    message: 'a timeout occurred', token: 'timeout'
                }]]);
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

        save: function(params) {
            var changeArray, isBaseProp, request, subject, data, name, dfd,
                cornerCaseDfd,
                self = this,
                args = Array.prototype.slice(0),
                changes = self._changes,
                inFlight = self._inFlight.save,
                creating = self._creating(),
                requestName = self._chooseRequest(),
                all = requestName === 'put' || params && params.all;

            request = self._getRequest(requestName);

            subject = self;

            // .save({all: true}) causes save to send every paramter,
            // regardless of whether it changed
            if (!creating && !all) {
                subject = SettableObject();
                for (name in changes) {
                    if (changes.hasOwnProperty(name)) {
                        subject.set(name, self.get(name));
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
                cornerCaseDfd = $.Deferred();
                _.last(inFlight).promise.always(function() {
                    self.save.apply(self, args).then(function() {
                        cornerCaseDfd.resolve.apply(cornerCaseDfd, arguments);
                    }, function() {
                        cornerCaseDfd.reject.apply(cornerCaseDfd, arguments);
                    });
                });
                return cornerCaseDfd.promise();
            }

            inFlight.push({
                dfd: dfd = request.initiate(self.get('id'), data),
                changes: changes
            });

            self._changes = {};

            _.last(inFlight).promise = dfd.pipe(function(data, xhr) {
                if (creating) {
                    self._manager.associate(self, data.id);
                    self._manager.notify(self, 'add');
                }
                self._inFlight.destroy = [];
                self.set(data, {unchanged: true});
                self._loaded = true;
                self._httpStatus = request.STATUS_CODES[xhr.status];
                return self;
            });

            // remove inFlight changes after they have been resolved
            // or refresh will not update as expected
            _.last(inFlight).promise.then(function(m) {
                for (i = 0, l = inFlight.length; i < l; i++) {
                    if (inFlight[i].promise.state() === 'resolved') {
                        inFlight[i].changes = {};
                    }
                }
            });

            _.last(inFlight).promise.always(function() {
                var inFlight = self._inFlight.save,
                    idx = _.indexOf(_.pluck(inFlight, 'dfd'), dfd);
                self._inFlight.save =_.reduce(inFlight,
                    function(inFlight, o, i) {
                        if (i >= idx || o.promise.state() === 'pending') {
                            inFlight.push(o);
                        }
                        return inFlight;
                    }, []);
            });

            // if the request failed, re-list those properties as changed
            _.last(inFlight).promise.fail(function() {
                var stillInFlight, otherInFlight,
                    otherInFlights = self._inFlight.save;
                for (var inFlightChange in changes) {
                    if (changes.hasOwnProperty(inFlightChange)) {
                        stillInFlight = false;
                        for (var i = 0, l = otherInFlights.length; i < l; i++) {
                            otherInFlight = otherInFlights[i];
                            if (otherInFlight.dfd !== dfd &&
                                otherInFlight.changes[inFlightChange]) {
                                stillInFlight = true;
                            }
                        }
                        if (!stillInFlight) {
                            self._changes[inFlightChange] = true;
                        }
                    }
                }
            });

            return _.last(inFlight).promise;
        },

        onChange: function(changed, opts) {
            if (!opts.unchanged) {
                _.extend(this._changes, removeBaseProperties(changed));
            }
            this._lastSettableChanges = changed;
            this.construct({silent: true});
            this._manager.notify(this, 'change', changed);
            this.trigger('change', this, changed);
        },

        onSettableError: function(errors, opts) {
            this._lastSettableError = errors;
        },

        // validate() can be called one of 3 ways:
        //
        // model.validate()
        //
        //  -> validates everything based on either the 'create' or 'update'
        //     request schema (determined by Model#_getRequest)
        //
        // model.validate('propName')
        //
        //  -> validates a single property
        //
        // model.validate(['prop1', 'prop2'])
        //
        //  -> validates the props listed
        //
        validate: function(which) {
            var i, l, prop, field, errors, request, self = this,
                dfd = $.Deferred();
            if (!which) {
                request = self._getRequest(self._loaded? 'update' : 'create');
                try {
                    request.validate(request.extract(self), null, {
                        validateField: function(fieldName, value) {
                            self._validateOne(fieldName, value);
                        }
                    });
                } catch (e) {
                    dfd.reject(e);
                }
            } else {
                which = isString(which)? [which] : which;
                for (i = 0, l = which.length; i < l; i++) {
                    prop = which[i];
                    field = self._fieldFromPropName(prop);
                    try {
                        if (field) {
                            field.validate(self.get(prop), null, {
                                validateField: function(fieldName, value) {
                                    self._validateOne(prop, value);
                                }
                            });
                        } else {
                            self._validateOne(prop, self.get(prop));
                        }
                    } catch (e) {
                        (errors = errors || {})[prop] = e;
                    }
                }
                if (errors) {
                    dfd.reject(self._compoundErrorFromFlattenedKeys(errors));
                }
            }
            if (dfd.state() === 'pending') {
                dfd.resolve();
            }
            return dfd;
        },

        _chooseRequest: function() {
            return  this._hasCompositeId()? 'put' :
                    this._creating()?       'create' :
                                            'update';
        },

        _creating: function() {
            return !this._loaded && !_.find(this._inFlight.save, function(req) {
                return req.dfd.state() === 'pending';
            });
        },

        // this translate something like 'foo.bar' into the corresponding Field
        // instance. it assumes that the only nested structures it will find
        // are instances of StructureField, so in the case of 'foo.bar', the
        // 'foo' part corresponds to a StructureField instance, and 'bar' is
        // some non-structure field within that structure. this would probably
        // choke on things like TupleField.
        _fieldFromPropName: function(prop) {
            var field, schema = {structure: this.__schema__};
            prop = prop.split('.');
            field = schema;
            while (prop.length > 1) {
                field = field.structure[prop.shift()];
            }
            return field && field.structure && field.structure[prop[0]];
        },

        // when you set some nested property like {foo: {bar: 123, baz: 456}}
        // with 'validate: true', and _setOne throws errors, asSettable puts
        // them into a structure like {'foo.bar': <error>, 'foo.baz': <error>},
        // since asSettable sees it all as a flat list of properties.  this
        // needs to be converted into an instance of fields.CompoundError() so
        // everything else knows how to handle it, and that's what this method
        // does
        _compoundErrorFromFlattenedKeys: function(errors) {
            return fields.CompoundError(null, {
                structure: _.reduce(errors,
                    function(memo, fieldError, k) {
                        var split = k.split('.'), cur = memo;
                        while (split.length > 1) {
                            if (!cur[split[0]]) {
                                cur[split[0]] = [
                                    fields.CompoundError(null,
                                        {structure: {}})
                                ];
                            }
                            cur = cur[split.shift()][0].structure;
                        }
                        if (cur[split[0]]) {
                            cur[split.shift()].push(fieldError);
                        } else {
                            cur[split.shift()] = [fieldError];
                        }
                        return memo;
                    }, {})
            });
        },

        _getRequest: function(name) {
            return this.__requests__[name];
        },

        _hasCompositeId: function() {
            // hackety hackety hackety hack....
            return this.__name__ === 'association';
        },

        _initiateRequest: function(name, params) {
            return this._getRequest(name).initiate(this.get('id'), params);
        },

        _validateOne: function(fieldName, value) { }
    }, {mixins: [Eventable]});

    asSettable.call(Model.prototype, {
        onChange: 'onChange',
        onError: 'onSettableError',
        areEqual: _.isEqual,
        propName: null
    });

    Model.prototype._set = _.wrap(Model.prototype._set,
        function(f, newProps, opts) {
            var e, args = Array.prototype.slice.call(arguments, 2);
            this._lastSettableChanges = this._lastSettableError = null;
            f.apply(this, [newProps].concat(args));
            if (this._lastSettableError) {
                e = this._compoundErrorFromFlattenedKeys(this._lastSettableError);
                return $.Deferred().reject(e, this._lastSettableChanges);
            } else {
                return $.Deferred().resolve(this._lastSettableChanges);
            }
        });

    Model.prototype._setOne = _.wrap(Model.prototype._setOne,
        function(f, prop, newValue, currentValue, opts, ctrl) {
            var i, l, args = Array.prototype.slice.call(arguments, 1),
                self = this, inFlight = self._inFlight.save;
            if (opts.noclobber) {
                if (self._changes[prop]) {
                    ctrl.silent = true;
                }
                for (i = 0, l = inFlight.length; i < l; i++) {
                    if (inFlight[i].changes[prop]) {
                        ctrl.silent = true;
                    }
                }
                if (ctrl.silent) {
                    return;
                }
            }
            if (opts.validate) {
                var field = self._fieldFromPropName(prop);
                try {
                    if (field) {
                        field.validate(newValue, null, {
                            validateField: function(fieldName, value) {
                                self._validateOne(prop, value);
                            }
                        });
                    } else {
                        self._validateOne(prop, newValue);
                    }
                } catch (e) {
                    ctrl.error = e;
                    return;
                }
            }
            return f.apply(self, args);
        });

    ret = {Manager: Manager, Model: Model};

    if ($models.length) {
        ret.preloaded = JSON.parse($models.html());
    }

    return ret;
});
