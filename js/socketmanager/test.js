/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual */
define([
    'vendor/jquery',
    './../socketmanager',
    './../tests/mockedexample',
    './../tests/mockednestedpolymorphicexample'
], function($, SocketManager, Example, NestedExample) {

    Example.collection().load();
    NestedExample.collection().load();

    test('instantiation', function() {
        ok(SocketManager.getInstance());
    });

    // asyncTest('server changes are not tracked', function() {
    //     Example.collection().load().then(function() {
    //         ok(true);
    //         start();
    //     }, function() {
    //         ok(false, "Shouldn't get here.");
    //         start();
    //     });
    // });

    start();
});
