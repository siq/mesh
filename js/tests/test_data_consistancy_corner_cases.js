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
//         then it should probably listen for these events and trigger an 'update'
//     - if a collection does have some sort of query, it can't be sure whether or not
//         it should include the new model, so should it call .refresh()? this may be too aggressive
define([
    'vendor/jquery',
    'vendor/underscore',
    './mockedexample'
], function($, _, Example) {

    var setup = function(options) {
        var c, dfd = $.Deferred(),
            Resource = options && options.resource? options.resource : Example;

        // clear all of the current models and reset the example mocking
        // settings to defaults
        Resource.mockReset();

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
            }, function() {
                ok(false, "you shouldn't be here!");
                start();
            });
        });
    });
    
    start();
});
