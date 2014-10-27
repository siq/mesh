define([
    'vendor/underscore',
    'vendor/socket.io',
    'bedrock/class',
    'bedrock/mixins/assettable'
], function(_, io, Class, asSettable) {

    var instance = null,
        resourceMap = {},
        socket;

    function initSocket() {
        socket = io.connect('http://'+window.location.hostname+':9990');
        // -- uncomment for use with butler and vpn
        // socket = io.connect('http://app:9990');
        // -- uncomment for use with butler and ssh tunnels
        // socket = io.connect('http://localhost:15090');
        socket.on('connect', function() {
            console.info('connected'/*, arguments*/);
        });
    }
    function getModel(id) {
        if (!id) {
            console.warn('recieved pushed model with no id');
            return;
        }
        var registry = window.registry || {},
            manager = _.find(registry.managers, function(manager) {
                return manager.models[id];
            }),
            model = _.findWhere(manager.models, {id: id});
        return model;
    }
    // function getManager(model) {
    //     var registry = window.registry || {},
    //         manager = _.find(registry.managers, function(manager) {
    //             return manager.models[model.id];
    //         });
    //     return manager;
    // }

    var SocketManager = Class.extend({
        init: function() {
            this._bindEvents();
        },
        _bindEvents: function() {
            var self = this;
            socket.on('update', function (/*arguments*/) {
                var entity = arguments[0].entity,
                    resource = arguments[0].resource;
                self._updateModel(resource);
            });
            socket.on('change', function (/*arguments*/) {
                var entity = arguments[0].entity,
                    resource = arguments[0].resource;
                self._updateModel(resource);
            });
            socket.on('delete', function (/*arguments*/) {
                // call destroy on a model
                // first set the id to null so no http request will be sent
                var entity = arguments[0].entity,
                    model = getModel(arguments[0].resource.id);
                if (!model) return;
                model.id = null;
                model.destroy();
            });
            socket.on('add', function (/*arguments*/) {
                var entity = arguments[0].entity,
                    model = arguments[0].resource,
                    manager;
                if (!model) return;
                // TODO: figure out how to get the manager from a new server model
                // remember it's from the server so it has not yet been associated with a manager
                manager.instantiate(model, true, true);
                manager.notify(model, 'add');
            });
        },
        _updateModel: function(m) {
            var id = (m || {}).id,
                model = getModel(id),
                manager;
            if (!model) return;
            // using the manager::merge will call `set` with `noclobber`
            manager = model._manager;
            manager.merge(m, model, true);
        }
    });
    asSettable.call(SocketManager.prototype, {propName: null});

    return {
        getInstance: function() {
            if (instance === null) {
                initSocket();
                window.socketmanager = instance = SocketManager();
            }
            return instance;
        }
    };
});
