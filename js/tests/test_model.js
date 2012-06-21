/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual */
define([
    'vendor/underscore',
    'vendor/jquery',
    'bedrock/uuid',
    './../request',
    './example',
    './examplewithuuid'
], function(_, $, uuid, Request, Example, ExampleWithUuid) {
    var manager = Example.models,
        ajaxFailed = function() {
            ok(false, 'ajax request failed');
            start();
        };

    test('instantiation', function() {
        var model = Example();
        ok(model.id === null);
        ok(_.isString(model.cid) && model.cid.length > 0);
        deepEqual(model._changes, {});
        ok(!model._loaded);
        ok(model._manager === model.__models__);
        ok(manager.models[model.cid] === model);

        var same_model = manager.get(model.cid);
        ok(same_model === model);

        model = Example({integer_field: 2});
        ok(model.integer_field === 2);
        deepEqual(model._changes, {});
    });

    test('attribute handling', function() {
        var model = Example();
        ok(!model.has('integer_field'));

        var retval = model.set('integer_field', 2);
        ok(retval === model);

        ok(model.has('integer_field'));
        ok(model.integer_field === 2);
        ok(model.html('integer_field') === '2');
        deepEqual(model._changes, {integer_field: true});

        model.set({integer_field: 4, text_field: 'text'});
        ok(model.integer_field === 4);
        ok(model.text_field === 'text');
        deepEqual(model._changes, {integer_field: true, text_field: true});
    });

    test('change events', function() {
        var model = Example(), calls = 0;
        model.on('change', function(event, changed_model, changes) {
            ok(event === 'change');
            ok(changed_model === model);
            ok(model.integer_field === 2);
            deepEqual(changes, {integer_field: true});
            calls++;
        });

        ok(calls === 0);
        model.set('integer_field', 2);
        ok(calls === 1);

        model.set('integer_field', 2);
        ok(calls === 1);
    });

    asyncTest('lifecycle', function() {
        var lastAjaxCall = null,
            oldAjax = Request.ajax(function(params) {
                var dfd = $.Deferred();
                lastAjaxCall = params;
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
                return dfd;
            }),
            model = Example({required_field: 'test'});

        ok(model.id === null);
        ok(!model._loaded);

        model.save().then(function(saved_model) {
            var id = model.id;
            ok(saved_model === model);
            ok(model.id);
            ok(model._loaded);
            ok(manager.models[model.id] === model);
            deepEqual(model._changes, {});

            manager.clear();
            model = manager.get(id);
            ok(model);
            ok(model.id === id);
            ok(model.cid === null);
            ok(!model.has('required_field'));

            model.refresh().then(function(refreshed_model) {
                ok(refreshed_model === model);
                ok(model.required_field === 'test');

                model.set('text_field', 'text');
                model.save().then(function() {
                    deepEqual($.parseJSON(lastAjaxCall.data), {text_field: 'text'});
                    ok(model.text_field === 'text');
                    deepEqual(model._changes, {});

                    model.destroy().then(function(response) {
                        deepEqual(response, {id: model.id});
                        ok(manager.models[model.id] === undefined);
                        Request.ajax(oldAjax);
                        start();
                    }, ajaxFailed);
                }, ajaxFailed);
            }, ajaxFailed);
        }, ajaxFailed);
    });

    module('failing to get resource');

    asyncTest('unknown resource', function() {
        var lastAjaxCall = null,
            oldAjax = Request.ajax(function(params) {
                var dfd = $.Deferred();
                lastAjaxCall = params;
                setTimeout(function() {
                    dfd.fail();
                    params.error({
                        getResponseHeader: function() {
                            return 'foobar';
                        }
                    });
                }, 0);
                return dfd;
            }),
            model = Example.models.get(17);

        model.refresh().then(ajaxFailed, function(error, xhr) {
            ok(!model._loaded);
            start();
        });
    });


    module('Model.save()');

    // if a model is instantiated client-side and its 'id' is set client-side,
    // then calling myModel.save() should still make a 'create' request, not an
    // 'update'
    asyncTest('correctly makes create request', function() {
        var generatedId, self = this,
            oldAjax = Request.ajax(function(params) {
                self.ajaxFired = true;
                equal(JSON.parse(params.data).id, generatedId);
                ok(this === model._getRequest('create'));
                params.success(params.data, 200, {});
            }),
            model = ExampleWithUuid({
                id: (generatedId = uuid()),
                required_field: 'foobar shutup..'
            });

        model.save().done(function() {
            ok(self.ajaxFired);
            Request.ajax(oldAjax);
            start();
        }).fail(function() {
            ok(false, 'save failed');
            Request.ajax(oldAjax);
            start();
        });
    });

    asyncTest('save on existing model makes update request', function() {
        var generatedId, self = this,
            oldAjax = Request.ajax(function(params) {
                self.firstAjaxFired = true;
                setTimeout(function() {
                    params.success({
                        resources: [
                            {id: uuid(), required_field: 'required field 1'},
                            {id: uuid(), required_field: 'required field 2'}
                        ],
                        total: 2
                    }, 200, {});
                }, 100);
            });

        ExampleWithUuid.collection().load().done(function(models) {
            ok(true);
            equal(self.firstAjaxFired, true);
            Request.ajax(function(params) {
                ok(this === models[0]._getRequest('update'));
                self.secondAjaxFired = true;
                params.success(params.data, 200, {});
            });

            models[0].set('required_field', 'new value').save().done(function() {
                equal(self.secondAjaxFired, true);
                Request.ajax(oldAjax);
                start();
            }).fail(function() {
                ok(false, 'failed saving model');
                Request.ajax(oldAjax);
                start();
            });
        }).fail(function() {
            ok(false, 'failed loading collection');
            Request.ajax(oldAjax);
            start();
        });
    });

    module('validation');

    asyncTest('fail validation for missing field', function() {
        var self = this,

            // executing this function is equivalent to making a request to the
            // server, but the test should fail before that ever happens
            oldAjax = Request.ajax(function(params) {
                ok(false, 'request should have failed validation before hitting the server');
                params.success(params.data, 200, {});
            }),

            // omit the value for 'required_field'
            model = Example({text_field: 'foobar'});

        model.save().done(function() {
            // something went wrong -- the request should have failed
            ok(false, 'request should have failed to resolve b/c of validation error');
            Request.ajax(oldAjax);
            start();
        }).fail(function() {
            // we successfully got a validation failure
            ok(true);
            Request.ajax(oldAjax);
            start();
        });
    });

    module('poll');

    asyncTest('polling works', function() {
        var self = this,

            count = 0,

            requests = 0,

            // this just mocks up the ajax request, so everything goes through
            // the typical Model/Request infrastructure, and then appears to
            // make an ajax request that takes 100 ms.
            //
            // this will allow 3 ajax requests and then set the
            // 'required_field' property to 'complete'
            oldAjax = Request.ajax(function(params) {
                requests++;
                setTimeout(function() {
                    if (count++ >= 3) {
                        params.data.required_field = 'complete';
                    }
                    params.success(params.data, 200, {});
                }, 100);
            }),

            model = Example({id: 1, required_field: 'waiting'});

        model.poll({
            until: function() {
                return model.get('required_field') === 'complete';
            }
        }).done(function() {

            // make sure that exactly three requests were sent
            equal(requests, 3);

            // make sure that the model was correctly updated
            equal(model.get('required_field'), 'complete');

            Request.ajax(oldAjax);
            start();
        }).fail(function() {
            ok(false, 'model.poll deferred failed to resolve');

            Request.ajax(oldAjax);
            start();
        });
    });

    start();
});
