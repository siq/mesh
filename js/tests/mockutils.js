define([
    'vendor/jquery',
    'vendor/underscore',
    'vendor/uuid',
    'bedrock/class',
    'mesh/fields'
], function($, _, uuid, Class, fields) {
    var Xhr = Class.extend({
            init:               function(stat) { this.status = stat || 200; },
            getResponseHeader:  function() { return 'application/json'; }
        });

    function mockResource(name, Resource, defaultResourceFixtures) {
        var hasUuid, id, defaultDelay = 0, delay = defaultDelay, fail = false,
            resourceFixtures = _.map(defaultResourceFixtures, function(f) {
                return $.extend(true, {}, f);
            }),
            reqHandlers = {};

        if (Resource.prototype.__schema__.id instanceof fields.UUIDField) {
            hasUuid = true;
        }

        id = resourceFixtures.length + 1;

        window[name] = Resource;

        Resource.prototype.__requests__.query.ajax = reqHandlers.query = function(params) {
            var query, dfd = $.Deferred(),
                resources = [],
                limit = params.data.limit || resourceFixtures.length,
                offset = params.data.offset || 0,
                shouldFail = fail;

            query = eval('query = ' + (params.data.query || '{}'));

            for (var i = offset; i < offset+limit; i++) {
                if (query.integer_field__gt) {
                    if (resourceFixtures[i].integer_field > query.integer_field__gt) {
                        resources.push(_.extend({}, resourceFixtures[i]));
                    }
                } else {
                    resources.push(_.extend({}, resourceFixtures[i]));
                }
            }

            setTimeout(function() {
                if (shouldFail) {
                    params.error({
                        getResponseHeader: function() {return '';},
                        status: 406,
                        statusText: 'didnt work'
                    });
                } else {
                    params.success({
                        resources: resources,
                        total: resourceFixtures.length
                    }, 200, Xhr());
                }
            }, delay);
            return dfd;
        };

        Resource.prototype.__requests__.get.ajax = reqHandlers.get = function(params) {
            var obj, which = _.last(params.url.split('/'));

            if (!hasUuid) {
                which = +which;
            }

            obj = $.extend(true, {}, _.find(resourceFixtures, function(e) {
                return e.id === which;
            }));

            setTimeout(function() {
                params.success(obj, 200, Xhr());
            }, delay);
        };

        Resource.prototype.__requests__.update.ajax = reqHandlers.update = function(params) {
            var obj, which = _.last(params.url.split('/')), shouldFail = fail;

            if (!hasUuid) {
                which = +which;
            }

            setTimeout(function() {
                if (shouldFail) {
                    params.error(Xhr(406));
                } else {
                    obj = _.find(resourceFixtures, function(e) {
                        return e.id === which;
                    });
                    $.extend(obj, JSON.parse(params.data));
                    params.success({id: obj.id}, 200, Xhr());
                }
            }, delay);
        };

        Resource.prototype.__requests__['delete'].ajax = reqHandlers['delete'] = function(params) {
            var obj, which = _.last(params.url.split('/')), shouldFail = fail;

            if (!hasUuid) {
                which = +which;
            }

            setTimeout(function() {
                if (shouldFail) {
                    params.error(Xhr(406));
                } else {
                    resourceFixtures = _.filter(resourceFixtures, function(f) {
                        return f.id !== which;
                    });
                    params.success({id: which}, 200, Xhr());
                }
            }, delay);

        };

        Resource.prototype.__requests__.create.ajax = reqHandlers.create = function(params) {
            var obj, which = _.last(params.url.split('/')), shouldFail = fail;

            setTimeout(function() {
                if (shouldFail) {
                    params.error(Xhr(406));
                } else {
                    resourceFixtures.push(JSON.parse(params.data));
                    if (hasUuid) {
                        _.last(resourceFixtures).id = uuid();
                    } else {
                        _.last(resourceFixtures).id = id++;
                    }
                    params.success({id: _.last(resourceFixtures).id}, 200, Xhr());
                }
            }, delay);

        };

        Resource.mockDelay = function(newDelay) {
            delay = newDelay == null? defaultDelay : newDelay;
            return Resource;
        };

        Resource.mockFailure = function(shouldFail) {
            fail = shouldFail == null? false : shouldFail;
            return Resource;
        };

        Resource.mockDataChange = function(change) {
            if (change == null) {
                resourceFixtures = _.map(defaultResourceFixtures, function(f) {
                    return $.extend(true, {}, f);
                });
            } else {
                change(resourceFixtures);
            }
            return Resource;
        };

        Resource.mockGetPersistedData = function() {
            return _.map(resourceFixtures, function(f) {
                return $.extend(true, {}, f);
            });
        };

        Resource.mockWrapRequestHandler = function(req, f) {
            Resource.prototype.__requests__[req].ajax =
                _.wrap(reqHandlers[req], f);
            return Resource;
        };

        Resource.mockUnwrapRequestHandlers = function() {
            _.each(reqHandlers, function(f, req) {
                Resource.prototype.__requests__[req].ajax = f;
            });
            return Resource;
        };

        return Resource;
    }

    return mockResource;
});

