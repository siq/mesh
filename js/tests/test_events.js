require([
    'vendor/underscore',
    'events'
], function(_, Eventful) {
    module('events');

    test('subscription and unsubscription', function() {
        var eventful = Eventful(), calls = 0,
            callback = function(event, value) {
                strictEqual(value, 'value');
                calls += 1;
            };

        strictEqual(calls, 0);
        eventful.trigger('test', 'value');
        strictEqual(calls, 0);

        eventful.on('test', callback);
        strictEqual(calls, 0);
        eventful.trigger('test', 'value');
        strictEqual(calls, 1);

        eventful.off('test', callback);
        strictEqual(calls, 1);
        eventful.trigger('test', 'value');
        strictEqual(calls, 1);
    });

    test('unsubscription via returning false', function() {
        var eventful = Eventful(), calls = 0,
            callback = function(event) {
                calls += 1;
                return false;
            };

        eventful.on('test', callback);
        strictEqual(calls, 0);
        eventful.trigger('test');
        strictEqual(calls, 1);
        eventful.trigger('test');
        strictEqual(calls, 1);
    });

    test('subscription to all events', function() {
        var eventful = Eventful(), calls = 0,
            callback = function() {
                calls += 1;
            };

        eventful.on('all', callback);
        strictEqual(calls, 0);
        eventful.trigger('one');
        strictEqual(calls, 1);
        eventful.trigger('two');
        strictEqual(calls, 2);
        eventful.trigger('three');
        strictEqual(calls, 3);
    });
});
