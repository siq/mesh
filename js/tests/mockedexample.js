define([
    'vendor/jquery',
    'vendor/underscore',
    'bedrock/class',
    'mesh/tests/example',
    './examplefixtures'
], function($, _, Class, Example, defaultExampleFixtures) {
    var id, defaultDelay = 0, delay = defaultDelay, fail = false,
        Xhr = Class.extend({
            init:               function(stat) { this.status = stat || 200; },
            getResponseHeader:  function() { return 'application/json'; }
        }),
        exampleFixtures = _.map(defaultExampleFixtures, function(f) {
            return $.extend(true, {}, f);
        });

    id = exampleFixtures.length + 1;

    window.Example = Example;

    Example.prototype.__requests__.query.ajax = function(params) {
        var query, dfd = $.Deferred(),
            resources = [],
            limit = params.data.limit || exampleFixtures.length,
            offset = params.data.offset || 0,
            shouldFail = fail;

        query = eval('query = ' + (params.data.query || '{}'));

        for (var i = offset; i < offset+limit; i++) {
            if (query.integer_field__gt) {
                if (exampleFixtures[i].integer_field > query.integer_field__gt) {
                    resources.push(_.extend({}, exampleFixtures[i]));
                }
            } else {
                resources.push(_.extend({}, exampleFixtures[i]));
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
                    total: exampleFixtures.length
                }, 200, {});
            }
        }, delay);
        return dfd;
    };

    Example.prototype.__requests__.get.ajax = function(params) {
        var obj, which = +_.last(params.url.split('/'));

        obj = $.extend(true, {}, _.find(exampleFixtures, function(e) {
            return e.id === which;
        }));

        setTimeout(function() {
            params.success(obj, 200, Xhr());
        }, delay);
    };

    Example.prototype.__requests__.update.ajax = function(params) {
        var obj, which = +_.last(params.url.split('/')), shouldFail = fail;

        obj = _.find(exampleFixtures, function(e) { return e.id === which; });
        $.extend(obj, JSON.parse(params.data));

        setTimeout(function() {
            if (shouldFail) {
                params.error(Xhr(406));
            } else {
                params.success({id: obj.id}, 200, Xhr());
            }
        }, delay);
    };

    Example.prototype.__requests__['delete'].ajax = function(params) {
        var obj, which = +_.last(params.url.split('/')), shouldFail = fail;

        exampleFixtures = _.filter(exampleFixtures, function(f) {
            return f.id !== which;
        });

        setTimeout(function() {
            if (shouldFail) {
                params.error(Xhr(406));
            } else {
                params.success({id: which}, 200, Xhr());
            }
        }, delay);

    };

    Example.prototype.__requests__.create.ajax = function(params) {
        var obj, which = _.last(params.url.split('/')), shouldFail = fail;

        exampleFixtures.push(JSON.parse(params.data));
        _.last(exampleFixtures).id = id++;

        setTimeout(function() {
            if (shouldFail) {
                params.error(Xhr(406));
            } else {
                params.success({id: _.last(exampleFixtures).id}, 200, Xhr());
            }
        }, delay);

    };

    Example.mockDelay = function(newDelay) {
        delay = newDelay == null? defaultDelay : newDelay;
        return Example;
    };

    Example.mockFailure = function(shouldFail) {
        fail = shouldFail == null? false : shouldFail;
        return Example;
    };

    Example.mockDataChange = function(change) {
        if (change == null) {
            exampleFixtures = _.map(defaultExampleFixtures, function(f) {
                return $.extend(true, {}, f);
            });
        } else {
            change(exampleFixtures);
        }
        return Example;
    };

    return Example;
});
