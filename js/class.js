define([], function() {
    var slice = Array.prototype.slice;

    var super_expr = /.*/, inheriting = false;
    if (/xyz/.test(function() {xyz;})) {
        super_expr = /\b_super\b/;
    }

    var inject = function(base, prototype, namespace) {
        var name, value;
        for (name in namespace) {
            value = namespace[name];
            if (typeof value === 'function' && typeof base[name] === 'function' && super_expr.test(value)) {
                value = (function(name, fn) {
                    return function() {
                        var current_super = this._super, return_value;
                        this._super = base[name];
                        return_value = fn.apply(this, arguments);
                        this._super = current_super;
                        return return_value;
                    };
                })(name, value);
            }
            if (value !== undefined) {
                prototype[name] = value;
            }
        }
    };

    var Class = function() {};
    var extend = function(namespace) {
        var base = this.prototype;
        inheriting = true;
        var prototype = new this();
        inheriting = false;

        inject(base, prototype, namespace);
        var constructor = function() {
            if (this instanceof constructor) {
                if (!inheriting) {
                    if (typeof this.init === 'function') {
                        var candidate = arguments[0];
                        if (candidate && candidate.__args__) {
                            this.init.apply(this, arguments[0].__args__);
                        } else {
                            this.init.apply(this, arguments);
                        }
                    }
                }
            } else {
                return new constructor({__args__: arguments});
            }
        }

        constructor.prototype = prototype;
        constructor.constructor = constructor;
        constructor.extend = extend;

        if (prototype.__new__) {
            prototype.__new__(constructor, this, prototype);
        }
        return constructor;
    };

    Class.extend = extend;
    return Class;
});
