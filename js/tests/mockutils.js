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

    // we use a format for query params that's like json but not json
    function pseudoJsonToObject(pseudoJson) {
        var withoutCurlies = pseudoJson.replace(/^\{/, '').replace(/\}$/, ''),
            items = withoutCurlies.split(','),
            tuples = _.map(items, function(item) { return item.split(':'); });
        return _.reduce(tuples, function(memo, item) {
            memo[item[0]] = item[1];
            return memo;
        }, {});
    }

    function pseudoListToArray(pseudoList) {
        return pseudoList.replace(/^\[/,'').replace(/\]$/,'').split(',');
    }

    // 'params' here is the object passed to the 'ajax' method of a request
    function filterFromQuery(objects, params, attr) {
        var filter;

        attr = attr || 'name__icontains';
        filter = params.data && params.data.query &&
                 pseudoJsonToObject(params.data.query)[attr];

        objects = !filter? _.toArray(objects) : _.filter(objects, function(m) {
            return m.name.toLowerCase().indexOf(filter) >= 0;
        });

        return _.map(objects, function(o) { return $.extend(true, {}, o); });
    }

    function stripUnlessIncluded(objects, params, check) {
        var include = params.data && params.data.include?
            pseudoListToArray(params.data.include) : [];
        return _.map(objects, function(o) {
            o = $.extend(true, {}, o); // just to be safe
            return _.reduce(o, function(o, v, k) {
                if (_.indexOf(check, k) > -1) {
                    if (_.indexOf(include, k) > -1) {
                        o[k] = v;
                    }
                } else {
                    o[k] = v;
                }
                return o;
            }, {});
        });
    }

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
            var dfd = $.Deferred(),
                resources = [],
                limit = params.data.limit || resourceFixtures.length,
                offset = params.data.offset || 0,
                shouldFail = fail;

            resources = filterFromQuery(resourceFixtures, params);

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
            var obj, objects,  shouldFail = fail,
                which = _.last(params.url.split('/'));

            if (!hasUuid) {
                which = +which;
            }

            objects = filterFromQuery(resourceFixtures, params);
            obj = _.find(objects, function(o) { return o.id === which; });

            setTimeout(function() {
                if (shouldFail) {
                    params.error(Xhr(406));
                } else if (!obj) {
                    params.error(Xhr(404));
                } else {
                    params.success($.extend(true, {}, obj), 200, Xhr());
                }
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

