/*global test,asyncTest,ok,equal,deepEqual,start,module,strictEqual,notEqual */

// TODO: test _validateOne for prop name w/ a '.' in it when there's no schema
// def for that field.

// this file exists because it's easier to mock up the Example resource for the
// entire file, and the original test_model.js was using some weird techniques
// to mock the ajax requests
define([
    'vendor/jquery',
    'vendor/underscore',
    'vendor/uuid',
    'mesh/fields',
    './mockedexample',
    './mockednestedpolymorphicexample'
], function($, _, uuid, fields, Example, NestedPolymorphicExample) {
    var setup = function(options) {
        var c, dfd = $.Deferred(),
            Resource = options && options.resource? options.resource : Example;

        // clear all of the current models and reset the example mocking
        // settings to defaults
        _.each([Example, NestedPolymorphicExample], function(Resource) {
            Resource.mockReset();
        });

        if (options && options.noCollection) {
            dfd.resolve();
        } else {
            c = Resource.collection();

            c.load().then(function() {
                dfd.resolve(c);
            }, function(e) {
                console.log('died loading collection:',e);
                ok(false, 'died loading colleciton');
                throw e;
            });
        }

        return dfd;
    };

    module('refresh');

    asyncTest('conditional refresh returns same deferred', function() {
        setup().then(function(c) {
            var dfd1 = c.first().refresh(), dfd2;
            Example.mockDelay(50);
            dfd2 = c.first().refresh(null, {conditional: true});
            ok(dfd1 === dfd2);
            dfd1.then(function() {
                equal(dfd1.state(), 'resolved');
                equal(dfd2.state(), 'resolved');
                start();
            });
        });
    });

    asyncTest('refresh doesnt overwrite changed properties', function() {
        setup().then(function(c) {
            var origValue = c.first().get('text_field'),
                newValue = 'foo';
            ok(c.first().get('text_field') !== newValue);
            c.first().set('text_field', newValue);
            c.first().refresh().then(function() {
                equal(c.first().get('text_field'), newValue);
                start();
            });
        });
    });

    asyncTest('collection refresh doesnt overwrite changed model properties', function() {
        setup().then(function(c) {
            var origValue = c.first().get('text_field'),
                newValue = 'foo';
            ok(c.first().get('text_field') !== newValue);
            c.first().set('text_field', newValue);
            c.refresh().then(function() {
                equal(c.first().get('text_field'), newValue);
                start();
            });
        });
    });

    asyncTest('refresh doesnt overwrite properties changed after initial request', function() {
        setup().then(function(c) {
            var dfd, origValue = c.first().get('text_field'),
                newValue = 'foo';
            ok(c.first().get('text_field') !== newValue);
            dfd = c.first().refresh();
            c.first().set('text_field', newValue);
            dfd.then(function() {
                equal(c.first().get('text_field'), newValue);
                start();
            });
        });
    });

    asyncTest('out of order response to refresh with data change', function() {
        setup().then(function(c) {
            Example.mockDelay(100);
            var dfd1 = c.first().refresh(), dfd2;
            Example.mockDataChange(function(exampleFixtures) {
                var cur = _.find(exampleFixtures, function(f) {
                    return f.id === c.first().get('id');
                });
                cur.required_field = 'changed value';
            });
            Example.mockDelay(25);
            dfd2 = c.first().refresh();
            ok(dfd1 !== dfd2, 'deferreds are different');

            dfd1.then(function() {
                equal(dfd2.state(), 'pending',
                    'the second request completed after the first');
                equal(c.first().get('required_field'), 'changed value');
            });

            dfd2.then(function() {
                equal(dfd1.state(), 'resolved',
                    'the first request completed before the second');
                equal(c.first().get('required_field'), 'changed value');
                start();
            });
        });
    });

    asyncTest('out of order response to refresh with data change lifecycle', function() {
        setup().then(function(c) {
            Example.mockDelay(100);
            var dfd1 = c.first().refresh(), dfd2;
            Example.mockDataChange(function(exampleFixtures) {
                var cur = _.find(exampleFixtures, function(f) {
                    return f.id === c.first().get('id');
                });
                cur.required_field = 'changed value';
            });
            Example.mockDelay(25);
            dfd2 = c.first().refresh();
            ok(dfd1 !== dfd2, 'deferreds are different');

            dfd1.then(function() {
                equal(dfd2.state(), 'pending',
                    'the first request completed before the second');
                equal(c.first().get('required_field'), 'changed value');
            });

            dfd2.then(function() {
                equal(dfd1.state(), 'resolved',
                    'the second request completed after the first');
                equal(c.first().get('required_field'), 'changed value');

                Example.mockDelay(100);
                var dfd3 = c.first().refresh(), dfd4;
                Example.mockDataChange(function(exampleFixtures) {
                    var cur = _.find(exampleFixtures, function(f) {
                        return f.id === c.first().get('id');
                    });
                    cur.required_field = 'changed value 2';
                });
                Example.mockDelay(25);
                dfd4 = c.first().refresh();
                ok(dfd3 !== dfd4, 'deferreds are different');

                dfd3.then(function() {
                    equal(dfd4.state(), 'pending',
                        'the third request completed after the second');
                    equal(c.first().get('required_field'), 'changed value 2');
                });

                dfd4.then(function() {
                    equal(dfd3.state(), 'resolved',
                        'the fourth request completed after the third');
                    equal(c.first().get('required_field'), 'changed value 2');

                    equal(c.first()._inFlight.refresh.length, 1,
                        'state was cleaned up property');
                    start();
                });
            });
        });
    });

    asyncTest('in order response to refresh with data change', function() {
        setup().then(function(c) {
            Example.mockDelay(25);
            var dfd1 = c.first().refresh(), dfd2;
            Example.mockDataChange(function(exampleFixtures) {
                var cur = _.find(exampleFixtures, function(f) {
                    return f.id === c.first().get('id');
                });
                cur.required_field = 'changed value';
            });
            Example.mockDelay(50);
            dfd2 = c.first().refresh();
            ok(dfd1 !== dfd2, 'deferreds are different');

            dfd1.then(function() {
                equal(dfd2.state(), 'pending',
                    'the second request completed after the first');
                ok(c.first().get('required_field') == null, 'required field is null');
            });

            dfd2.then(function() {
                equal(dfd1.state(), 'resolved',
                    'the first request completed before the second');
                equal(c.first().get('required_field'), 'changed value');
                start();
            });
        });

    });

    asyncTest('in order response to refresh with data change lifecycle', function() {
        setup().then(function(c) {
            Example.mockDelay(25);
            var dfd1 = c.first().refresh(), dfd2;
            Example.mockDataChange(function(exampleFixtures) {
                var cur = _.find(exampleFixtures, function(f) {
                    return f.id === c.first().get('id');
                });
                cur.required_field = 'changed value';
            });
            Example.mockDelay(50);
            dfd2 = c.first().refresh();
            ok(dfd1 !== dfd2, 'deferreds are different');

            dfd1.then(function() {
                equal(dfd2.state(), 'pending',
                    'the second request completed after the first');
                ok(c.first().get('required_field') == null, 'required field is null');
            });

            dfd2.then(function() {
                equal(dfd1.state(), 'resolved',
                    'the first request completed before the second');
                equal(c.first().get('required_field'), 'changed value');
                Example.mockDelay(25);
                var dfd3 = c.first().refresh(), dfd4;
                Example.mockDataChange(function(exampleFixtures) {
                    var cur = _.find(exampleFixtures, function(f) {
                        return f.id === c.first().get('id');
                    });
                    cur.required_field = 'changed value 2';
                });
                Example.mockDelay(50);
                dfd4 = c.first().refresh();
                ok(dfd3 !== dfd4, 'deferreds are different');

                dfd3.then(function() {
                    equal(dfd4.state(), 'pending',
                        'the second request completed after the first');
                    ok(c.first().get('required_field') === 'changed value',
                        'required field is set to original value');
                });

                dfd4.then(function() {
                    equal(dfd3.state(), 'resolved',
                        'the first request completed before the second');
                    equal(c.first().get('required_field'), 'changed value 2');
                    start();
                });
            });
        });

    });

    asyncTest('conditional refresh after loading via collection', function() {
        setup().then(function(c) {
            var promise = c.first().refresh(null, {conditional: true});

            ok(promise.state(), 'resolved');

            promise.then(function() {
                ok(true, 'didnt fail');
                start();
            });
        });
    });

    asyncTest('refreshing a model without id returns a failed deferred', function() {
        setup({noCollection: true}).then(function() {
            var m = Example(), dfd = m.refresh();

            ok(m.get('id') == null, 'model has no id');
            equal(dfd.state(), 'rejected', 'deferred has been rejected');

            dfd.then(function() {
                ok(false, 'deferred should not resolve');
                start();
            }, function(errors) {
                ok(true, 'error callback should execute');
                deepEqual(errors,
                    [[{token: 'cannot-refresh-without-id'}], null]);
                start();
            });
        });
    });

    asyncTest('cleaning up state after failed refresh', function() {
        setup().then(function(c) {
            var m = c.first();
            Example.mockFailure(true);
            m.refresh().then(function() {
                ok(false, 'refresh 1 should have failed');
                start();
            }, function() {
                m.refresh().then(function() {
                    ok(false, 'refresh 2 should have failed');
                    start();
                }, function() {
                    m.refresh().then(function() {
                        ok(false, 'refresh 3 should have failed');
                        start();
                    }, function() {
                        equal(m._inFlight.refresh.length, 1);
                        start();
                    });
                });
            });
        });
    });

    asyncTest('conditional refresh with in-flight refresh', function() {
        setup({noCollection: true}).then(function() {
            var m = Example.models.get(1),
                dfd1 = m.refresh(),
                dfd2 = m.refresh(null, {conditional: true});

            ok(dfd1 === dfd2);
            equal(dfd1.state(), 'pending');
            dfd2.then(start);
        });
    });

    module('save');

    asyncTest('saving a value on an existing model works', function() {
        setup().then(function(c) {
            ok(c.first().get('required_field') == null);
            c.first().set('required_field', 'foo');
            c.first().save().then(function() {
                Example.models.clear();
                Example.collection().load().then(function(models) {
                    equal(models[0].get('required_field'), 'foo');
                    start();
                });
            });
        });
    });

    asyncTest('saving a value on a new model works', function() {
        setup({noCollection: true}).then(function() {
            var m = Example();
            m.set('required_field', 'foo');
            m.save().then(function() {
                var id = m.get('id');
                Example.models.clear();
                Example.collection().load().then(function(models) {
                    var m = _.find(models, function(m) {
                        return m.get('id') == id;
                    });
                    ok(m);
                    equal(m.get('required_field'), 'foo');
                    start();
                });
            });
        });
    });

    asyncTest('calling save with in flight create returns first dfd', function() {
        setup({noCollection: true}).then(function() {
            Example.mockDelay(10);
            var m = Example({required_field: 'foo'}),
                dfd1 = m.save(),
                dfd2 = m.save();
            ok(dfd1 === dfd2, 'second save\'s dfd is equal to the first');
            dfd1.then(function() {
                start();
            }, function() {
                ok(false, 'should have resolved');
                start();
            });
        });
    });

    asyncTest('calling save fails when theres an in flight create that fails', function() {
        setup({noCollection: true}).then(function() {
            Example.mockDelay(10);
            var m = Example({required_field: 'foo'}), dfd1, dfd2, dfd1Failed;
            Example.mockFailure(true);
            dfd1 = m.save();
            m.set('text_field', 'bar');
            dfd2 = m.save();
            ok(dfd1 !== dfd2, 'second save\'s dfd is not equal to the first');
            dfd1.then(function() {
                ok(false, 'should have failed');
            }, function() {
                ok(true, 'first deferred should have failed');
                dfd1Failed = true;
            });
            dfd2.then(function() {
                ok(false, 'second deferred should have failed');
                start();
            }, function() {
                ok(true, 'first deferred should have failed');
                ok(dfd1Failed);
                start();
            });
        });
    });

    asyncTest('calling save on already-loaded model', function() {
        setup().then(function(c) {
            c.first().save().then(function() {
                ok(true, 'saved succeeded');
                start();
            });
        });
    });

    asyncTest('cleaning up state after save', function() {
        setup({noCollection: true}).then(function() {
            var m = Example({required_field: 'foo'});
            m.save().then(function() {
                m.set({required_field: 'bar'});
                m.save().then(function() {
                    equal(m._inFlight.save.length, 1);
                    start();
                });
            });
        });
    });

    asyncTest('cleaning up state after failed save', function() {
        setup({noCollection: true}).then(function() {
            var m = Example({required_field: 'foo'});
            m.save().then(function() {
                Example.mockFailure(true);
                m.set({required_field: 'bar'});
                m.save().then(function() {
                    ok(false, 'second request should have failed');
                    start();
                }, function() {
                    equal(m._inFlight.save.length, 1);
                    start();
                });
            });
        });
    });

    asyncTest('failing initial create', function() {
        setup({noCollection: true}).then(function() {
            var save1, save2, firstSaveCompleted,
                m = Example({required_field: 'foo'});
            Example.mockFailure(true).mockDelay(50);
            save1 = m.save();
            save1.then(function() {
                ok(false, 'first save should have failed');
                start();
            }, function() {
                ok(true, 'first save failed');
                firstSaveCompleted = true;
            });
            Example.mockFailure();
            equal(save1.state(), 'pending');
            m.set('required_field', 'foobar');
            save2 = m.save();
            save2.then(function() {
                ok(firstSaveCompleted, 'first save completed');
                ok(save1.state(), 'rejected');
                start();
            }, function() {
                ok(false, 'second save should have succeeded');
                start();
            });

        });
    });

    asyncTest('calling save on existing model with in flight update returns first dfd', function() {
        setup().then(function(c) {
            Example.mockDelay(10);
            var dfd1, dfd2;
            c.first().set('required_field', 'foo');
            dfd1 = c.first().save();
            dfd2 = c.first().save();
            ok(dfd1 === dfd2, 'second save\'s dfd is equal to the first');
            dfd1.then(function() {
                start();
            }, function() {
                ok(false, 'should have resolved');
                start();
            });
        });
    });

    asyncTest('calling save on new model with in flight create returns first dfd', function() {
        setup({noCollection: true}).then(function() {
            Example.mockDelay(10);
            var m = Example(), dfd1, dfd2;

            m.set('required_field', 'foo');

            dfd1 = m.save();
            dfd2 = m.save();

            ok(dfd1 === dfd2, 'second save\'s dfd is equal to the first');
            dfd1.then(function() {
                start();
            }, function() {
                ok(false, 'should have resolved');
                start();
            });
        });
    });

    // when the first call to m.save() fails, there's some un-persisted state
    // on the client-side model. we need to make sure that when a .save()
    // fails, we still track those properties as changed, so they'll get saved
    // w/ the next .save() call
    asyncTest('failed save preserves list of unpersisted changes', function() {
        setup().then(function(c) {
            var m = c.first(), dfd1, dfd2;

            Example.mockDelay(50).mockFailure(true);
            m.set('required_field', 'foo');
            dfd1 = m.save();
            Example.mockFailure(false);
            m.set('text_field', 'bar');
            dfd2 = m.save();

            dfd1.then(function() {
                ok(false, 'first request should have failed');
            }, function() {
                ok(true, 'first request failed');
                equal(m._changes.required_field, true,
                    'required_field property is listed as changed');
            });

            dfd2.then(function() {
                ok(true, 'second request succeeded');
                equal(m._changes.hasOwnProperty('text_field'), false,
                    'text_field property is not listed as changed');
                start();
            }, function() {
                ok(false, 'second request should not have failed');
                start();
            });
        });
    });

    asyncTest('calling save with in flight create and changes returns new dfd', function() {
        setup({noCollection: true}).then(function() {
            Example.mockDelay(50);
            var m = Example(), dfd1, dfd2;

            m.set('required_field', 'foo');
            dfd1 = m.save(),
            m.set('boolean_field', true);
            dfd2 = m.save();

            ok(dfd1 !== dfd2, 'different deferred objects');

            dfd1.then(function() {
                var persisted = Example.mockGetPersistedData(), checked = false;
                equal(dfd2.state(), 'pending');
                equal(m.get('required_field'), 'foo');
                equal(m.get('boolean_field'), true);
                _.each(persisted, function(d) {
                    if (d.id === m.get('id')) {
                        checked = true;
                        equal(d.required_field, 'foo',
                            'required_field has been persisted');
                        ok(d.boolean_field == null,
                            'boolean_field has not been persisted');
                    }
                });
                ok(checked, 'successfully checked persisted data');
            });

            dfd2.then(function() {
                var persisted = Example.mockGetPersistedData(), checked = false;
                equal(dfd1.state(), 'resolved');
                equal(m.get('required_field'), 'foo');
                equal(m.get('boolean_field'), true);
                _.each(persisted, function(d) {
                    if (d.id === m.get('id')) {
                        checked = true;
                        equal(d.required_field, 'foo',
                            'required_field has been persisted');
                        equal(d.boolean_field, true,
                            'boolean_field has been persisted');
                    }
                });
                ok(checked, 'successfully checked persisted data');
                start();
            });

        });
    });

    asyncTest('calling save with in flight update and changes returns new dfd', function() {
        setup().then(function(c) {
            Example.mockDelay(10);
            var dfd1, dfd2;

            c.first().set('required_field', 'foo');
            dfd1 = c.first().save(),
            c.first().set('boolean_field', true);
            dfd2 = c.first().save();

            ok(dfd1 !== dfd2, 'different deferred objects');

            dfd1.then(function() {
                equal(dfd2.state(), 'pending');
                equal(c.first().get('required_field'), 'foo');
                equal(c.first().get('boolean_field'), true);
            });

            dfd2.then(function() {
                equal(dfd1.state(), 'resolved');
                equal(c.first().get('required_field'), 'foo');
                equal(c.first().get('boolean_field'), true);
                start();
            });

        });
    });

    asyncTest('updating a nested property', function() {
        setup({resource: NestedPolymorphicExample}).then(function(c) {
            var data, m = c.first();
            data = _.find(NestedPolymorphicExample.mockGetPersistedData(),
                function(d) {
                    return d.id === m.get('id');
                });
            ok(data);
            m.set('structure_field.required_field', 1335);
            equal(data.structure_field.required_field, 0);
            m.save().then(function() {
                var newData = _.find(NestedPolymorphicExample.mockGetPersistedData(),
                    function(d) {
                        return d.id === m.get('id');
                    });
                ok(newData);
                equal(newData.structure_field.required_field, 1335);
                start();
            }, function(e) {
                ok(false, 'save failed');
                throw e;
            });
        });
    });

    asyncTest('calling refresh that goes out and comes back during save', function() {
        setup().then(function(c) {
            var saveDfd, saved, refreshDfd, refreshed,
                m = c.first(),
                orig = m.get('text_field');
            Example.mockDelay(100);
            m.set('text_field', 'foo');
            saveDfd = m.save();
            Example.mockDelay(0);
            refreshDfd = m.refresh();

            refreshDfd.then(function() {
                ok(!saved);
                refreshed = true;
                equal(m.get('text_field'), 'foo');
                equal(m.previous('text_field'), orig);
            });

            saveDfd.then(function() {
                ok(refreshed);
                saved = true;
                equal(m.get('text_field'), 'foo');
                equal(m.previous('text_field'), orig);
                start();
            });
        });
    });

    // this is a bit complicated, the timeline is like this:
    //
    //      -------------------- set text_field ---------------------
    //      save                |--------| fail
    //      ----------------- set required_field --------------------
    //      save                    |----------| success
    //
    //      save                            |--------| success
    //
    // the first and second save should send text_field and required_field
    // respectively, of course. but since the third save happens after the
    // first failure returns, it should be smart enough to re-send that
    // un-saved property.
    asyncTest('set failed save set save save', function() {
        setup().then(function(c) {
            var save1, save2, save3, reqs = [],
                m = c.first(),
                origTextField = m.get('text_field'),
                origRequiredField = m.get('required_field');
            Example.mockWrapRequestHandler('update', function(f, params) {
                var args = Array.prototype.slice.call(arguments, 1);
                reqs.push(JSON.parse(params.data));
                return f.apply(this, args);
            }).mockDelay(100);

            m.set('text_field', 'set 1');
            Example.mockFailure(true);
            save1 = m.save();

            setTimeout(function() {
                Example.mockFailure();
                equal(save1.state(), 'pending');
                m.set('required_field', 'set 2');
                save2 = m.save();

                save2.then(function() {
                    var currentData = _.find(Example.mockGetPersistedData(),
                        function(d) { return d.id === m.get('id'); });
                    equal(save1.state(), 'rejected', 'save1 failed');
                    equal(save3.state(), 'pending', 'save3 is still in flight');
                    equal(m.get('text_field'), 'set 1');
                    equal(currentData.text_field, origTextField,
                        'text_field still hasnt persisted');
                    equal(m.get('required_field'), 'set 2');
                    equal(currentData.required_field, 'set 2',
                        'required_field has been persisted');
                }, function() {
                    var args = Array.prototype.slice.call(arguments, 0);
                    ok(false, 'second save should have succeeded');
                    start();
                });
            }, 50);

            save1.then(function() {
                ok(false, 'first request should have failed');
                start();
            }, function() {
                var currentData = _.find(Example.mockGetPersistedData(),
                    function(d) { return d.id === m.get('id'); });
                equal(save2.state(), 'pending', 'save 2 is still in flight');
                save3 = m.save();
                equal(m.get('text_field'), 'set 1');
                equal(currentData.text_field, origTextField,
                    'text_field failed to persist');
                equal(m.get('required_field'), 'set 2');
                equal(currentData.required_field, origRequiredField,
                    'required_field has not been persisted yet');

                save3.then(function() {
                    var currentData = _.find(Example.mockGetPersistedData(),
                        function(d) { return d.id === m.get('id'); });
                    equal(m.get('text_field'), 'set 1');
                    equal(currentData.text_field, 'set 1',
                        'text_field still hasnt persisted');
                    equal(m.get('required_field'), 'set 2');
                    equal(currentData.required_field, 'set 2',
                        'required_field has been persisted');
                    deepEqual(reqs, [
                        {text_field: 'set 1'},
                        {required_field: 'set 2'},
                        {text_field: 'set 1'}
                    ], 'requests were correct');
                    start();
                }, function() {
                    ok(false, 'save3 should have succeeded');
                    start();
                });
            });
        });
    });

    // same as above, but set the same property each time
    //
    //      -------------------- set text_field ---------------------
    //      save                |--------| fail
    //      -------------------- set text_field ---------------------
    //      save                    |----------| success
    //
    //      save                            |--| success (same dfd as save #2)
    //
    asyncTest('same property set failed save set save save', function() {
        setup().then(function(c) {
            var save1, save2, save2Finished, save3, save3Finished, reqs = [],
                m = c.first(),
                origTextField = m.get('text_field');
            Example.mockWrapRequestHandler('update', function(f, params) {
                var args = Array.prototype.slice.call(arguments, 1);
                reqs.push(JSON.parse(params.data));
                return f.apply(this, args);
            }).mockDelay(100);

            m.set('text_field', 'set 1');
            Example.mockFailure(true);
            save1 = m.save();

            setTimeout(function() {
                Example.mockFailure();
                equal(save1.state(), 'pending');
                m.set('text_field', 'set 2');
                save2 = m.save();

                save2.then(function() {
                    var currentData = _.find(Example.mockGetPersistedData(),
                        function(d) { return d.id === m.get('id'); });
                    ok(!save3Finished);
                    save2Finished = true;
                    equal(save1.state(), 'rejected', 'save1 failed');
                    equal(m.get('text_field'), 'set 2');
                    equal(currentData.text_field, 'set 2',
                        'text_field has been persisted');
                }, function() {
                    var args = Array.prototype.slice.call(arguments, 0);
                    ok(false, 'second save should have succeeded');
                    start();
                });
            }, 50);

            save1.then(function() {
                ok(false, 'first request should have failed');
                ok(save2 === save3);
                start();
            }, function() {
                var currentData = _.find(Example.mockGetPersistedData(),
                    function(d) { return d.id === m.get('id'); });
                equal(save2.state(), 'pending', 'save 2 is still in flight');
                save3 = m.save();
                equal(m.get('text_field'), 'set 2');
                equal(currentData.text_field, origTextField,
                    'text_field has not been persisted yet');

                save3.then(function() {
                    var currentData = _.find(Example.mockGetPersistedData(),
                        function(d) { return d.id === m.get('id'); });
                    ok(save2Finished);
                    save3Finished = true;
                    equal(m.get('text_field'), 'set 2');
                    equal(currentData.text_field, 'set 2',
                        'text_field has been persisted');
                    deepEqual(reqs, [
                        {text_field: 'set 1'},
                        {text_field: 'set 2'}
                    ], 'requests were correct');
                    start();
                }, function() {
                    ok(false, 'save3 should have succeeded');
                    start();
                });
            });
        });
    });

    asyncTest('save all parameters', function() {
        setup().then(function(c) {
            var m = c.first(), reqs = [];
            Example.mockWrapRequestHandler('update', function(f, params) {
                var args = Array.prototype.slice.call(arguments, 1);
                reqs.push(JSON.parse(params.data));
                return f.apply(this, args);
            });

            m.set('text_field', '1');
            m.save();
            m.set('text_field', '2');
            m.save({all: true}).then(function() {
                equal(reqs.length, 2);
                deepEqual(reqs[0], {text_field: '1'});
                deepEqual(reqs[1], {
                    "boolean_field": false,
                    "datetime_field": "2012-08-29T14:10:21Z",
                    "default_field": 560,
                    "enumeration_field": 1,
                    "float_field": 0.5581193703703704,
                    "integer_field": 247,
                    "required_field": null,
                    "text_field": "2"
                });
                start();
            });
        });
    });

    module('delete');

    asyncTest('calling delete with in flight requests returns current promise', function() {
        setup().then(function(c) {
            Example.mockDelay(10);
            var dfd1 = c.first().destroy(),
                dfd2 = c.first().destroy();

            ok(dfd1 === dfd2, 'same promise is returned');
            equal(dfd1.state(), 'pending', 'promises in "pending" state');

            dfd1.then(function() {
                start();
            });
        });
    });

    asyncTest('calling delete after successful delete returns same promise', function() {
        setup().then(function(c) {
            Example.mockDelay(10);
            var m = c.first(),
                dfd1 = m.destroy();

            equal(dfd1.state(), 'pending', 'initial deferred state is pending');

            dfd1.then(function() {
                var dfd2 = m.destroy();
                ok(true, 'first destroy succeeded');
                ok(dfd1 === dfd2, 'second deferred is the same as the first');
                equal(dfd2.state(), 'resolved',
                    'second deferred state is resolved');
                start();
            });
        });
    });

    asyncTest('calling delete after failed delete returns new promise', function() {
        setup().then(function(c) {
            Example.mockFailure(true);
            var m = c.first(), dfd1 = m.destroy();

            dfd1.then(function() {
                ok(false, 'destroy should have failed');
                start();
            }, function() {
                Example.mockFailure(false);
                var dfd2 = m.destroy();
                ok(dfd1 !== dfd2);
                dfd2.then(function() {
                    ok(true);
                    start();
                });
            });
        });
    });

    asyncTest('calling delete and then save and then delete', function() {
        setup().then(function(c) {
            Example.mockDelay(10);
            var m = c.currentPage()[1],
                originalId = c.get('id'),
                dfd1 = m.destroy();

            equal(dfd1.state(), 'pending', 'delete request is pending');

            dfd1.then(function() {
                var persisted = Example.mockGetPersistedData();
                ok(!_.find(persisted, function(d) {
                    return d.id === originalId;
                }), 'the model is not in the persisted data');
                Example.models.clear();
                var c = Example.collection();
                c.load().then(function() {
                    ok(!c.findWhere({id: originalId}),
                        'the model is not loaded from the persisted data');
                    m.save().then(function() {
                        c.load({reload: true}).then(function() {
                            var newM = c.findWhere({id: m.get('id')}), dfd2;
                            ok(newM,
                                'after re-loading the collection, the model is back');
                            if (newM) {
                                equal(newM.get('text_field'), m.get('text_field'));
                            }

                            dfd2 = m.destroy();
                            ok(dfd1 !== dfd2, 'a new delete request is executed');

                            dfd2.then(function() {
                                equal(m._inFlight.destroy.length, 1,
                                    'cleaning up state');
                                start();
                            });
                        });
                    });
                });
            });
        });
    });

    module('load');

    asyncTest('calling load refreshes with unloaded model and retuns cached result otherwise', function() {
        setup({noCollection: true}).then(function() {
            var m = Example.models.get(1), dfd1 = m.load();

            dfd1.then(function() {
                var dfd2 = m.load();
                ok(dfd1 === dfd2, 'second load returns cached promise');
                equal(dfd2.state(), 'resolved');
                start();
            });
        });
    });

    module('_fieldFromPropName');

    test('correctly translates nested property to field', function() {
        var m = NestedPolymorphicExample();
        ok(m._fieldFromPropName('structure_field.required_field') ===
            m.__schema__.structure_field.structure.required_field);
        ok(m._fieldFromPropName('required_field') ===
            m.__schema__.required_field);
        ok(m._fieldFromPropName('structure_field.structure_field.optional_field') ===
            m.__schema__.structure_field.structure.structure_field.structure.optional_field);
    });

    module('validate');

    asyncTest('validating a single field named by a string', function() {
        var m = NestedPolymorphicExample();
        m.validate('name').then(function() {
            ok(false, 'should have failed');
            start();
        }, function(e) {
            deepEqual(e.serialize(), {name: [{token: 'nonnull', message: 'nonnull'}]});
            start();
        });
    });

    asyncTest('validating a single field named by an array', function() {
        var m = NestedPolymorphicExample();
        m.validate(['name']).then(function() {
            ok(false, 'should have failed');
            start();
        }, function(e) {
            deepEqual(e.serialize(), {name: [{token: 'nonnull', message: 'nonnull'}]});
            start();
        });
    });

    asyncTest('validating a subset of fields', function() {
        var m = NestedPolymorphicExample();
        m.validate(['name', 'required_field']).then(function() {
            ok(false, 'should have failed');
            start();
        }, function(e) {
            deepEqual(e.serialize(), {
                name: [{token: 'nonnull', message: 'nonnull'}],
                required_field: [{token: 'nonnull', message: 'nonnull'}]
            });
            start();
        });
    });

    asyncTest('validating a subset when there are other failing fields', function() {
        var m = NestedPolymorphicExample();
        m.validate('integer_field').then(function() {
            ok(true, 'should not have failed');
            start();
        }, function(e) {
            ok(false, 'should not have failed, but it failed');
            start();
        });
    });

    module('set with validate');

    asyncTest('dont set invalid options', function() {
        setup().then(function(c) {
            var changeCount = 0,
                managerChangeCount = 0,
                m = c.models[1],
                orig = m.get('integer_field');
            m.on('change', function() { changeCount++; });
            Example.models.on('change', function() { managerChangeCount++; });
            m.set({integer_field: 'abc'}, {validate: true}).then(function() {
                ok(false, 'set should have returned failing dfd');
                start();
            }, function(e, changes) {
                equal(changeCount, 0, 'model didnt fire change events');
                equal(managerChangeCount, 0, 'manager didnt fire change events');
                equal(m.get('integer_field'), orig, 'integer_field value didnt change');
                m.set({integer_field: 'abc'});
                m.validate().then(function() {
                    ok(false, 'validation should have failed too');
                    start();
                }, function(validationError) {
                    var localE = e;
                    deepEqual(e.serialize(), validationError.serialize());
                    start();
                });
            });
        });
    });

    asyncTest('nested errors for set match validate', function() {
        setup({resource: NestedPolymorphicExample}).then(function(c) {
            var m = c.first(),
                prop = 'structure_field.structure_field.optional_field';

            m.set(prop, 'foo', {validate: true}).then(function() {
                ok(false, 'set should have failed');
                start();
            }, function(setError, changes) {
                m.set(prop, 'foo');
                m.validate().then(function() {
                    ok(false, 'validation should have failed');
                    start();
                }, function(validationError) {
                    deepEqual(
                        setError.serialize(),
                        validationError.serialize(),
                        'errors from validate and set match');
                    start();
                });
            });
        });
    });

    asyncTest('multiple nested errors for set match validate', function() {
        setup({resource: NestedPolymorphicExample}).then(function(c) {
            var m = c.first(), value = {
                structure_field: {
                    structure_field: {
                        required_field: 'foo',
                        optional_field: 'foo'
                    }
                }
            };

            m.set(value, {validate: true}).then(function() {
                ok(false, 'set should have failed');
                start();
            }, function(setError, changes) {
                m.set(value);
                m.validate().then(function() {
                    ok(false, 'validation should have failed');
                    start();
                }, function(validationError) {
                    deepEqual(
                        setError.serialize(),
                        validationError.serialize(),
                        'errors from validate and set match');
                    start();
                });
            });
        });
    });

    asyncTest('preserve previous values on failed set', function() {
        setup({resource: NestedPolymorphicExample}).then(function(c) {
            var m = c.first();
            m.set('name', 'first');
            m.set('name', 'second');
            m.set('name', 3, {validate: true}).then(function() {
                ok(false, 'set should have failed');
                start();
            }, function(errors, changes) {
                ok(true, 'set failed');
                deepEqual(errors.serialize(), {
                    name: [{token: 'invalidtypeerror'}]
                });
                equal(m.previous('name'), 'first');
                equal(m.get('name'), 'second');
                start();
            });
        });
    });

    asyncTest('allow validated set when there are existing errors', function() {
        setup({resource: NestedPolymorphicExample}).then(function(c) {
            var m = c.first();
            m.validate().then(function() {
                ok(true, 'initially ok');
                m.set('name', 123);
                m.validate().then(function() {
                    ok(false, 'should fail validation after first set');
                    start();
                }, function(e) {
                    ok(true, 'should fail validation after first set');
                    m.set('required_field', 'foobar', {validate: true})
                        .then(function(changes) {
                            ok(true, 'set should have worked');
                            start();
                        }, function(errors, changes) {
                            ok(false, 'set should have worked');
                            start();
                        });
                });
            }, function() {
                ok(false, 'should be ok initially');
                start();
            });
        });
    });

    asyncTest('partial set works when only one field fails validation', function() {
        setup({resource: NestedPolymorphicExample}).then(function(c) {
            var m = c.first(), value = {
                    structure_field: {
                        structure_field: {
                            required_field: 'foo',
                            optional_field: 123
                        }
                    }
                },
                origRequiredValue =
                    m.get('structure_field.structure_field.required_field'),
                origOptionalValue =
                    m.get('structure_field.structure_field.optional_field');

            m.set(value, {validate: true}).then(function() {
                ok(false, 'required_field should have failed validation');
                start();
            }, function(errors, changes) {
                deepEqual(changes, {
                    structure_field: true,
                    'structure_field.structure_field': true,
                    'structure_field.structure_field.optional_field': true
                });
                deepEqual(errors.serialize(), {
                    structure_field: [{
                        structure_field: [{
                            required_field: [{
                                token: 'invalidtypeerror'
                            }]
                        }]
                    }]
                });
                equal(m.get('structure_field.structure_field.optional_field'),
                    123);
                equal(m.previous('structure_field.structure_field.optional_field'),
                    origOptionalValue);
                equal(m.get('structure_field.structure_field.required_field'),
                    origRequiredValue);
                start();
            });
        });
    });

    asyncTest('setting changed value with noclobber doesnt trigger change', function() {
        setup().then(function(c) {
            var m = c.first(), changes = [];
            m.on('change', function(eventName, changed) {
                changes.push(changed);
            });
            notEqual(m.get('required_field'), 'foobar');
            m.set('required_field', 'foobar');
            m.set('required_field', m.previous('required_field'), {noclobber: true});
            equal(changes.length, 1);
            start();
        });
    });

    asyncTest('setting value thats not in the schema', function() {
        setup().then(function(c) {
            var m = c.first();
            m.set({_foobar: 123}, {validate: true}).then(function() {
                ok(true, 'should have succeeded');
                equal(m.get('_foobar'), 123);
                start();
            }, function() {
                ok(false, 'should not have failed');
                start();
            });
        });
    });

    module('custom validations');

    var _validateOneBase = {
            id: uuid(),
            name: 'name val',
            required_field: 'required_field val',
            structure_field: {
                required_field: 123,
                structure_field: {required_field: 456}
            },
            type: 'immutable'
        },
        _validateOneExpected = _.extend({
            'null': _validateOneBase,
            'structure_field.required_field': _validateOneBase.structure_field.required_field,
            'structure_field.structure_field': _validateOneBase.structure_field.structure_field,
            'structure_field.structure_field.required_field': _validateOneBase.structure_field.structure_field.required_field
        }, _validateOneBase);

    asyncTest('overriding _validateOne provides a hook for validating each field', function() {
        setup({noCollection: true}).then(function(c) {
            var validated, count = 0,
                MyModel = NestedPolymorphicExample.extend({
                    _validateOne: function(prop, value) {
                        count++;
                        (validated = validated || {})[prop] = value;
                    }
                });

            MyModel(_validateOneBase).validate().then(function() {
                deepEqual(validated, _validateOneExpected);
                equal(count, 9);
                start();
            }, function(e) {
                ok(false, 'validate should have succeeded');
                console.log(e);
                start();
            });
        });
    });

    asyncTest('throwing an error in validate one rejects validate call', function() {
        setup({noCollection: true}).then(function() {
            var MyModel = NestedPolymorphicExample.extend({
                _validateOne: function(prop, value) {
                    if (prop === 'name') {
                        throw fields.InvalidTypeError('foobar');
                    }
                }
            });

            MyModel(_validateOneBase).validate().then(function() {
                ok(false, 'should have failed');
                start();
            }, function(e) {
                deepEqual(e.serialize(), {
                    name: [{token: 'invalidtypeerror', message: 'foobar'}]
                });
                start();
            });
        });
    });

    asyncTest('polymorphic values work with _validateOne', function() {
        setup({noCollection: true}).then(function() {
            var m, MyModel = NestedPolymorphicExample.extend({
                _validateOne: function(prop, value) {
                    if (prop === 'composition.expression') {
                        throw fields.InvalidTypeError('foobaz');
                    }
                }
            });

            m = MyModel(_.extend({
                composition: {
                    type: 'attribute-filter',
                    'expression': 'this " wont [ work AND'
                }
            }, _validateOneBase));

            m.validate().then(function() {
                ok(false, 'should have failed');
                start();
            }, function(e) {
                deepEqual(e.serialize(), {
                    composition: [{
                        expression: [
                            {token: 'invalidtypeerror', message: 'foobaz'}
                        ]
                    }]
                });
                m.set({
                    composition: {
                        type: 'datasource-list',
                        'datasources': [
                            {id: uuid(), name: 'some effin data source'}
                        ]
                    }
                });
                m.del('composition.expression');

                m.validate().then(function() {
                    start();
                }, function(e) {
                    ok(false, 'should have succeeded');
                    console.log('second error:',e);
                    start();
                });
            });
        });
    });

    asyncTest('validated set', function() {
        setup({noCollection: true}).then(function(c) {
            var MyModel = NestedPolymorphicExample.extend({
                    _validateOne: function(prop, value) {
                        if (prop === 'boolean_field') {
                            throw fields.InvalidTypeError('three');
                        }
                    }
                });

            MyModel(_validateOneBase).set({
                name: 'foobar',
                boolean_field: true
            }, {validate: true}).then(function() {
                ok(false, 'should have failed');
                start();
            }, function(errors, changes) {
                deepEqual(changes, {name: true});
                deepEqual(errors.serialize(), {
                    boolean_field: [
                        {token: 'invalidtypeerror', message: 'three'}
                   ]
                });
                start();
            });
        });

    });

    start();
});
