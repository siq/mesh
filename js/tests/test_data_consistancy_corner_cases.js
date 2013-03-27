/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual */

// Tests to cover these issues
// https://gist.github.com/aaronj1335/5245990
// 
// collection load's:
//     - a collection has been loaded and includes a particular model
//     - that model is updated server-side, not on the page
//     - the collection is re-loaded, and the change from the server side is applied
//         to the local copy of the model
//     - i don't know if the model triggers a change event in this case
//     - pertinent code: when a query resolves and converts the plain objects into model instances
// 
// model creation (i.e. actually saving a new model, not just instantiating it):
//     - when a model is .save()'ed, it should trigger some event on the manager, probably
//         in the associate method
//     - if a collection is just loading everything, i.o.w. has no query, limit, or offset,
//         then it should probably listen for these events and trigger and `add` the model then
//         then trigger an 'update' event
//     - if a collection does have some sort of query, it can't be sure whether or not
//         it should include the new model, so should it call .refresh()? this may be too aggressive
define([
    'vendor/jquery',
    'vendor/underscore',
    './mockedexample'
], function($, _, Example) {

    var setup = function(options) {
            var c, dfd = $.Deferred(), dfd2 = $.Deferred(),
                Resource = options && options.resource? options.resource : Example;

            // clear all of the current models and reset the example mocking
            // settings to defaults
            Resource.mockReset();

            if (options && options.noCollection) {
                dfd.resolve();
            } else {
                c = Resource.collection();

                c.on('update', function() {
                    dfd2.resolve();
                });
                c.load().then(function() {
                    dfd.resolve(c);
                }, function(e) {
                    console.log('died loading collection:',e);
                    ok(false, 'died loading colleciton');
                    throw e;
                });
            }

            return $.when(dfd, dfd2);
        },
        failure = function() {
            ok(false, "you shouldn't be here!");
            start();
        };

    module('model creation');

    asyncTest('creating new model triggers `add` evt on manager', function() {
        setup().then(function(c) {
            var count = 0,
                m = Example({
                    id: '12341234',
                    required_field: "you need me"
                });
            c.manager.on('add', function() {
                count++;
            });
            m.save().then(function() {
                equal(count, 1, 'creating a new model triggered `add` event');
                start();
            }, failure);
        });
    });

    asyncTest('a newly created  model gets added to the collection automatically', function() {
        setup().then(function(c) {
            var total = c.total,
                m = Example({
                    id: '12341234',
                    required_field: "you need me"
                });
            equal(c.models.length, total, 'collection length is equal to total length');
            m.save().then(function() {
                equal(c.models.length, total+1, 'collection length has increased by 1');
                start();
            }, failure);
        });
    });

    asyncTest('creating new model triggers `update` evt on collection', function() {
        setup().then(function(c) {
            var count = 0;
                m = Example({
                    id: '12341234',
                    required_field: "you need me"
                });
            c.on('update', function() {
                count++;
            });
            m.save().then(function() {
                equal(count, 1, 'creating a new model triggered collection `update` event');
                start();
            }, failure);
        });
    });

    asyncTest('creating new model `refresh`es a collection with a query', function() {
        setup().then(function(c) {
            var limit = 15, total = c.total;
                m = Example({
                    id: '12341234',
                    required_field: "you need me"
                });
            equal(c.models.length, total, 'length is equal to the total');

            // set a query on the collection
            c.reset({limit: limit});
            // when the model is added the collection will `refresh` with the query
            // and trigger an update
            c.on('update', function(evt, collection, models) {
                equal(models.length, limit, 'collection has been refresh with the query');
                equal(c.models.length, limit, 'collection has been refresh with the query');
            });
            m.save().then(function() {
                start();
            }, failure);
        });
    });

    module('collection loads');

    asyncTest('changing a model serve side triggers change event when its reloaded', function() {
        // this should trigger a change event on the collection and on the model
        setup().then(function(c) {
            var count = 0, m = c.first();
            // mock a server side change to model
            Example.mockDataChange(function(exampleFixtures) {
                var cur = _.find(exampleFixtures, function(f) {
                    return f.id === m.get('id');
                });
                cur.required_field = 'changed value';
            });
            c.on('change', function(evt, col, model, changed) {
                equal(model, m, 'change event trigger by model in question');
            });
            m.on('change', function(evt, model, changed) {
                count++;
                equal(model, m, 'change event trigger by model in question');
            });
            c.refresh().then(function() {
                equal(count, 1, 'model triggered change on collection refresh');
                equal(m.get('required_field'), 'changed value', 'model was changed');
                start();
            }, failure);
        });
    });

    start();
});
