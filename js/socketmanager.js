define([
    'vendor/underscore',
    'vendor/socket.io',
    'bedrock/class',
    'bedrock/mixins/assettable'
], function(_, io, Class, asSettable) {

    //has socket.io dependency
    var instance = null,
        resourceMap = {},
        socket = io.connect('http://localhost:3000', {query: 'userid=TODO:get user id'});
    socket.on('connect', function() {
        console.log('connect', arguments);
    });

    var getModel = function(id) {
            if (!id) {
                console.warn('recieved pushed model with no id');
                return;
            }
            var managerRegistry = window.managerRegistry || {},
                manager = _.find(managerRegistry, function(manager) {
                    return manager.models[id];
                }),
                model = _.findWhere(manager.models, {id: id});
            return model;
        };
        // getManager = function(model) {
        //     var managerRegistry = window.managerRegistry || {},
        //         manager = _.find(managerRegistry, function(manager) {
        //             return manager.models[model.id];
        //         });
        //     return manager;
        // };

    var SocketManager = Class.extend({
        init: function() {
            this._bindEvents();
        },
        _bindEvents: function() {
            var self = this;
            socket.on('update', function (/*arguments*/) {
                self._updateModel(arguments[1]);
            });
            socket.on('change', function (/*arguments*/) {
                self._updateModel(arguments[1]);
            });
            socket.on('delete', function (/*arguments*/) {
                // call destroy on a model 
                // first set the id to null so no http request will be sent
                var model = getModel(arguments[1].id);
                if (!model) return;
                model.id = null;
                model.destroy();
            });
            socket.on('add', function (/*arguments*/) {
                var model = arguments[1],
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
                window.socketmanager = instance = SocketManager();
            }
            return instance;
        }
    };
});