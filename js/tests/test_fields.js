/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual, notStrictEqual, raises*/
require([
    'path!vendor:underscore',
    'path!mesh:datetime',
    'path!mesh:fields'
], function(_, datetime, fields) {
    var URLENCODED = 'application/x-www-form-urlencoded';

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

    start();
});
