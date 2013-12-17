/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual */
define([
    'vendor/jquery',
    './../socketmanager'
], function($, SocketManager) {

    test('instantiation', function() {
        ok(SocketManager.getInstance());
    });

    asyncTest('listening', function() {
        var count = 0,
            socketListner = SocketManager.getInstance();
        socketListner.listenTo('infoset', function(resource, model, changes) {
            console.log('caught update for infoset', arguments);
            var el = $('body')[0],
                args = Array.prototype.map.call(arguments, function(arg) {return arg.toString();});
            el.innerHTML = el.innerHTML + 'caught update for infoset ' + args.join(' ') + '</br>';
            count++;
            if (count === 2) {
                console.log('stop listening');
                socketListner.stopListening('infoset');
            }
        });
        ok(true);
        start();
    });

    start();
});
