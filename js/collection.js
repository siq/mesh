define([
    'vendor/underscore',
    'vendor/jquery',
    'bedrock/class',
    'bedrock/events'
], function(_, $, Class, Eventable) {
    var extend = $.extend, intersection = _.intersection, isArray = _.isArray,
        isString = _.isString, toArray = _.toArray;

    var STATUS_CODES = {
        200: 'ok',
        202: 'accepted',
        203: 'subset',
        206: 'partial'
    };

    var Query = Class.extend({
        init: function(manager, params, request) {
            if (!request || isString(request)) {
                request = manager.model.prototype._getRequest(request || 'query');
            }

            this.manager = manager;
            this.params = params || {};
            this.request = request;
        },

        clone: function(params) {
            params = extend(true, {}, this.params, params);
            return Query(this.manager, params, this.request);
        },

        count: function() {
            var self = this, params = extend({}, this.params, {total: true});
            return self.request.initiate(null, params).pipe(function(data, xhr) {
                return data.total;
            });
        },

        exclude: function() {
            var fields = toArray(arguments);
            if (fields.length > 0) {
                if (this.params.exclude) {
                    fields = intersection(fields, this.params.exclude);
                }
                this.params.exclude = fields;
            }
            return this;
        },

        execute: function(params) {
            var self = this, manager = this.manager;
            params = params || {};
            return self.request.initiate(null, self.params).pipe(function(data, xhr) {
                if (!params.plain) {
                    for (var i = 0, l = data.resources.length; i < l; i++) {
                        data.resources[i] = manager.instantiate(data.resources[i], true);
                    }
                }
                data.complete = (xhr.status === 200);
                data.status = STATUS_CODES[xhr.status];
                return data;
            });
        },

        filter: function(params) {
            if (params) {
                if (this.params.query) {
                    extend(this.params.query, params);
                } else {
                    this.params.query = params;
                }
            }
            return this;
        },

        include: function() {
            var fields = toArray(arguments);
            if (fields.length > 0) {
                if (this.params.include) {
                    fields = intersection(fields, this.params.include);
                }
                this.params.include = fields;
            }
            return this;
        },

        limit: function(value) {
            this.params.limit = value;
            return this;
        },

        offset: function(value) {
            this.params.offset = value;
            return this;
        },

        reset: function() {
            this.params = {};
            return this;
        },

        sort: function() {
            var fields = toArray(arguments);
            if (fields.length > 0) {
                this.params.sort = fields;
            }
            return this;
        }
    });

    var Collection = Class.extend({
        init: function(manager, query) {
            if (query) {
                if (!(query instanceof Query)) {
                    query = Query(manager, query);
                }
            } else {
                query = Query(manager);
            }

            this.ids = {};
            this.manager = manager;
            this.models = [];
            this.query = query;
            this.total = null;
            this.manager.on('change', this.notify, this);
        },

        add: function(models, idx) {
            var self = this, model, newModels = [];
            if (!isArray(models)) {
                models = [models];
            }

            if (idx == null) {
                if (self.total != null) {
                    idx = self.total;
                } else {
                    idx = self.models.length;
                }
            }

            for (var i = 0, l = models.length; i < l; i++) {
                newModels.push(model = models[i]);
                this.models.splice(idx + 1, 0, model);
                if (model.id) {
                    this.ids[model.id] = model;
                } else if (model.cid) {
                    this.ids[model.cid] = model;
                }
            }

            this.trigger('update', this, newModels);
            return this;
        },

        at: function(idx) {
            return this.models[idx] || null;
        },

        create: function(attrs, params, idx) {
            var self = this, model = this.manager.model(attrs);
            return model.save(params).pipe(function(instance) {
                self.add([instance], idx);
                return instance;
            });
        },

        get: function(id) {
            return this.ids[id] || null;
        },

        load: function(params) {
            var self = this, query = this.query.clone(),
                offset, limit, models, dfd;

            params = params || {};

            // siq/mesh issue #10 corner case 1 and 2
            if (!params.reload) {
                if (self._lastLoad && self._lastLoad.query === self.query &&
                        _.isEqual(self._lastLoad.params, params)) {
                    return self._lastLoad.dfd;
                }
            }

            query.params.offset = offset = params.offset || 0;

            if (typeof params.limit !== 'undefined') {
                query.limit(params.limit);
            }
            if (!query.params.limit && !params.reload && self.total > 0) {
                query.limit(self.total - offset);
            }
            limit = query.params.limit;

            if (params.offset == null && !params.reload && self.total != null) {
                return $.Deferred().resolve(self.models);
            }

            if (!params.reload) {
                models = self.models;
                while (models[query.params.offset]) {
                    query.params.offset++;
                    if (query.params.limit) {
                        query.params.limit--;
                        if (query.params.limit === 0) {
                            models = models.slice(offset, offset + limit);
                            return $.Deferred().resolve(models);
                        }
                    }
                }
            }

            if (query.params.offset === 0) {
                delete query.params.offset;
            }

            self._lastLoad = {
                dfd: dfd = $.Deferred(),
                params: params,
                query: self.query
            };

            query.execute().done(function(data) {
                var queryOffset = query.params.offset || 0, instance, results;

                // siq/mesh issue #10 corner case 3
                if (dfd !== self._lastLoad.dfd) {
                    return;
                }

                self.total = data.total;
                for (var i = 0, l = data.resources.length; i < l; i++) {
                    instance = data.resources[i];
                    self.models[queryOffset + i] = instance;
                    self.ids[instance.id] = instance;
                }
                if (limit) {
                    results = self.models.slice(offset, offset + limit);
                } else {
                    results = self.models.slice(offset);
                }
                dfd.resolve(results);
                self.trigger('update', self, results);
            });

            return dfd;
        },

        notify: function(event, manager, model) {
            var id = model.id || model.cid;
            if (this.ids[id]) {
                this.trigger('change', this, model);
            }
        },

        remove: function(models) {
            var model;
            if (!isArray(models)) {
                models = [models];
            }

            for (var i = 0, l = models.length; i < l; i++) {
                model = models[i];
                this.models.splice(_.indexOf(this.models, model), 1);
                if (model.id) {
                    delete this.ids[model.id];
                }
                if (model.cid) {
                    delete this.ids[model.cid];
                }
            }

            this.trigger('update', this, this.models);
            return this;
        },

        reset: function(query) {
            this.models = [];
            this.total = null;

            // always reset the query -- this informs .load() that the previous
            // load call is no longer fresh
            query = query == null? {} : query;

            if (!(query instanceof Query)) {
                query = Query(this.manager, query);
            }
            this.query = query;
            this.trigger('update', this);
            return this;
        }
    }, {mixins: [Eventable]});

    return {
        Collection: Collection,
        Query: Query
    };
});
