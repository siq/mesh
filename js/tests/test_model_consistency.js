/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual */

// this file exists because it's easier to mock up the Example resource for the
// entire file, and the original test_model.js was using some weird techniques
// to mock the ajax requests
define([
    './mockedexample'
], function(Example) {
    var setup = function() {
        var dfd = $.Deferred();
        // clear all of the current models
        Example.models.clear();
        // reset the example mocking settings to defaults
        Example.mockDelay().mockFailure();

        return dfd.resolve();
    };

    // asyncTest('refresh with inflight request returns original promise', function() {
    //     setup().then(function() {
    //         Example.collection().load().then(function(models) {
    //             Example.mockDelay(50);
    //             var r1 = models[0].refresh(),
    //                 r2 = models[0].refresh();

    //             equal(r1.state(), 'pending', 'refresh request is in-flight');
    //             ok(r1 === r2, 'second call to refresh returned the same promise');

    //             r1.then(function() {
    //                 var r3 = models[0].refresh();
    //                 ok(r1 !== r3,
    //                     'calling refresh _after_ first request completed returns new dfd');
    //                 r3.then(function() {
    //                     start();
    //                 });
    //             });

    //         });
    //     });
    // });

    start();
});
