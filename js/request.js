define([
    'vendor/underscore',
    'vendor/jquery',
    'bedrock/class',
    './fields',
    'meshconf'
], function(_, $, Class, fields, meshconf) {
    var Deferred = $.Deferred, isEqual = _.isEqual, indexOf = _.indexOf, isString = _.isString;

    var Request = Class.extend({
        ajax: $.ajax,
        path_expr: /\/id(?=\/|$)/,

        STATUS_CODES: {
            200: 'ok',
            202: 'accepted',
            203: 'subset',
            206: 'partial'
        },

        init: function(params) {
            var url;
            this.bundle = params.bundle;
            this.method = params.method;
            this.mimetype = params.mimetype;
            this.name = params.name;
            this.path = params.path;
            this.responses = params.responses;
            if (params.schema) {
                this.schema = params.schema;
            }

            this.url = this.path;
            if (meshconf && meshconf.bundles) {
                url = meshconf.bundles[this.bundle];
                if (url) {
                    this.url = url + this.path;
                }
            }
        },

        extract: function(subject) {
            if (this.schema && this.schema.structural) {
                return this.schema.extract(subject);
            } else {
                throw new Error();
            }
        },

        initiate: function(id, data, headers) {
            var self = this, url = this.url, signature, params, deferred;

            if (id != null) {
                url = url.replace(self.path_expr, '/' + id);
            }

            params = {
                contentType: self.mimetype,
                dataType: 'json',
                headers: headers,
                type: self.method,
                url: url
            };

            deferred = Deferred();

            if (data) {
                if (!isString(data)) {
                    if (self.schema != null) {
                        try {
                            data = self.schema.serialize(data, self.mimetype, {
                                outermost: true
                            });
                        } catch (error) {
                            if (error instanceof fields.ValidationError) {
                                return deferred.reject([null, error.errors]);
                            } else {
                                throw error;
                            }
                        }
                    } else {
                        data = null;
                    }
                    if (data && self.mimetype === 'application/json') {
                        data = JSON.stringify(data);
                        params.processData = false;
                    }
                }
                params.data = data;
            }

            params.success = function(data, status, xhr) {
                var response;

                response = self.responses[xhr.status];
                if (response && response.schema) {
                    try {
                        data = response.schema.unserialize(data, response.mimetype);
                    } catch (error) {
                        if (error instanceof fields.ValidationError) {
                            deferred.reject(error);
                        } else {
                            throw error;
                        }
                    }
                }
                deferred.resolve(data, xhr);
            };

            params.error = function(xhr) {
                var error = null, mimetype;

                mimetype = xhr.getResponseHeader('content-type');
                if (mimetype && mimetype.substr(0, 16) === 'application/json') {
                    error = $.parseJSON(xhr.responseText);
                }
                deferred.reject(error, xhr);
            };

            self.ajax(params);
            return deferred;
        },

        redefine: function(redefinitions) {
            var params = {responses: {}}, response;

            for (var code in this.responses) {
                if (this.responses.hasOwnProperty(code)) {
                    response = _.clone(this.responses[code]);
                    if (response.schema instanceof fields.StructureField) {
                        response.schema = response.schema.redefine(redefinitions);
                    }
                    params.responses[code] = response;
                }
            }

            if (this.schema instanceof fields.StructureField) {
                params.schema = this.schema.redefine(redefinitions);
            } else {
                params.schema = this.schema;
            }

            for (var name in this) {
                if (this.hasOwnProperty(name) && !params.hasOwnProperty(name)) {
                    params[name] = this[name];
                }
            }
            return Request(params);
        },

        validate: function(value, mimetype) {
            if (this.schema && this.schema.structural) {
                this.schema.validate.apply(this.schema, arguments);
            } else {
                throw fields.ValidationError(
                        'attempting to validate request with no schema');
            }
            return this;
        }
    });

    // used for mocking ajax requests
    Request.ajax = function(newAjax) {
        var oldAjax = Request.prototype.ajax;

        if (newAjax == null) {
            return oldAjax;
        }

        Request.prototype.ajax = newAjax;

        return oldAjax;
    };

    // this checks if the specified resource bundle is responding. this is a
    // generic, shallow status check for any given resource bundle. it returns
    // a deffered that fails on any error response (>= 400) i.e.:
    //
    //      Request.pingResourceBundle('gateway').then(function() {
    //          console.log('the gateway resource is alive');
    //      }, function() {
    //          console.log('the gateway resource is dead');
    //      });
    //
    // this makes the assumption that:
    //
    //      meshconf[bundleName + '-' + version] + bundleName
    //
    // returns a 200 response when it receives a GET request. for example:
    //
    //      meshconf['gateway-1.0'] + '/gateway'
    //
    // example usage:
    //
    //      Request.pingResourceBundle('gateway')
    //      Request.pingResourceBundle({name: 'gateway'})
    //      Request.pingResourceBundle({name: 'gateway', version: '1.0'})
    //
    Request.pingResourceBundle = function(params) {
        if (!_.isObject(params)) {
            params = {
                name: params,
                version: '1.0'
            };
        }
        params.bundle = params.name;
        return $.ajax({
            url: meshconf.bundles[params.bundle] + '/' + params.name
        });
    };

    return Request;
});
