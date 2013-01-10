/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual */

// this file exists because it's easier to mock up the Example resource for the
// entire file, and the original test_model.js was using some weird techniques
// to mock the ajax requests
define([
    'vendor/jquery',
    'vendor/underscore',
    './mockedexample'
], function($, _, Example) {
    var setup = function(options) {
        var c, dfd = $.Deferred();

        // clear all of the current models
        Example.models.clear();
        // reset the example mocking settings to defaults
        Example.mockDelay().mockFailure().mockDataChange();

        if (options && options.noCollection) {
            dfd.resolve();
        } else {
            c = Example.collection();

            c.load().then(function() {
                dfd.resolve(c);
            });
        }

        return dfd;
    };

    module('refresh');

    // asyncTest('refresh with inflight request returns original promise', function() {
    //     setup().then(function(c) {
    //         var models = c.models;
    //         Example.mockDelay(50);
    //         var r1 = models[0].refresh(),
    //             r2 = models[0].refresh();

    //         equal(r1.state(), 'pending', 'refresh request is in-flight');
    //         ok(r1 === r2, 'second call to refresh returned the same promise');

    //         r1.then(function() {
    //             var r3 = models[0].refresh();
    //             ok(r1 !== r3,
    //                 'calling refresh _after_ first request completed returns new dfd');
    //             r3.then(function() {
    //                 start();
    //             });
    //         });
    //     });
    // });

    // asyncTest('out of order response to refresh with data change', function() {
    //     setup().then(function(c) {
    //         Example.mockDelay(100);
    //         var dfd1 = c.first().refresh(), dfd2;
    //         Example.mockDataChange(function(exampleFixtures) {
    //             var cur = _.find(exampleFixtures, function(f) {
    //                 return f.id === c.first().get('id');
    //             });
    //             cur.required_field = 'changed value';
    //         });
    //         Example.mockDelay(25);
    //         dfd2 = c.first().refresh();
    //         ok(dfd1 !== dfd2, 'deferreds are different');

    //         dfd1.then(function() {
    //             equal(dfd2.state(), 'pending',
    //                 'the second request completed after the first');
    //             equal(c.first().get('required_field'), 'changed value');
    //         });

    //         dfd2.then(function() {
    //             equal(dfd1.state(), 'resolved',
    //                 'the first request completed before the second');
    //             equal(c.first().get('required_field'), 'changed value');
    //         });

    //         start();
    //     });
    // });

    // asyncTest('in order response to refresh with data change', function() {
    //     setup().then(function(c) {
    //         Example.mockDelay(25);
    //         var dfd1 = c.first().refresh(), dfd2;
    //         Example.mockDataChange(function(exampleFixtures) {
    //             var cur = _.find(exampleFixtures, function(f) {
    //                 return f.id === c.first().get('id');
    //             });
    //             cur.required_field = 'changed value';
    //         });
    //         Example.mockDelay(50);
    //         dfd2 = c.first().refresh();
    //         ok(dfd1 !== dfd2, 'deferreds are different');

    //         dfd1.then(function() {
    //             equal(dfd2.state(), 'pending',
    //                 'the second request completed after the first');
    //             ok(c.first().get('required_field') == null, 'required field is null');
    //         });

    //         dfd2.then(function() {
    //             equal(dfd1.state(), 'resolved',
    //                 'the first request completed before the second');
    //             equal(c.first().get('required_field'), 'changed value');
    //         });

    //         start();
    //     });

    // });

    start();
});
