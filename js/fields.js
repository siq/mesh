define([
    'vendor/jquery',
    'vendor/underscore',
    'bedrock/class',
    './datetime'
], function($, _, Class, datetime) {
    var isArray = _.isArray, isNumber = _.isNumber, isString = _.isString,
        isObject = _.isObject, trim = $.trim,
        URLENCODED = 'application/x-www-form-urlencoded';

    var isPlainObject = function(obj) {
        return (obj && obj === Object(obj) && obj.constructor === Object);
    };

    var urlencodeMapping = function(mapping) {
        var tokens = [], name;
        for (name in mapping) {
            tokens.push(name + ':' + mapping[name]);
        }
        return '{' + tokens.join(',') + '}';
    };

    var urlencodeSequence = function(sequence) {
        return '[' + sequence.join(',') + ']';
    };

    // we want ValidationError's to behave like Error's, but still get the
    // benefits of Class.extend, so we'll have to munge them a bit here
    var token = 'validationerror', ValidationError = Class.extend();
    ValidationError.prototype = new Error(token);
    ValidationError.prototype.name = ValidationError.prototype.token = token;
    ValidationError.prototype.init = function(message, params) {
        this.message = message;
        $.extend(true, this, params);
    };
    ValidationError.prototype.toString = function() {
        return this.message != null? this.name + ': ' + this.message : this.name;
    };
    ValidationError.prototype.serialize = function(opts) {
        var nested;
        if (this.structure) {
            // if it's a structural error, it will be something like:
            //
            //     {
            //         field1: [field1error1, field1error2],
            //         field2: [field2error1, field2error2]
            //     }
            //
            // or
            //
            //     [
            //         [item1error1, item1error2],
            //         [item2error1, item2error2]
            //     ]
            //
            // this should maybe be in CompoundError...
            if (isArray(this.structure)) {
                return _.map(this.structure, function(item) {
                    return _.map(item, function(e) {return e.serialize();});
                });
            } else {
                return _.reduce(this.structure, function(memo, item, key) {
                    if ((opts && opts.flatten) && item[0] instanceof CompoundError) {
                        _.each(item[0].serialize(opts), function(v, k) {
                            memo[key + '.' + k] = v;
                        });
                    } else {
                        memo[key] = _.map(item, function(e) {
                            return e.serialize(opts);
                        });
                    }
                    return memo;
                }, {});
            }
        } else {
            var ret = {token: this.token};
            if (this.message != null) {
                ret.message = this.message;
            }
            return ret;
        }
    };
    ValidationError.extend = _.wrap(ValidationError.extend, function(extend) {
        var args = Array.prototype.slice.call(arguments, 1),
            ret = extend.apply(this, args);
        ret.prototype.name = ret.prototype.token;
        return ret;
    });
    ValidationError.fromPlainObject = function(o) {
        var e;
        if (o == null) {
            return o;
        }
        if (o.token) {
            return ValidationError(o.message, {token: o.token});
        }
        return CompoundError(null, {
            structure: _.reduce(o, function(errs, val, key) {
                errs[key] = _.map(o[key], function(v, k) {
                    return ValidationError.fromPlainObject(v);
                });
                return errs;
            }, {})
        });
    };

    var InvalidTypeError = ValidationError.extend({token: 'invalidtypeerror'});

    // on the client side we seem to use myField.required to denote required
    // fiedls, but scheme seems to use 'nonnull' -- try to match the backend
    // here
    var NonNullError = ValidationError.extend({token: 'nonnull'});

    // when we validate, we roll-up multiple errors into one CompoundError
    var CompoundError = ValidationError.extend({
        token: 'compounderror',
        // if you've got a myCompundError and you want to get the error object
        // for a specific field like 'foo.bar', you can call
        // myCompundError.forField('foo.bar')
        forField: function(prop) {
            var key, split = prop.split('.'), cur = this,
                notNested = cur.structure && cur.structure[prop] && cur.structure[prop][0];
            while ((key = split.splice(0, 1)[0])) {
                cur = cur.structure && cur.structure[key] && cur.structure[key][0];
                if (cur == null) {
                    break;
                }
            }
            return notNested || cur;
        }
    });

    // if a TextField is set to 'nonnull: true', and its value is an empty
    // string, we consider it an error even though the value does not strictly
    // == null (see GA-176).
    //
    // this is the error we throw in that case (also if there's a string with
    // only spaces and 'nonnull: true, strip: true'
    var BlankTextError = ValidationError.extend({token: 'blanktexterror'});

    // when we're validating a structure, and there's some property on the
    // value that the defined structure doesn't know how to handle (like the
    // client-side id field of a model), it will throw an 'UnknownFieldError'.
    //
    // so when you want to validate a model object, and you just want to ignore
    // all of the spurious errors you get for stuff like 'cant validate the
    // client-side id', just catch and ignore UnknownFieldError's
    //
    // also, this is a bit of an anti-pattern, we prob want to be precise about
    // the things we validate, so in proper framework code only validate
    // against stuff that's been .extract()'ed
    var UnknownFieldError = ValidationError.extend({token: 'unknownfielderror'});

    // some fields are just containers for other field types
    // these field type containers call validate on the individual items they contain
    // these containers can also have `min_length: true` and `max_length: true` options
    var MinLengthError = ValidationError.extend({token: 'minlengtherror'});
    var MaxLengthError = ValidationError.extend({token: 'maxlengtherror'});

    // Min/Max number errors for floats and ints
    var MinIntegerError = ValidationError.extend({token: 'minintegererror'});
    var MaxIntegerError = ValidationError.extend({token: 'maxintegererror'});
    var MinFloatError = ValidationError.extend({token: 'minfloaterror'});
    var MaxFloatError = ValidationError.extend({token: 'maxfloaterror'});

    // email pattern error
    var EmailPatternError = ValidationError.extend({token: 'emailpattern'});

    var Field = Class.extend({
        structural: false,

        init: function(params) {
            if (params != null) {
                _.extend(this, params);
            }
        },

        extract: function(subject) {
            throw new Error();
        },

        serialize: function(value, mimetype, normalized) {
            if (!normalized) {
                value = this._normalizeValue(value);
            }
            if (value == null) {
                return value;
            }
            this._validateType(value);
            return this._serializeValue(value, mimetype);
        },

        unserialize: function(value, mimetype) {
            if (value == null) {
                return value;
            }
            value = this._unserializeValue(value, mimetype);
            this._validateType(value);
            return value;
        },

        validate: function(value, mimetype, options, hazOwn) {
            value = this._normalizeValue(value);
            if (value == null) {
                if (this.required || (hazOwn && this.nonnull)) {
                    throw NonNullError('nonnull');
                } else {
                    return value;
                }
            }
            this._validateValue(value);
            this._validateType(value);
            if (mimetype) {
                value = this.serialize(value, mimetype, true);
            }
            if (options && options.validateField) {
                options.validateField(null, value);
            }
            return value;
        },

        _normalizeValue: function(value) {
            return value;
        },

        _serializeValue: function(value, mimetype) {
            return value;
        },

        _unserializeValue: function(value, mimetype) {
            return value;
        },

        _validateType: function(value) {},
        _validateValue: function(value) {}
    });

    var fields = {
        Field: Field,
        InvalidTypeError: InvalidTypeError,
        ValidationError: ValidationError,
        NonNullError: NonNullError,
        CompoundError: CompoundError,
        UnknownFieldError: UnknownFieldError,
        MinLengthError: MinLengthError,
        MaxLengthError: MaxLengthError,
        MinIntegerError: MinIntegerError,
        MaxIntegerError: MaxIntegerError,
        MinFloatError: MinFloatError,
        MaxFloatError: MaxFloatError,
        EmailPatternError: EmailPatternError
    };

    // a mapping of field types, as defined by scheme, to field implementations,
    // used exclusively by constructField() below
    var fieldmapping = {
        "field": Field
    };

    var constructFieldParameter = function(parameter) {
        var result, value;
        if (isPlainObject(parameter)) {
            if (parameter.__type__) {
                return constructField(parameter);
            }
            result = {};
            for (var name in parameter) {
                if (parameter.hasOwnProperty(name)) {
                    result[name] = constructFieldParameter(parameter[name]);
                }
            }
            return result;
        } else if (isArray(parameter)) {
            result = [];
            for (var i = 0, l = parameter.length; i < l; i++) {
                value = parameter[i];
                if (value != null) {
                    value = constructFieldParameter(value);
                }
                result[i] = value;
            }
            return result;
        } else {
            return parameter;
        }
    };

    // given a specification of a scheme field, which potentially has nested scheme
    // fields, attempts to construct the field using the implementations defined
    // within this module
    var constructField = fields.construct = function(specification) {
        var constructor = fieldmapping[specification.__type__];
        delete specification.__type__;

        specification = constructFieldParameter(specification);
        return constructor(specification);
    };

    fields.BooleanField = Field.extend({
        _normalizeValue: function(value) {
            if (isString(value)) {
                value = value.toLowerCase();
                if (value === 'true') {
                    return true;
                } else if (value === 'false') {
                    return false;
                }
            }
            return value;
        },

        _serializeValue: function(value, mimetype) {
            if (mimetype === URLENCODED) {
                return (value ? 'true' : 'false');
            } else {
                return value;
            }
        },

        _validateType: function(value) {
            if (!_.isBoolean(value)) {
                throw InvalidTypeError();
            }
        }
    });

    fields.DateField = Field.extend({
        _serializeValue: function(value, mimetype) {
            return datetime.toISO8601(value);
        },

        _unserializeValue: function(value, mimetype) {
            if (!isString(value)) {
                throw InvalidTypeError();
            }
            return datetime.fromISO8601(value);
        },

        _validateType: function(value) {
            if (!_.isDate(value)) {
                throw InvalidTypeError();
            }
        }
    });

    fields.DateTimeField = Field.extend({
        _serializeValue: function(value, mimetype) {
            return datetime.toISO8601(value, true);
        },

        _unserializeValue: function(value, mimetype) {
            if (!isString(value)) {
                throw InvalidTypeError();
            }
            return datetime.fromISO8601(value);
        },

        _validateType: function(value) {
            if (!_.isDate(value)) {
                throw InvalidTypeError();
            }
        }
    });

    fields.DefinitionField = Field.extend({
        _serializeValue: function(value, mimetype) {
            // todo: implement serialization of field definitions
        },

        _unserializeValue: function(value, mimetype) {
            return constructField(value);
        }
    });

    fields.EmailField = Field.extend({
        _validateType: function(value) {
            if (!isString(value)) {
                throw InvalidTypeError();
            }
        },
        _validateValue: function(value) {
            // super soft regex for basic email address validation
            // the real work for this is on the back end where it belongs
            var valid = (/[^\s]+@[^\s]+\.[^\s]+/).test(value);
            if ((this.nonnull || this.min_length) && isString(value)) {
                if (this.strip) {
                    value = trim(value);
                }
                if (!value || (value < this.min_length)) {
                    throw MinLengthError('field must contain at least one email');
                } else if (!valid) {
                    throw EmailPatternError();
                }
            }
        }
    });

    fields.EnumerationField = Field.extend({
        _normalizeValue: function(value) {
            return (value === '' ? null : value);
        },

        _serializeValue: function(value, mimetype) {
            if (_.isBoolean(value) && mimetype === URLENCODED) {
                return (value ? 'true' : 'false');
            } else {
                return value;
            }
        },

        _validateType: function(value) {
            if (_.indexOf(this.enumeration, value) < 0) {
                throw InvalidTypeError();
            }
        }
    });

    fields.IntegerField = Field.extend({
        _normalizeValue: function(value) {
            var number;
            if (isString(value) && value !== '') {
                number = Number(value);
                if (!_.isNaN(number)) {
                    return number;
                }
            }
            return value;
        },

        _validateType: function(value) {
            if (!isNumber(value) || Math.floor(value) !== value) {
                throw InvalidTypeError();
            }
        },

        _validateValue: function(value) {
            if (isNumber(this.minimum) && value < this.minimum) {
                throw MinIntegerError();
            }
            if (isNumber(this.maximum) && value > this.maximum) {
                throw MaxIntegerError();
            }
        }
    });

    fields.FloatField = Field.extend({
        _normalizeValue: function(value) {
            var number;
            if (isString(value) && value !== '') {
                number = Number(value);
                if (!_.isNaN(number)) {
                    return number;
                }
            }
            return value;
        },

        _validateType: function(value) {
            if (!isNumber(value)) {
                throw InvalidTypeError();
            }
        },

        _validateValue: function(value) {
            if (isNumber(this.minimum) && value < this.minimum) {
                throw MinFloatError();
            }
            if (isNumber(this.maximum) && value > this.maximum) {
                throw MaxFloatError();
            }
        }
    });

    fields.MapField = Field.extend({
        structural: true,

        extract: function(subject) {
            var value_field = this.value, extraction = {}, name, value;
            if (!isObject(subject)) {
                return subject;
            }
            for (name in subject) {
                value = subject[name];
                if (value !== undefined) {
                    if (value_field.structural) {
                        if (value !== null) {
                            extraction[name] = value_field.extract(value);
                        }
                    } else {
                        extraction[name] = value;
                    }
                }
            }
            return extraction;
        },

        serialize: function(value, mimetype, options) {
            var value_field = this.value;
            if (value == null) {
                return value;
            } else if (!isPlainObject(value)) {
                throw InvalidTypeError();
            }
            for (name in value) {
                if (value_field.structural && value[name] == null) {
                    delete value[name];
                } else {
                    value[name] = value_field.serialize(value[name], mimetype);
                }
            }
            if (mimetype === URLENCODED && (!options || !options.outermost)) {
                value = urlencodeMapping(value);
            }
            return value;
        },

        unserialize: function(value, mimetype) {
            var value_field = this.value, name;
            if (value == null) {
                return value;
            } else if (!isPlainObject(value)) {
                throw InvalidTypeError();
            }
            for (name in value) {
                value[name] = value_field.unserialize(value[name], mimetype);
            }
            return value;
        },

        validate: function(value, mimetype) {
            var error;

            this._super.apply(this, arguments);

            for (var k in value) {
                if (value.hasOwnProperty(k)) {
                    try {
                        this.value.validate(value[k]);
                    } catch (e) {
                        if (!error) {
                            error = CompoundError(null, {structure: {}});
                        }
                        error.structure[k] = [e];
                    }
                }
            }

            if (error) {
                throw error;
            }

            return this;
        }
    });

    fields.SequenceField = Field.extend({
        structural: true,

        extract: function(subject) {
            var item = this.item, extraction = [], value;
            if (!isArray(subject)) {
                return subject;
            }
            for (var i = 0, l = subject.length; i < l; i++) {
                value = subject[i];
                if (item.structural && value !== null) {
                    value = item.extract(value);
                }
                extraction[i] = value;
            }
            return extraction;
        },

        serialize: function(value, mimetype) {
            var item = this.item;
            if (value == null) {
                return value;
            } else if (!isArray(value)) {
                throw InvalidTypeError();
            }
            for (var i = 0, l = value.length; i < l; i++) {
                value[i] = item.serialize(value[i], mimetype);
            }
            if (mimetype === URLENCODED) {
                value = urlencodeSequence(value);
            }
            return value;
        },

        unserialize: function(value, mimetype) {
            var item = this.item;
            if (value == null) {
                return value;
            } else if (!isArray(value)) {
                throw InvalidTypeError();
            }
            for (var i = 0, l = value.length; i < l; i++) {
                value[i] = item.unserialize(value[i], mimetype);
            }
            return value;
        },

        validate: function(value, mimetype) {
            var i, j, l, error, failed;

            this._super.apply(this, arguments);

            if (value.length > this.max_length) {
                throw MaxLengthError('field cannot contain more than ' +
                    this.max_length + ' items');
            }
            if (value.length < this.min_length) {
                throw MinLengthError('field must contain at least one item');
            }
            for (i = 0, l = value.length; i < l; i++) {
                failed = false;
                try {
                    this.item.validate(value[i], undefined, undefined, value.hasOwnProperty(i));
                } catch (e) {
                    if (! (e instanceof ValidationError)) {
                        throw e;
                    }
                    failed = true;
                    if (!error) {
                        error = CompoundError(null, {structure: []});
                        for (j = 0; j < i; j++) {
                            error.structure.push(null);
                        }
                    }
                    error.structure.push([e]);
                }
                if (!failed && error) {
                    error.structure.push(null);
                }
            }

            if (error) {
                throw error;
            }

            return this;
        }
    });

    fields.StructureField = Field.extend({
        structural: true,

        extract: function(subject) {
            var structure = this._get_structure(subject), extraction = {}, name, value, field;
            if (!isObject(subject)) {
                return subject;
            }
            for (name in structure) {
                field = structure[name];
                if (field != null) {
                    value = subject[name];
                    if (value !== undefined) {
                        if (field.structural) {
                            if (value !== null) {
                                extraction[name] = field.extract(value);
                            }
                        } else {
                            extraction[name] = value;
                        }
                    }
                }
            }
            return extraction;
        },

        // todo: support redefinition of polymorphic structures
        redefine: function(redefinitions) {
            var structure = {}, params;
            for (var name in this.structure) {
                if (this.structure.hasOwnProperty(name)) {
                    if (redefinitions.hasOwnProperty(name) && redefinitions[name]) {
                        structure[name] = redefinitions[name];
                    } else {
                        structure[name] = this.structure[name];
                    }
                }
            }

            params = {structure: structure};
            for (var name in this) {
                if (this.hasOwnProperty(name) && name !== 'structure') {
                    params[name] = this[name];
                }
            }

            return fields.StructureField(params);
        },

        serialize: function(value, mimetype, options) {
            var structure, name, field, errors;
            if (value == null) {
                return value;
            } else if (!isPlainObject(value)) {
                throw InvalidTypeError();
            }

            structure = this._get_structure(value);
            for (name in value) {
                if (value.hasOwnProperty(name)) {
                    field = structure[name];
                    if (field == null) {
                        if (!options || !options.ignoreUnknownFields) {
                            throw fields.UnknownFieldError('attempt to serialize "'+name+'"');
                        }
                        continue;
                    }
                    if (field.structural && value[name] == null) {
                        delete value[name];
                    } else {
                        try {
                            value[name] = field.serialize(value[name], mimetype);
                        } catch (e) {
                            (errors = errors || {})[name] = [e];
                        }
                    }
                }
            }

            for (name in structure) {
                if (structure.hasOwnProperty(name)) {
                    if (structure[name].required && typeof value[name] === 'undefined') {
                        (errors = errors || {})[name] =
                            [NonNullError('missing required field "' + name + '"')];
                    }
                }
            }

            if (errors) {
                throw ValidationError('there were errors in validation', {
                    errors: errors
                });
            }
            
            if (mimetype === URLENCODED && (!options || !options.outermost)) {
                value = urlencodeMapping(value);
            }
            return value;
        },

        unserialize: function(value, mimetype) {
            var structure, name;
            if (value == null) {
                return value;
            } else if (!isPlainObject(value)) {
                throw InvalidTypeError();
            }

            structure = this._get_structure(value);
            for (name in value) {
                if (value.hasOwnProperty(name)) {
                    value[name] = structure[name].unserialize(value[name], mimetype);
                }
            }
            return value;
        },

        _get_structure: function(value) {
            var identity, structure;
            if (this.polymorphic_on != null) {
                identity = value[this.polymorphic_on.name];
                if (identity != null) {
                    structure = this.structure[identity];
                    if (structure != null) {
                        return structure;
                    } else {
                        throw new Error('invalid polymorphic identity');
                    }
                } else {
                    throw new Error('missing polymorphic identity');
                }
            } else {
                return this.structure;
            }
        },

        validate: function(value, mimetype, options) {
            var name, field, structure, error, ops,
                wrapValidateFieldsFunction = function(f, name, separator) {
                    separator = separator == null? '.' : separator;
                    return function(fieldName) {
                        var args = Array.prototype.slice.call(arguments, 0);
                        args[0] = fieldName? name + separator + fieldName : name;
                        return f.apply(this, args);
                    };
                };

            this._super.apply(this, arguments);

            structure = this._get_structure(value);
            for (name in value) {
                if (value.hasOwnProperty(name)) {
                    field = structure[name];
                    if (field == null) {
                        if (!options || !options.ignoreUnknownFields) {
                            throw fields.UnknownFieldError(
                                    'attempt to validate "'+name+'"');
                        }
                        continue;
                    }
                    try {
                        ops = options && options.validateField?
                            _.extend({}, options, {
                                validateField: wrapValidateFieldsFunction(
                                                   options.validateField, name)
                            }) :
                            options;
                        field.validate(value[name], mimetype, ops, name.hasOwnProperty(value));
                    } catch (e) {
                        error = error || CompoundError(null, {structure: {}});
                        error.structure[name] = [e];
                    }
                }
            }

            for (name in structure) {
                if (structure.hasOwnProperty(name)) {
                    if (structure[name].required && value[name] == null) {
                        error = error || CompoundError(null, {structure: {}});
                        if (!error.structure[name]) {
                            error.structure[name] = [];
                        }
                        error.structure[name].push(
                                NonNullError('missing required field "' +
                                    name + '"'));
                    }
                }
            }

            if (error) {
                throw error;
            }

            return this;
        }
    });

    fields.SurrogateField = Field.extend({
        _unserializeValue: function(value, mimetype) {
            if (!isPlainObject(value)) {
                throw InvalidTypeError();
            }
            return value;
        }
    });

    fields.TextField = Field.extend({
        _validateType: function(value) {
            if (!isString(value)) {
                throw InvalidTypeError();
            }
        },
        _validateValue: function(value) {
            if (this.nonnull && isString(value)) {
                if (this.strip) {
                    value = trim(value);
                }
                if (!value) {
                    throw BlankTextError('field cannot be left blank');
                }
            }
        }
    });

    fields.TimeField = Field.extend({
        _serializeValue: function(value, mimetype) {
            return value.toISOString();
        },

        _unserializeValue: function(value, mimetype) {
            if (!isString(value)) {
                throw InvalidTypeError();
            }
            return datetime.Time.fromISO8601(value);
        },

        _validateType: function(value) {
            if (!(value instanceof datetime.Time)) {
                throw InvalidTypeError();
            }
        }
    });

    fields.TokenField = Field.extend({
        _validateType: function(value) {
            if (!isString(value)) {
                throw InvalidTypeError();
            }
        }
    });

    fields.TupleField = Field.extend({
        structural: true,

        extract: function(subject) {
            var values = this.values, extraction = [], field, value;
            if (!isArray(subject)) {
                return subject;
            }
            for (var i = 0, l = subject.length; i < l; i++) {
                field = values[i];
                value = subject[i];
                if (field.structural && value != null) {
                    value = field.extract(value);
                }
                extraction[i] = value;
            }
            return extraction;
        },

        serialize: function(value, mimetype) {
            var values = this.values, field;
            if (value == null) {
                return value;
            } else if (!isArray(value)) {
                throw InvalidTypeError();
            }
            if (value.length != values.length) {
                throw ValidationError('invalid');
            }
            for (var i = 0, l = value.length; i < l; i++) {
                value[i] = values[i].serialize(value[i], mimetype);
            }
            if (mimetype === URLENCODED) {
                value = urlencodeSequence(value);
            }
            return value;
        },

        unserialize: function(value, mimetype) {
            var values = this.values, field;
            if (value == null) {
                return value;
            } else if (!isArray(value)) {
                throw InvalidTypeError();
            }
            if (value.length != values.length) {
                throw ValidationError('invalid');
            }
            for (var i = 0, l = value.length; i < l; i++) {
                value[i] = values[i].unserialize(value[i], mimetype);
            }
            return value;
        },

        validate: function(value, mimetype) {
            var i, j, l, error, failed;

            this._super.apply(this, arguments);

            for (i = 0, l = value.length; i < l; i++) {
                failed = false;
                try {
                    this.values[i].validate(value[i]);
                } catch (e) {
                    if (! (e instanceof ValidationError)) {
                        throw e;
                    }
                    failed = true;
                    if (!error) {
                        error = CompoundError(null, {structure: []});
                        for (j = 0; j < i; j++) {
                            error.structure.push(null);
                        }
                    }
                    error.structure.push([e]);
                }
                if (!failed && error) {
                    error.structure.push(null);
                }
            }

            if (error) {
                throw error;
            }

            return this;
        }
    });

    fields.UnionField = Field.extend({
        structural: true,

        serialize: function(value, mimetype) {
            var field;
            if (value == null) {
                return value;
            }
            for (var i = 0, l = this.fields.length; i < l; i++) {
                field = this.fields[i];
                try {
                    return field.serialize(value, mimetype);
                } catch (error) {
                    if (!(error instanceof InvalidTypeError)) {
                        throw error;
                    }
                }
            }
            throw InvalidTypeError();
        },

        unserialize: function(value, mimetype) {
            var field;
            if (value == null) {
                return value;
            }
            for (var i = 0, l = this.fields.length; i < l; i++) {
                field = this.fields[i];
                try {
                    return field.unserialize(value, mimetype);
                } catch (error) {
                    if (!(error instanceof InvalidTypeError)) {
                        throw error;
                    }
                }
            }
            throw InvalidTypeError();
        },

        // as of this commit we have no API's that use the UnionField. i don't
        // think it's actually something we support, but in the interest of not
        // getting 'method-not-implemented' errors, we're adding a boilerplate
        // 'validate' method here.
        validate: function(value, mimetype) {
            var i, j, l, error, failed;

            this._super.apply(this, arguments);

            for (i = 0, l = value.length; i < l; i++) {
                failed = false;
                try {
                    this.fields[i].validate(value[i]);
                } catch (e) {
                    if (! (e instanceof ValidationError)) {
                        throw e;
                    }
                    failed = true;
                    if (!error) {
                        error = CompoundError(null, {structure: []});
                        for (j = 0; j < i; j++) {
                            error.structure.push(null);
                        }
                    }
                    error.structure.push([e]);
                }
                if (!failed && error) {
                    error.structure.push(null);
                }
            }

            if (error) {
                throw error;
            }

            return this;
        }
    });

    fields.UUIDField = Field.extend({
        _validateType: function(value) {
            if (!isString(value)) {
                throw InvalidTypeError();
            }
        }
    });

    // this is just a shell that allows the local models to not need to specify
    // a rigid schema.
    fields.FlexibleSchema = Class.extend({
        extract: function(subject) {
            return _.reduce(subject, function(memo, val, key) {
                if (key[0] !== '_' && key !== 'cid') {
                    memo[key] = val;
                }
                return memo;
            }, {});
        },
        structural: true // just so Request doesn't choke
    });

    $.extend(fieldmapping, {
        "boolean": fields.BooleanField,
        "date": fields.DateField,
        "datetime": fields.DateTimeField,
        "definition": fields.DefinitionField,
        "email": fields.EmailField,
        "enumeration": fields.EnumerationField,
        "float": fields.FloatField,
        "integer": fields.IntegerField,
        "map": fields.MapField,
        "sequence": fields.SequenceField,
        "structure": fields.StructureField,
        "text": fields.TextField,
        "time": fields.TimeField,
        "token": fields.TokenField,
        "tuple": fields.TupleField,
        "union": fields.UnionField,
        "uuid": fields.UUIDField
    });

    return fields;
});
