/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual, notStrictEqual, raises*/
define([
    'vendor/underscore',
    'vendor/uuid',
    './../datetime',
    './../fields'
], function(_, uuid, datetime, fields) {
    var URLENCODED = 'application/x-www-form-urlencoded';

    function assertValidation(schema, value, assertion) {
        var threw = false;
        try {
            schema.validate(value);
        } catch (e) {
            threw = true;
            if (! (e instanceof fields.ValidationError)) {
                throw e;
            }
            assertion(e);
        }
        ok(threw, 'validation should have failed');
    }

    module('boolean fields');

    test('serialization', function() {
        var field = fields.BooleanField();
        strictEqual(field.serialize(null), null);
        _.each([true, 'true', 'True'], function(value) {
            strictEqual(field.serialize(value), true);
            strictEqual(field.serialize(value, URLENCODED), 'true');
        });
        _.each([false, 'false', 'False'], function(value) {
            strictEqual(field.serialize(value), false);
            strictEqual(field.serialize(value, URLENCODED), 'false');
        });
    });

    test('unserialization', function() {
        var field = fields.BooleanField();
        strictEqual(field.unserialize(null), null);
        strictEqual(field.unserialize(true), true);
        strictEqual(field.unserialize(false), false);
    });

    test('invalid types', function() {
        var field = fields.BooleanField();
        _.each([new Date(), 1, 1.1, {}, [], new datetime.Time(), ''], function(value) {
            raises(function() {field.serialize(value);}, fields.InvalidTypeError);
            raises(function() {field.unserialize(value);}, fields.InvalidTypeError);
        });
    });

    module('date fields');

    test('serialization', function() {
        var field = fields.DateField();
        strictEqual(field.serialize(null), null);

        var date = new Date(2000, 0, 1);
        strictEqual(field.serialize(date), '2000-01-01');
    });

    test('unserialization', function() {
        var field = fields.DateField();
        strictEqual(field.unserialize(null), null);

        var date = new Date(2000, 0, 1);
        ok(datetime.equivalent(field.unserialize('2000-01-01'), date));
    });

    test('invalid types', function() {
        var field = fields.DateField();
        _.each([true, 1, 1.1, {}, [], new datetime.Time(), ''], function(value) {
            raises(function() {field.serialize(value);}, fields.InvalidTypeError);
            raises(function() {field.unserialize(value);}, fields.InvalidTypeError);
        });
    });

    module('datetime fields');

    test('serialization', function() {
        var field = fields.DateTimeField();
        strictEqual(field.serialize(null), null);

        var date = new Date(2000, 0, 1, 0, 0, 0, 0);
        strictEqual(field.serialize(date), datetime.toISO8601(date, true));
    });

    test('unserialization', function() {
        var field = fields.DateTimeField();
        strictEqual(field.unserialize(null), null);

    });

    test('invalid types', function() {
        var field = fields.DateTimeField();
        _.each([true, 1, 1.1, {}, [], new datetime.Time(), ''], function(value) {
            raises(function() {field.serialize(value);}, fields.InvalidTypeError);
            raises(function() {field.unserialize(value);}, fields.InvalidTypeError);
        });
    });

    module('enumeration fields');

    test('serialization', function() {
        var field = fields.EnumerationField({enumeration: [true, 1, 1.1, 'test']});
        strictEqual(field.serialize(null), null);
        strictEqual(field.serialize(''), null);
        _.each(field.enumeration, function(value) {
            strictEqual(field.serialize(value), value);
        });
        strictEqual(field.serialize(true, URLENCODED), 'true');
    });

    test('unserialization', function() {
        var field = fields.EnumerationField({enumeration: [true, 1, 1.1, 'test']});
        strictEqual(field.unserialize(null), null);
        _.each(field.enumeration, function(value) {
            strictEqual(field.unserialize(value), value);
        });
    });

    test('invalid types', function() {
        var field = fields.EnumerationField({enumeration: [true, 1, 1.1, 'test']});
        _.each([false, new Date(), 0, 0.1, {}, [], new datetime.Time(), 'invalid'], function(value) {
            raises(function() {field.serialize(value);}, fields.InvalidTypeError);
            raises(function() {field.unserialize(value);}, fields.InvalidTypeError);
        });
    });

    module('integer fields');

    test('serialization', function() {
        var field = fields.IntegerField();
        strictEqual(field.serialize(null), null);
        strictEqual(field.serialize(1), 1);
        strictEqual(field.serialize('1'), 1);
    });

    test('unserialization', function() {
        var field = fields.IntegerField();
        strictEqual(field.unserialize(null), null);
        strictEqual(field.unserialize(1), 1);
    });

    test('invalid types', function() {
        var field = fields.IntegerField();
        _.each([false, new Date(), 0.1, {}, [], new datetime.Time(), ''], function(value) {
            raises(function() {field.serialize(value);}, fields.InvalidTypeError);
            raises(function() {field.unserialize(value);}, fields.InvalidTypeError);
        });
    });

    module('float fields');

    test('serialization', function() {
        var field = fields.FloatField();
        strictEqual(field.serialize(null), null);
        strictEqual(field.serialize(1), 1);
        strictEqual(field.serialize(1.2), 1.2);
        strictEqual(field.serialize('1.2'), 1.2);
    });

    test('unserialization', function() {
        var field = fields.FloatField();
        strictEqual(field.unserialize(null), null);
        strictEqual(field.unserialize(1.2), 1.2);
    });

    test('invalid types', function() {
        var field = fields.FloatField();
        _.each([false, new Date(), {}, [], new datetime.Time(), ''], function(value) {
            raises(function() {field.serialize(value);}, fields.InvalidTypeError);
            raises(function() {field.unserialize(value);}, fields.InvalidTypeError);
        });
    });

    module('map fields');

    test('serialization', function() {
        var field = fields.MapField({value: fields.IntegerField()});
        strictEqual(field.serialize(null), null);
        deepEqual(field.serialize({}), {});
        deepEqual(field.serialize({a: 1}), {a: 1});
        deepEqual(field.serialize({a: 1, b: 2}), {a: 1, b: 2});
        strictEqual(field.serialize({a: '1'}).a, 1);

        strictEqual(field.serialize({}, URLENCODED), '{}');
        strictEqual(field.serialize({a: 1}, URLENCODED), '{a:1}');
    });

    test('unserialization', function() {
        var field = fields.MapField({value: fields.IntegerField()});
        strictEqual(field.unserialize(null), null);
        deepEqual(field.unserialize({}), {});
        deepEqual(field.unserialize({a: 1}), {a: 1});
        deepEqual(field.unserialize({a: 1, b: 2}), {a: 1, b: 2});
    });

    test('invalid types', function() {
        var field = fields.MapField({value: fields.IntegerField()});
        _.each([false, new Date(), 1, 1.1, [], new datetime.Time(), ''], function(value) {
            raises(function() {field.serialize(value);}, fields.InvalidTypeError);
            raises(function() {field.unserialize(value);}, fields.InvalidTypeError);
        });
    });

    test('extraction', function() {
        var field = fields.MapField({value: fields.IntegerField()});
        var subject = {'a': 1, 'b': 2, 'c': 3};
        var extraction = field.extract(subject);

        deepEqual(extraction, subject);
        notStrictEqual(extraction, subject);
    });

    module('sequence fields');

    test('serialization', function() {
        var field = fields.SequenceField({item: fields.IntegerField()});
        strictEqual(field.serialize(null), null);
        deepEqual(field.serialize([]), []);
        deepEqual(field.serialize([1]), [1]);
        deepEqual(field.serialize([1,2]), [1,2]);
        strictEqual(field.serialize(['1'])[0], 1);

        strictEqual(field.serialize([], URLENCODED), '[]');
        strictEqual(field.serialize([1], URLENCODED), '[1]');
        strictEqual(field.serialize([1,2], URLENCODED), '[1,2]');
    });

    test('unserialization', function() {
        var field = fields.SequenceField({item: fields.IntegerField()});
        strictEqual(field.unserialize(null), null);
        deepEqual(field.unserialize([]), []);
        deepEqual(field.unserialize([1]), [1]);
        deepEqual(field.unserialize([1,2]), [1,2]);
    });

    test('invalid types', function() {
        var field = fields.SequenceField({item: fields.IntegerField()});
        _.each([false, new Date(), 1, 1.1, {}, new datetime.Time(), ''], function(value) {
            raises(function() {field.serialize(value);}, fields.InvalidTypeError);
            raises(function() {field.unserialize(value);}, fields.InvalidTypeError);
        });
    });

    module('structure fields');

    test('serialization', function() {
        var field = fields.StructureField({structure: {
            bool: fields.BooleanField(),
            integer: fields.IntegerField(),
            text: fields.TextField()
        }});
        strictEqual(field.serialize(null), null);
        deepEqual(field.serialize({}), {});
        deepEqual(field.serialize({bool: true}), {bool: true});
        deepEqual(field.serialize({bool: 'true', integer: 1}), {bool: true, integer: 1});
        deepEqual(field.serialize({bool: false, integer: 2, text: 'more'}),
            {bool: false, integer: 2, text: 'more'});

        strictEqual(field.serialize({}, URLENCODED), '{}');
        strictEqual(field.serialize({text: 'text'}, URLENCODED), '{text:text}');
    });

    test('unserialization', function() {
        var field = fields.StructureField({structure: {
            bool: fields.BooleanField(),
            integer: fields.IntegerField(),
            text: fields.TextField()
        }});
        strictEqual(field.unserialize(null), null);
        deepEqual(field.unserialize({}), {});
        deepEqual(field.unserialize({bool: true}), {bool: true});
        deepEqual(field.unserialize({bool: false, integer: 2, text: 'more'}),
            {bool: false, integer: 2, text: 'more'});
    });

    test('invalid types', function() {
        var field = fields.StructureField({structure: {
            bool: fields.BooleanField(),
            integer: fields.IntegerField(),
            text: fields.TextField()
        }});
        _.each([false, new Date(), 1, 1.1, [], new datetime.Time(), ''], function(value) {
            raises(function() {field.serialize(value);}, fields.InvalidTypeError);
            raises(function() {field.unserialize(value);}, fields.InvalidTypeError);
        });
    });

    test('extraction', function() {
        var field = fields.StructureField({structure: {
            bool: fields.BooleanField(),
            integer: fields.IntegerField()
        }});
        var subject = {bool: true, integer: 1, extra: 'extra'};
        var extraction = field.extract(subject);

        deepEqual(extraction, {bool: true, integer: 1});
        notStrictEqual(extraction, subject);
    });

    module('text fields');

    test('serialization', function() {
        var field = fields.TextField();
        _.each([null, '', 'text'], function(value) {
            strictEqual(field.serialize(value), value);
        });
    });

    test('unserialization', function() {
        var field = fields.TextField();
        _.each([null, '', 'text'], function(value) {
            strictEqual(field.unserialize(value), value);
        });
    });

    test('invalid types', function() {
        var field = fields.TextField();
        _.each([false, new Date(), 1, 0.1, {}, [], new datetime.Time()], function(value) {
            raises(function() {field.serialize(value);}, fields.InvalidTypeError);
            raises(function() {field.unserialize(value);}, fields.InvalidTypeError);
        });
    });

    test('validation', function() {
        var tf1 = fields.TextField({strip: true,    nonnull: true}),
            tf2 = fields.TextField({strip: false,   nonnull: true}),
            tf3 = fields.TextField({strip: true,    nonnull: false}),
            tf4 = fields.TextField({strip: false,   nonnull: false});

        assertValidation(tf1, ' ', function(e) {
            equal(e.token, 'blanktexterror');
        });
        assertValidation(tf1, '', function(e) {
            equal(e.token, 'blanktexterror');
        });

        tf2.validate(' '); // should not trhow error
        assertValidation(tf2, '', function(e) {
            equal(e.token, 'blanktexterror');
        });

        tf3.validate(' '); // should not throw error
        tf3.validate(''); // should not throw error

        tf4.validate(' '); // should not throw error
        tf4.validate(''); // should not throw error

    });

    module('time fields');

    test('serialization', function() {
        var field = fields.TimeField();
        strictEqual(field.serialize(null), null);

        var time = new datetime.Time(0, 0, 0);
        strictEqual(field.serialize(time), '00:00:00');
    });

    test('unserialization', function() {
        var field = fields.TimeField();
        strictEqual(field.unserialize(null), null);

        var time = new datetime.Time(0, 0, 0);
        ok(datetime.equivalent(field.unserialize('00:00:00'), time));
    });

    test('invalid types', function() {
        var field = fields.TimeField();
        _.each([true, new Date(), 1, 1.1, {}, [], ''], function(value) {
            raises(function() {field.serialize(value);}, fields.InvalidTypeError);
            raises(function() {field.unserialize(value);}, fields.InvalidTypeError);
        });
    });

    module('tuple fields');

    test('serialization', function() {
        var field = fields.TupleField({values: [
            fields.BooleanField(), fields.IntegerField(), fields.TextField()
        ]});
        strictEqual(field.serialize(null), null);
        deepEqual(field.serialize([true, 1, '']), [true, 1, '']);
        deepEqual(field.serialize(['true', 1, '']), [true, 1, '']);
        strictEqual(field.serialize([true, 1, ''], URLENCODED), '[true,1,]');

        raises(function() {field.serialize([true, 1]);}, fields.ValidationError);
    });

    test('unserialization', function() {
        var field = fields.TupleField({values: [
            fields.BooleanField(), fields.IntegerField(), fields.TextField()
        ]});
        strictEqual(field.unserialize(null), null);
        deepEqual(field.unserialize([true, 1, '']), [true, 1, '']);
        raises(function() {field.unserialize([true, 1]);}, fields.ValidationError);
    });

    test('invalid types', function() {
        var field = fields.TupleField({values: [
            fields.BooleanField(), fields.IntegerField(), fields.TextField()
        ]});
        _.each([false, new Date(), 1, 1.1, {}, new datetime.Time(), ''], function(value) {
            raises(function() {field.serialize(value);}, fields.InvalidTypeError);
            raises(function() {field.unserialize(value);}, fields.InvalidTypeError);
        });
    });

    module('union fields');

    test('serialization', function() {
        var field = fields.UnionField({fields: [
            fields.BooleanField(), fields.IntegerField(), fields.TextField()
        ]});
        strictEqual(field.serialize(null), null);
        _.each([true, false, 0, 1, '', 'text'], function(value) {
            strictEqual(field.serialize(value), value);
        });
    });

    test('unserialization', function() {
        var field = fields.UnionField({fields: [
            fields.BooleanField(), fields.IntegerField(), fields.TextField()
        ]});
        strictEqual(field.unserialize(null), null);
        _.each([true, false, 0, 1, '', 'text'], function(value) {
            strictEqual(field.unserialize(value), value);
        });
    });

    test('invalid types', function() {
        var field = fields.UnionField({fields: [
            fields.BooleanField(), fields.IntegerField(), fields.TextField()
        ]});
        _.each([new Date(), 1.1, {}, [], new datetime.Time()], function(value) {
            raises(function() {field.serialize(value);}, fields.InvalidTypeError);
            raises(function() {field.unserialize(value);}, fields.InvalidTypeError);
        });
    });

    module('validation errors');

    test('instanceof Error', function() {
        ok(fields.ValidationError() instanceof Error);
    });

    test('toString is validationerror', function() {
        equal(fields.ValidationError().toString(), 'validationerror');
    });

    test('name property equals token property', function() {
        var e = fields.ValidationError();
        equal(e.name, e.token);
    });

    test('messages work', function() {
        equal(fields.ValidationError('foo').toString(), 'validationerror: foo');
    });

    test('inheriting maintains instanceof correctly', function() {
        ok(fields.InvalidTypeError() instanceof Error);
        ok(fields.InvalidTypeError() instanceof fields.ValidationError);
    });

    test('tokens inherit correctly', function() {
        equal(fields.InvalidTypeError().toString(), 'invalidtypeerror');
        equal(fields.InvalidTypeError().token, 'invalidtypeerror');
        equal(fields.InvalidTypeError().name, 'invalidtypeerror');
    });

    module('validating multiple items');

    test('map', function() {
        assertValidation(fields.MapField({
                nonnull: false,
                required: false,
                value: fields.TextField({
                    nonnull: true,
                    required: false,
                    strip: true
                })
            }),
            {foo: 123, bar: 456},
            function(e) {
                ok(_.isObject(e.structure), 'error structure is object');
                ok(_.isArray(e.structure.foo), 'array of errors for foo');
                equal(e.structure.foo.length, 1, 'foo has only one error');
                equal(e.structure.foo[0].token, 'invalidtypeerror',
                    'foo is an invalidtypeerror');
                equal(e.structure.bar.length, 1, 'bar has only one error');
                equal(e.structure.bar[0].token, 'invalidtypeerror',
                    'bar is an invalidtypeerror');
            });
    });

    test('sequence', function() {
        assertValidation(fields.SequenceField({
                nonnull: false,
                required: false,
                unique: false,
                item: fields.TextField({
                    nonnull: true,
                    required: false,
                    strip: true
                })
            }),
            [123, 'abc', null],
            function(e) {
                ok(_.isArray(e.structure), 'error structure is array');
                equal(e.structure.length, 3,
                    'error structure has one item for each item in value');
                ok(_.isArray(e.structure[0]), 'array of errors for first item');
                equal(e.structure[0].length, 1, 'first item has only one error');
                equal(e.structure[0][0].token, 'invalidtypeerror',
                    'first item is an invalidtypeerror');
                ok(e.structure[1] == null, 'second item is null');
                ok(_.isArray(e.structure[2]), 'array of errors for last item');
                equal(e.structure[2].length, 1, 'last item has only one error');
                equal(e.structure[2][0].token, 'nonnull',
                    'last item is an nonnull');
            });
    });

    test('structure', function() {
        assertValidation(fields.StructureField({
                nonnull: false,
                required: false,
                strict: true,
                structure: {
                    id: fields.UUIDField({nonnull: true, required: true}),
                    name: fields.TextField({
                        nonnull: true,
                        required: true,
                        strip: true
                    }),
                    age: fields.IntegerField({nonnull: true, required: true}),
                    description: fields.TextField({
                        nonnull: true,
                        required: true
                    })
                }
            }),
            {name: 123, age: 123, description: 'foobar'},
            function(e) {
                ok(_.isObject(e.structure), 'error structure is object');
                ok(_.isArray(e.structure.name), 'array of errors for name');
                equal(e.structure.name.length, 1, 'name has only one error');
                equal(e.structure.name[0].token, 'invalidtypeerror',
                    'name is an invalidtypeerror');
                equal(e.structure.id.length, 1, 'id has only one error');
                equal(e.structure.id[0].token, 'nonnull',
                    'id is a nonnull error');
                ok(e.structure.description == null, 'no errors for description');
            });
    });

    test('tuple', function() {
        assertValidation(fields.TupleField({
                nonnull: true,
                required: true,
                values: [
                    fields.UUIDField({nonnull: true, required: true}),
                    fields.TextField({
                        nonnull: true,
                        required: true,
                        strip: true
                    }),
                    fields.IntegerField({nonnull: true, required: true})
                ]
            }),
            [null, 123, 123],
            function(e) {
                ok(_.isArray(e.structure), 'error structure is an array');
                ok(_.isArray(e.structure[0]), 'array of errors for first item');
                equal(e.structure[0].length, 1, 'first item has only one error');
                equal(e.structure[0][0].token, 'nonnull',
                    'first item error is an invalidtypeerror');
                equal(e.structure[1].length, 1, 'second item has only one error');
                equal(e.structure[1][0].token, 'invalidtypeerror',
                    'second item is an invalidtypeerror error');
                ok(e.structure[2] == null, 'last item has no errors');
            });
    });

    test('union', function() {
        assertValidation(fields.UnionField({
                name: "union_field",
                nonnull: true,
                required: true,
                fields: [
                    fields.TextField({
                        nonnull: true,
                        required: true
                    }),
                    fields.IntegerField({
                        nonnull: true,
                        required: true
                    })
                ]
            }),
            [123, 123],
            function(e) {
                ok(_.isArray(e.structure), 'error structure is an array');
                ok(_.isArray(e.structure[0]), 'array of errors for first item');
                equal(e.structure[0].length, 1, 'first item has only one error');
                equal(e.structure[0][0].token, 'invalidtypeerror',
                    'first item is an invalidtypeerror error');
                ok(e.structure[1] == null, 'last item has no errors');
            });
    });

    var nnr = {nonnull: true, required: true},
        bigSchema = fields.StructureField({
            nonnull: true,
            required: true,
            strict: true,
            structure: {
                id: fields.UUIDField(nnr),
                name: fields.TupleField(_.extend({
                    values: [fields.TextField(nnr), fields.TextField(nnr)]
                }, nnr)),
                age: fields.IntegerField(nnr),
                description: fields.TextField(nnr),
                address: fields.StructureField({
                    nonnull: true,
                    required: true,
                    strict: true,
                    structure: {
                        number: fields.IntegerField(nnr),
                        street: fields.SequenceField(_.extend({
                            unique: false,
                            item: fields.TextField(nnr)
                        }, nnr)),
                        city: fields.TextField(nnr),
                        state: fields.TextField(nnr),
                        zip: fields.TextField(nnr)
                    }
                }),
                relatives: fields.MapField(_.extend({
                    value: fields.TextField(nnr)
                }, nnr))
            }
        });

    module('serializing validation errors');

    test('serailzing StructureField error', function() {
        var s, f = fields.StructureField({
                nonnull: false,
                required: false,
                strict: true,
                structure: {
                    id: fields.UUIDField({nonnull: true, required: true}),
                    name: fields.TextField({
                        nonnull: true,
                        required: true,
                        strip: true
                    }),
                    age: fields.IntegerField({nonnull: true, required: true}),
                    description: fields.TextField({
                        nonnull: true,
                        required: true
                    })
                }
            }),
            v = {name: 123, age: 123, description: 'foobar'};
        try {
            f.validate(v);
        } catch (e) {
            s = e.serialize();
        }

        deepEqual(s, {
            name: [{token: 'invalidtypeerror'}],
            id: [{token: 'nonnull', message: 'missing required field "id"'}]
        });
    });

    test('serialize error and flatten props', function() {
        var s, m = {
                age: 23,
                description: 'foo',
                id: uuid(),
                address: {city: 'foo', number: 1},
                name: ['foo', 'bar'],
                relatives: {}
            };
        try {
            bigSchema.validate(m);
        } catch (e) {
            s = e.serialize({flatten: true});
        }

        deepEqual(s, {
          "address.state": [
            {
              "message": "missing required field \"state\"",
              "token": "nonnull"
            }
          ],
          "address.street": [
            {
              "message": "missing required field \"street\"",
              "token": "nonnull"
            }
          ],
          "address.zip": [
            {
              "message": "missing required field \"zip\"",
              "token": "nonnull"
            }
          ]
        });

    });

    module('extracting');

    test('simple fields that are undefined', function() {
        var example1 = {
                id: undefined,
                name: [123],
                age: 12,
                // description: 'foobar',
                address: {
                    number: '4515',
                    street: ['Highland Terrace', 'PO Box 1234'],
                    city: 'Austin',
                    // state: 'TX',
                    zip: 78731
                },
                relatives: {'cousin': 'Lil Wayne', 'aunt': 'Jemima'}
            };

        deepEqual(bigSchema.extract(example1), {
            name: [123],
            age: 12,
            address: {
                number: '4515',
                street: ['Highland Terrace', 'PO Box 1234'],
                city: 'Austin',
                zip: 78731
            },
            relatives: {'cousin': 'Lil Wayne', 'aunt': 'Jemima'}
        });

    });

    test('sequence fields that are undefined', function() {
        var example2 = {
                id: 123,
                // name: [123],
                age: 12,
                description: 'foobar',
                address: {
                    number: '4515',
                    street: ['Highland Terrace', 'PO Box 1234'],
                    city: 'Austin',
                    state: 'TX',
                    zip: '78731'
                },
                relatives: {'cousin': 'Lil Wayne', 'aunt': 'Jemima'}
            };

        deepEqual(bigSchema.extract(example2), {
            id: 123,
            age: 12,
            description: 'foobar',
            address: {
                number: '4515',
                street: ['Highland Terrace', 'PO Box 1234'],
                city: 'Austin',
                state: 'TX',
                zip: '78731'
            },
            relatives: {'cousin': 'Lil Wayne', 'aunt': 'Jemima'}
        });
    });

    test('structure fields that are undefined', function() {
        var example3 = {
                id: 123,
                // name: [123],
                age: 12,
                description: 'foobar',
                // address: {
                //     number: '4515',
                //     street: ['Highland Terrace', 'PO Box 1234'],
                //     city: 'Austin',
                //     state: 'TX',
                //     zip: '78731'
                // }
                relatives: {'cousin': 'Lil Wayne', 'aunt': 'Jemima'}
            };
        deepEqual(bigSchema.extract(example3), {
            id: 123,
            age: 12,
            description: 'foobar',
            relatives: {'cousin': 'Lil Wayne', 'aunt': 'Jemima'}
        });
    });

    test('tuple fields that are undefined', function() {
        var example4 = {
                id: null,
                name: [123],
                age: 12,
                description: 'foobar',
                address: {
                    number: '4515',
                    // street: ['Highland Terrace', 'PO Box 1234'],
                    city: 'Austin',
                    state: 'TX',
                    zip: '78731'
                },
                relatives: {'cousin': 'Lil Wayne', 'aunt': 'Jemima'}
            };
        deepEqual(bigSchema.extract(example4), {
            id: null,
            name: [123],
            age: 12,
            description: 'foobar',
            address: {
                number: '4515',
                city: 'Austin',
                state: 'TX',
                zip: '78731'
            },
            relatives: {'cousin': 'Lil Wayne', 'aunt': 'Jemima'}
        });

    });

    test('map fields that are undefined', function() {
        var example5 = {
                id: null,
                name: [123],
                age: 12,
                description: 'foobar',
                address: {
                    number: '4515',
                    // street: ['Highland Terrace', 'PO Box 1234'],
                    city: 'Austin',
                    state: 'TX',
                    zip: '78731'
                }
            };
        deepEqual(bigSchema.extract(example5), {
            id: null,
            name: [123],
            age: 12,
            description: 'foobar',
            address: {
                number: '4515',
                city: 'Austin',
                state: 'TX',
                zip: '78731'
            }
        });

    });

    test('get error for nested property', function() {
        var failed;
        try {
            bigSchema.validate({address: {number: 'foo'}});
        } catch (e) {
            failed = true;
            deepEqual(e.forField('address.number').serialize(),
                {token: 'invalidtypeerror'});
        }
        ok(failed);
    });

    test('get error for prop when there are no errors for that prop', function() {
        var failed;
        try {
            bigSchema.validate({age: 21, address: {number: 'foo'}});
        } catch (e) {
            failed = true;
            ok(e.forField('age') == null);
        }
        ok(failed);
    });

    start();
});
