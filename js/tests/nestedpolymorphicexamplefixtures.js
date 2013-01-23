define([
    'vendor/underscore'
], function(_) {
    var total = 1000,
        x=123456789, y=362436069, z=521288629,
        r = function() {
            x ^= x << 16;
            x ^= x >> 5;
            x ^= x << 1;

            var t = x;
            x = y;
            y = z;
            z = t ^ x ^ y;

            return (z < 0? -1*z : z) % total;
        };

    function makeUuid(i) {
        var digits = i.toString().length,
            zero = '00000000-0000-0000-0000-000000000000',
            start = zero.split('-').slice(0, zero.split('-').length-1),
            bottom = _.last(start);
        if (bottom.length < digits) {
            throw new Error('i cant make a uuid that high');
        }
        return start.concat([(new Array(bottom.length-digits)).join(0) + i]).join('-');
    }

    return _.map(_.range(total), function(____, i) {
        var lastR;
        return {
            id: makeUuid(i),
            name: 'name of item ' + i,
            required_field: (lastR = r()).toString(),
            default_field: i % 5 === 0? null : i,
            boolean_field: false,
            datetime_field: '2012-08-29T14:10:21Z',
            enumeration_field: (i % 3) + 1,
            float_field: Math.pow(lastR / 300.0, 3),
            integer_field: Math.floor(Math.pow(lastR / 100.0, 7)),
            structure_field: {
                required_field: i,
                structure_field: {
                    required_field: i
                }
            },
            text_field: 'item ' + i,
            type: i % 2 === 0? 'immutable' : 'mutable',
            composition: i % 3 === 0?  {
                type: 'attribute-filter',
                expression: 'foo bar expression ' + i
            } : i % 3 === 1? {
                type: 'datasource-list',
                datasources: [{
                    id: makeUuid(i + 1),
                    name: 'name of item ' + (i + 1)
                }, {
                    id: makeUuid(i + 2),
                    name: 'name of item ' + (i + 2)
                }]
            } : {
                type: 'extant'
            }
        };
    });
});

