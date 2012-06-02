/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual */
define([
    'vendor/underscore',
    'vendor/jquery',
    './../request',
    './example'
], function(_, $, Request, Example) {
    var manager = Example.models, last_ajax_call;

    var ajax_failed = function() {
        ok(false, 'ajax request failed');
        start();
    };

    module('models', {
        setup: function() {
            Request.prototype.ajax = function(params) {
                var dfd = $.Deferred();
                last_ajax_call = params;
                setTimeout(function() {
                    var ret;
                    if (params.type !== 'POST' && params.type !== 'DELETE') {
                        if (/2$/.test(params.url)) {
                            ret = {"default_field": 1, "required_field": "test", "id": 2};
                        } else {
                            ret = {"total": 1, "resources": [{"default_field": 1, "required_field": "test", "id": 1}]};
                        }
                    } else {
                        ret = {"id": 2};
                    }
                    dfd.resolve(ret);
                    params.success(ret, 200, {});
                }, 0);
                // return $.ajax(params);
                return dfd;
            };
        },
        teardown: function() {
            Request.ajax = $.ajax;
        }
    });

    test('instantiation', function() {
        var model = Example();
        strictEqual(model.id, null);
        ok(_.isString(model.cid) && model.cid.length > 0);
        deepEqual(model._changes, {});
        ok(!model._loaded);
        strictEqual(model._manager, model.__models__);
        strictEqual(manager.models[model.cid], model);

        var same_model = manager.get(model.cid);
        strictEqual(same_model, model);

        model = Example({integer_field: 2});
        strictEqual(model.integer_field, 2);
        deepEqual(model._changes, {});
    });

    test('attribute handling', function() {
        var model = Example();
        ok(!model.has('integer_field'));

        var retval = model.set('integer_field', 2);
        strictEqual(retval, model);

        ok(model.has('integer_field'));
        strictEqual(model.integer_field, 2);
        strictEqual(model.html('integer_field'), '2');
        deepEqual(model._changes, {integer_field: true});

        model.set({integer_field: 4, text_field: 'text'});
        strictEqual(model.integer_field, 4);
        strictEqual(model.text_field, 'text');
        deepEqual(model._changes, {integer_field: true, text_field: true});
    });

    test('change events', function() {
        var model = Example(), calls = 0;
        model.on('change', function(event, changed_model, changes) {
            strictEqual(event, 'change');
            strictEqual(changed_model, model);
            strictEqual(model.integer_field, 2);
            deepEqual(changes, {integer_field: true});
            calls++;
        });

        strictEqual(calls, 0);
        model.set('integer_field', 2);
        strictEqual(calls, 1);

        model.set('integer_field', 2);
        strictEqual(calls, 1);
    });

    asyncTest('lifecycle', function() {
        var model = Example({required_field: 'test'});
        strictEqual(model.id, null);
        ok(!model._loaded);

        model.save().then(function(saved_model) {
            var id = model.id;
            strictEqual(saved_model, model);
            ok(model.id);
            ok(model._loaded);
            strictEqual(manager.models[model.id], model);
            deepEqual(model._changes, {});

            manager.clear();
            model = manager.get(id);
            ok(model);
            strictEqual(model.id, id);
            strictEqual(model.cid, null);
            ok(!model.has('required_field'));

            model.refresh().then(function(refreshed_model) {
                strictEqual(refreshed_model, model);
                strictEqual(model.required_field, 'test');

                model.set('text_field', 'text');
                model.save().then(function() {
                    deepEqual($.parseJSON(last_ajax_call.data), {text_field: 'text'});
                    strictEqual(model.text_field, 'text');
                    deepEqual(model._changes, {});

                    model.destroy().then(function(response) {
                        deepEqual(response, {id: model.id});
                        strictEqual(manager.models[model.id], undefined);
                        start();
                    }, ajax_failed);
                }, ajax_failed);
            }, ajax_failed);
        }, ajax_failed);
    });

    module('failing to get resource', {
        setup: function() {
            Request.prototype.ajax = function(params) {
                var dfd = $.Deferred();
                last_ajax_call = params;
                setTimeout(function() {
                    dfd.fail();
                    params.error({
                        getResponseHeader: function() {
                            return 'foobar';
                        }
                    });
                }, 0);
                return dfd;
            };
        },
        teardown: function() {
            Request.ajax = $.ajax;
        }
    });

    asyncTest('unknown resource', function() {
        var model = Example.models.get(17);
        model.refresh().then(ajax_failed, function(error, xhr) {
            ok(!model._loaded);
            start();
        });
    });

    start();
});
