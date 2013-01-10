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
    return _.map(_.range(total), function(____, i) {
        var lastR;
        return {
            id: i+1,
            text_field: 'item ' + i,
            required_field: i % 5 === 0? null : 'default ' + i,
            boolean_field: false,
            datetime_field: '2012-08-29T14:10:21Z',
            integer_field: (lastR = r()),
            float_field: Math.pow(lastR / 300.0, 3),
            default_field: Math.floor(Math.pow(lastR / 100.0, 7)),
            enumeration_field: (i % 3) + 1
        };
    });
});
