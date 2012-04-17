/*global test, asyncTest, ok, equal, deepEqual, start, module */
require([
    'path!vendor:underscore',
    'path!mesh:tests/example'
], function(_, Example) {
    asyncTest('requests: GET', function() {
        var request = Example.prototype.__requests__.query;
        request.initiate(null, null).then(
            function(data, xhr) {
                strictEqual(data.total, 0);
                deepEqual(data.resources, []);
                start();
            },
            function(error, xhr) {
                ok(false);
                start();
            }
        );
    });

    asyncTest('requests: POST', function() {
        var request = Example.prototype.__requests__.create;
        request.initiate(null, {required_field: 'test'}).then(
            function(data, xhr) {
                ok(data);
                start();
            },
            function(error, xhr) {
                ok(false);
                start();
            }
        );
    });

    start();
});
