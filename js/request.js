define([
    'component!vendor:underscore',
    'component!vendor:jquery',
    'component!bedrock:class',
    './fields',
    'meshconf'
], function(_, $, Class, fields, meshconf) {
    var Deferred = $.Deferred, isEqual = _.isEqual, indexOf = _.indexOf, isString = _.isString;

    return Class.extend({
        ajax: $.ajax,
        path_expr: /\/id(?=\/|$)/,

        init: function(params) {
            var url;
            this.bundle = params.bundle;
            this.cache = [];
            this.method = params.method;
            this.mimetype = params.mimetype;
            this.name = params.name;
            this.path = params.path;
            this.responses = params.responses;
            this.schema = params.schema;

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
        
        initiate: function(id, data) {
            var self = this, cache = this.cache, url = this.url,
                signature, cached, params, deferred;

            if (id != null) {
                url = url.replace(self.path_expr, '/' + id);
            }

            signature = [url, data];
            for (var i = 0, l = cache.length; i < l; i++) {
                cached = cache[i];
                if (isEqual(cached[0], signature)) {
                    return cached[1];
                }
            }

            params = {
                contentType: self.mimetype,
                dataType: 'json',
                type: self.method,
                url: url
            };

            deferred = Deferred();
            cached = [signature, deferred];

            if (data) {
                if (!isString(data)) {
                    if (self.schema != null) {
                        try {
                            data = self.schema.serialize(data, self.mimetype, true);
                        } catch (error) {
                            if (error instanceof fields.ValidationError) {
                                return deferred.reject();
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
                cache.splice(indexOf(cache, cached), 1);

                response = self.responses[xhr.status];
                if (response) {
                    try {
                        data = response.schema.unserialize(data, response.mimetype);
                    } catch (error) {
                        if (error instanceof fields.ValidationError) {
                            deferred.reject();
                        } else {
                            throw error;
                        }
                    }
                }
                deferred.resolve(data, xhr);
            };

            params.error = function(xhr) {
                var error = null, mimetype;
                cache.splice(indexOf(cache, cached), 1);

                mimetype = xhr.getResponseHeader('content-type');
                if (mimetype && mimetype.substr(0, 16) === 'application/json') {
                    error = $.parseJSON(xhr.responseText);
                }
                deferred.reject(error, xhr);
            };

            cache.push(cached);
            self.ajax(params);
            return deferred;
        }
    });
});
