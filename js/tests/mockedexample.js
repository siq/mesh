define([
    'vendor/jquery',
    'vendor/underscore',
    'bedrock/class',
    'mesh/tests/example',
    './examplefixtures'
], function($, _, Class, Example, exampleFixtures) {
    var defaultDelay = 0, delay = defaultDelay, fail = false,
        Xhr = Class.extend({
            init:               function(stat) { this.status = stat || 200; },
            getResponseHeader:  function() { return 'application/json'; }
        });
    window.Example = Example;

    Example.prototype.__requests__.query.ajax = function(params) {
        var query, dfd = $.Deferred(),
            resources = [],
            limit = params.data.limit || exampleFixtures.length,
            offset = params.data.offset || 0;

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
            if (fail) {
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
        var obj, which = _.last(params.url.split('/'));

        obj = _.find(exampleFixtures, function(e) {
            return e.id === which;
        });

        setTimeout(function() {
            params.success($.extend(true, {}, obj), 200, Xhr());
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

    return Example;
});
