define([
    'vendor/underscore',
    'class',
    'datetime'
], function(_, Class, datetime) {
    var isNumber = _.isNumber, isString = _.isString,
        URLENCODED = 'application/x-www-form-urlencoded';

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
            return this._serializeValue(value, mimetype);
        },
        unserialize: function(value, mimetype) {
            if (value == null) {
                return value;
            }
            return this._unserializeValue(value, mimetype);
        },
        validate: function(value, mimetype) {
            value = this._normalizeValue(value);
            if (value == null) {
                if (this.nonnull) {
                    throw new ValidationError('nonnull');
                } else {
                    return value;
                }
            }
            this._validateValue(value);
            if (mimetype) {
                value = this.serialize(value, mimetype, true);
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
        _validateValue: function(value) {}
    });

    var fields = {
        Field: Field
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
        _validateValue: function(value) {
            if (!_.isBoolean(value)) {
                throw new ValidationError('invalid');
            }
        }
    });

    fields.ConstantField = Field.extend({
        _validateValue: function(value) {
            if (value !== this.value) {
                throw new ValidationError('invalid');
            }
        }
    });

    fields.DateField = Field.extend({
        _serializeValue: function(value, mimetype) {
            return datetime.toISO8601(value);
        }
    });

    fields.DateTimeField = Field.extend({
        _serializeValue: function(value, mimetype) {
            return datetime.toISO8601(value, true);
        },
        _unserializeValue: function(value, mimetype) {
            return datetime.fromISO8601(value);
        },
        _validateValue: function(value) {
            if (!_.isDate(value)) {
                throw new ValidationError('invalid');
            }
        }
    });

    fields.EnumerationField = Field.extend({
        _normalizeValue: function(value) {
            return (value === '' ? null : value);
        },
        _validateValue: function(value) {
            if (_.indexOf(this.enumeration, value) < 0) {
                throw new ValidationError('invalid');
            }
        }
    });

    fields.IntegerField = Field.extend({
        _normalizeValue: function(value) {
            return (value === '' ? null : value);
        },
        _serializeValue: function(value, mimetype) {
            var number = Number(value);
            if (!_.isNaN(number)) {
                value = number;
            }
            return value;
        },
        _validateValue: function(value) {
            if (!(isNumber(value) && Math.floor(value) === value)) {
                throw new ValidationError('invalid');
            }
            if (isNumber(this.minimum) && value < this.minimum) {
                throw new ValidationError('invalid');
            }
            if (isNumber(this.maximum) && value > this.maximum) {
                throw new ValidationError('invalid');
            }
        }
    });

    fields.FloatField = Field.extend({
        _normalizeValue: function(value) {
            return (value === '' ? null : value);
        },
        _serializeValue: function(value, mimetype) {
            var number = Number(value);
            if (!_.isNaN(number)) {
                value = number;
            }
            return value;
        },
        _validateValue: function(value) {
            if (!(isNumber(value) && Math.floor(value) === value)) {
                throw new ValidationError('invalid');
            }
            if (isNumber(this.minimum) && value < this.minimum) {
                throw new ValidationError('invalid');
            }
            if (isNumber(this.maximum) && value > this.maximum) {
                throw new ValidationError('invalid');
            }
        }
    });

    fields.MapField = Field.extend({
        structural: true,
        extract: function(subject) {
            var value_field = this.value, extraction = {}, name, value;
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
        serialize: function(value, mimetype) {
            var value_field = this.value;
            if (value == null) {
                return value;
            }
            for (name in value) {
                if (value_field.structural && value[name] == null) {
                    delete value[name];
                } else {
                    value[name] = value_field.serialize(value[name], mimetype);
                }
            }
            if (mimetype === URLENCODED) {
                value = urlencodeMapping(value);
            }
            return value;
        },
        unserialize: function(value, mimetype) {
            var value_field = this.value, name;
            if (value == null) {
                return value;
            }
            for (name in value) {
                value[name] = value_field.unserialize(value[name], mimetype);
            }
            return value;
        }
    });

    fields.SequenceField = Field.extend({
        structural: true,
        extract: function(subject) {
            var item = this.item, extraction = [], value;
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
            }
            for (var i = 0, l = value.length; i < l; i++) {
                value[i] = item.unserialize(value[i], mimetype);
            }
            return value;
        }
    });

    fields.StructureField = Field.extend({
        structural: true,
        extract: function(subject) {
            var structure = this.structure, extraction = {}, name, value, field;
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
        serialize: function(value, mimetype) {
            var structure = this.structure, name, field;
            if (value == null) {
                return value;
            }
            for (name in value) {
                field = structure[name];
                if (field == null) {
                    throw new Error("attempt to serialize unknown field '" + name + "'");
                }
                if (field.structural && value[name] == null) {
                    delete value[name];
                } else {
                    value[name] = field.serialize(value[name], mimetype);
                }
            }
            if (mimetype === URLENCODED) {
                value = urlencodeMapping(value);
            }
            return value;
        },
        unserialize: function(value, mimetype) {
            var structure = this.structure, name;
            if (value == null) {
                return value;
            }
            for (name in value) {
                value[name] = structure[name].unserialize(value[name], mimetype);
            }
            return value;
        }
    });

    fields.TextField = Field.extend({
        
    });

    fields.TimeField = Field.extend({
        _serializeValue: function(value, mimetype) {
            if (value != null) {
                value = value.toISOString();
            }
            return value;
        },
        _unserializeValue: function(value, mimetype) {
            if (value != null) {
                value = new datetime.Time(value);
            }
            return value;
        },
        _validateValue: function(value) {
            if (!(value instanceof datetime.Time)) {
                throw new ValidationError('invalid');
            }
        }
    });

    fields.TupleField = Field.extend({
        structural: true,
        extract: function(subject) {
            var values = this.values, extraction = [], field, value;
            if (subject.length != values.length) {
                throw new Error();
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
            }
            if (value.length != values.length) {
                throw new ValidationError('invalid');
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
            }
            if (value.length != values.length) {
                throw new ValidationError('invalid');
            }
            for (var i = 0, l = value.length; i < l; i++) {
                value[i] = values[i].unserialize(value[i], mimetype);
            }
            return value;
        }
    });

    return fields;
});
