/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual */
define([
    'vendor/jquery',
    'vendor/underscore',
    './../request',
    './example'
], function($, _, Request, Example) {
    var ajax = $.ajax,
        swapAjax = function(request) {
            request.ajax = function(params) {
                var dfd = $.Deferred();
                setTimeout(function() {
                    var ret = {total: 0, resources: []};
                    dfd.resolve(ret);
                    params.success(ret, 200, {});
                }, 0);
                return dfd;
            };
        },
        unswapAjax = function(request) {
            request.ajax = ajax;
        };

    asyncTest('requests: GET', function() {
        var request = Example.prototype.__requests__.query;
        swapAjax(request);
        request.initiate(null, null).then(
            function(data, xhr) {
                strictEqual(data.total, 0);
                deepEqual(data.resources, []);
                unswapAjax(request);
                start();
            },
            function(error, xhr) {
                ok(false);
                unswapAjax(request);
                start();
            }
        );
    });

    asyncTest('requests: POST', function() {
        var request = Example.prototype.__requests__.create;
        swapAjax(request);
        request.initiate(null, {required_field: 'test'}).then(
            function(data, xhr) {
                ok(data);
                unswapAjax(request);
                start();
            },
            function(error, xhr) {
                ok(false);
                unswapAjax(request);
                start();
            }
        );
    });

    start();
});
