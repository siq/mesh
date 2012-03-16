require([
    'vendor/underscore',
    'datetime',
    'fields'
], function(_, datetime, fields) {
    var URLENCODED = 'application/x-www-form-urlencoded';

    test('boolean fields: serialization', function() {
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

    test('boolean fields: unserialization', function() {
        var field = fields.BooleanField();
        strictEqual(field.unserialize(null), null);
        strictEqual(field.unserialize(true), true);
        strictEqual(field.unserialize(false), false);
    });

    test('datetime fields: serialization', function() {
        var field = fields.DateTimeField();
        strictEqual(field.serialize(null), null);

        var date = new Date(2000, 0, 1, 0, 0, 0, 0);
        strictEqual(field.serialize(date), datetime.toISO8601(date, true));
    });

    test('enumeration fields: serialization', function() {
        var field = fields.EnumerationField({enumeration: [1, 2]});
        strictEqual(field.serialize(null), null);
        strictEqual(field.serialize(''), null);
        strictEqual(field.serialize(1), 1);
    });

    test('enumeration fields: unserialization', function() {
        var field = fields.EnumerationField({enumeration: [1, 2]});
        strictEqual(field.unserialize(null), null);
        strictEqual(field.unserialize(1), 1);
    });

    test('integer fields: serialization', function() {
        var field = fields.IntegerField();
        strictEqual(field.serialize(null), null);
        strictEqual(field.serialize(''), null);
        strictEqual(field.serialize(1), 1);
        strictEqual(field.serialize('1'), 1);
    });

    test('integer fields: unserialization', function() {
        var field = fields.IntegerField();
        strictEqual(field.unserialize(null), null);
        strictEqual(field.unserialize(1), 1);
    });

    test('float fields: serialization', function() {
        var field = fields.FloatField();
        strictEqual(field.serialize(null), null);
        strictEqual(field.serialize(''), null);
        strictEqual(field.serialize(1), 1);
        strictEqual(field.serialize(1.2), 1.2);
        strictEqual(field.serialize('1.2'), 1.2);
    });

    test('float fields: unserialization', function() {
        var field = fields.FloatField();
        strictEqual(field.unserialize(null), null);
        strictEqual(field.unserialize(1.2), 1.2);
    });

    test('map fields: serialization', function() {
        var field = fields.MapField({value: fields.IntegerField()});
        strictEqual(field.serialize(null), null);
        deepEqual(field.serialize({}), {});
        deepEqual(field.serialize({a: 1}), {a: 1});
        deepEqual(field.serialize({a: 1, b: 2}), {a: 1, b: 2});
        strictEqual(field.serialize({a: '1'}).a, 1);

        strictEqual(field.serialize({}, URLENCODED), '{}');
        strictEqual(field.serialize({a: 1}, URLENCODED), '{a:1}');
    });

    test('map fields: unserialization', function() {
        var field = fields.MapField({value: fields.IntegerField()});
        strictEqual(field.unserialize(null), null);
        deepEqual(field.unserialize({}), {});
        deepEqual(field.unserialize({a: 1}), {a: 1});
        deepEqual(field.unserialize({a: 1, b: 2}), {a: 1, b: 2});
    });

    test('map fields: simple extraction', function() {
        var field = fields.MapField({value: fields.IntegerField()});
        var subject = {'a': 1, 'b': 2, 'c': 3};
        var extraction = field.extract(subject);

        deepEqual(extraction, subject);
        notStrictEqual(extraction, subject);
    });

    test('sequence fields: serialization', function() {
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

    test('sequence fields: unserialization', function() {
        var field = fields.SequenceField({item: fields.IntegerField()});
        strictEqual(field.unserialize(null), null);
        deepEqual(field.unserialize([]), []);
        deepEqual(field.unserialize([1]), [1]);
        deepEqual(field.unserialize([1,2]), [1,2]);
    });

    test('structure fields: serialization', function() {
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

});
