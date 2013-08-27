define([
    'vendor/jquery',
    'bedrock/class',
    './fields',
    './request',
    './model',
    'meshconf'
], function($, Class, fields, Request, model, meshconf) {
    var JSON = 'application/json',
        URLENCODED = 'application/x-www-form-urlencoded',
        STATUS_CODES = {
            OK: 200,
            CREATED: 201,
            ACCEPTED: 202,
            SUBSET: 203,
            PARTIAL: 204,
            BAD_REQUEST: 400,
            FORBIDDEN: 403,
            NOT_FOUND: 404,
            METHOD_NOT_ALLOWED: 405,
            INVALID: 406,
            TIMEOUT: 408,
            CONFLICT: 409,
            GONE: 410,
            SERVER_ERROR: 500,
            UNIMPLEMENTED: 501,
            BAD_GATEWAY: 502,
            UNAVAILABLE: 503
        };

    var Introspector = Class.extend({
        init: function(bundle, specification) {
            this.bundle = bundle;
            this.models = {};
            this.specification = specification;
        },

        bind: function(name) {
            var model;
            if (this.models[name] == null) {
                model = this.construct(name);
                if (model != null) {
                    this.models[name] = model;
                    return model;
                } else {
                    return null;
                }
            } else {
                return this.models[name];
            }
        },

        construct: function(name) {
            var specification = this.find(name), schema, requests, resource;
            if (specification == null) {
                return;
            }

            schema = {};
            for (field_name in specification.schema) {
                schema[field_name] = fields.construct(specification.schema[field_name]);
            }

            requests = {};
            for (request_name in specification.requests) {
                requests[request_name] = this._construct_request(specification.requests[request_name]);
            }

            return model.Model.extend({
                __name__: specification.name,
                __composite_key__: specification.composite_key,
                __bundle__: this.bundle,
                __schema__: schema,
                __requests__: requests
            });
        },

        find: function(name) {
            var tokens = name.split('/'), target;
            if (tokens.length < 3 || tokens[0] != this.bundle) {
                return;
            }
            
            target = this.specification.versions;
            if (target[tokens[1]] && target[tokens[1]][tokens[2]]) {
                target = target[tokens[1]][tokens[2]];
            } else {
                return;
            }
            
            if (target.__subject__ == 'bundle') {
                if (tokens.length == 5) {
                    target = target.versions;
                    if (target[tokens[3]] && target[tokens[3]][tokens[4]]) {
                        return target[tokens[3]][tokens[4]];
                    }
                }
            } else {
                return target;
            }
        },

        _construct_request: function(request) {
            var mimetype = JSON, schema, responses, response;
            if (request.endpoint[0] == 'GET') {
                mimetype = URLENCODED;
            }

            if (request.schema) {
                schema = fields.construct(request.schema);
            }

            responses = {};
            for (code in request.responses) {
                response = {status: code, mimetype: JSON};
                if (request.responses[code].schema) {
                    response.schema = fields.construct(request.responses[code].schema);
                }
                responses[STATUS_CODES[code]] = response;
            }

            return Request({
                bundle: this.bundle,
                method: request.endpoint[0],
                mimetype: mimetype,
                name: request.name,
                path: request.path,
                schema: schema,
                responses: responses,
            });
        }
    });

    return {
        introspect: function(bundle) {
            var deferred = $.Deferred();
            $.ajax({
                dataType: 'json',
                type: 'GET',
                url: meshconf.bundles[bundle] + '/' + bundle + '/_specification',
                success: function(data, status, xhr) {
                    deferred.resolve(Introspector(bundle, data));
                },
                error: function(xhr) {
                    deferred.reject(xhr);
                }
            });
            return deferred;
        },
        Introspector: Introspector
    };
});
