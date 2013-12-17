define([
    'vendor/underscore',
    'vendor/socket.io',
    'bedrock/class',
    'bedrock/mixins/assettable',
    './model'
], function(_, io, Class, asSettable, model) {

    //has socket.io dependency
    var instance = null,
        resourceMap = {},
        socket = io.connect('http://localhost:3000');

    var getModel = function(id) {
        var registryManagers = window.registryManagers || {},
            models = _.find(registryManagers, function(models) {
                return models[id];
            }),
            model = _.findWhere(models, {id: id});
        return model;
    };

    var SocketManager = Class.extend({
        init: function() {
            this._bindEvents();
        },
        _bindEvents: function() {
            var self = this;
            socket.on('update', function (/*arguments*/) {
                // console.log('resource updated');
                /* TODO: decide format
                    how models typically look triggering change event
                    [resource, model, changes]

                    Also we could just do something to get the model and the call set with no clobber
                    `getModel().set(model, {noclobber: true});`
                */
                var resource = arguments[0],
                    callback = resourceMap[resource];
                if (!callback) return;
                callback.apply(this, arguments);
            });
            socket.on('change', function (/*arguments*/) {
                // console.log('resource changed');
                var resource = arguments[0],
                    callback = resourceMap[resource];
                if (!callback) return;
                callback.apply(this, arguments);
            });
            socket.on('delete', function (/*arguments*/) {
                // TODO: call Collection::remove ?? on all collections with this model
                // console.log('resource delete');
                var resource = arguments[0],
                    callback = resourceMap[resource];
                if (!callback) return;
                callback.apply(this, arguments);
            });
        },
        listenTo: function(resource, callback) {
            if (resourceMap[resource] === callback) {
                // already registered with same callback
                return;
            }
            resourceMap[resource] = callback;
        },
        stopListening: function(resource) {
            if (!resourceMap[resource]) {
                // not listening already
                return;
            }
            // delete resourceMap[resource];
            resourceMap[resource] = null;
        }
    });
    asSettable.call(SocketManager.prototype, {propName: null});

    return {
        getInstance: function() {
            if (instance === null) {
                window.socketmanager = instance = SocketManager();
            }
            return instance;
        }
    };
});