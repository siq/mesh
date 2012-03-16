define([], function() {
    var pad = function(value, n) {
        if(n == null) {
            n = 2;
        }
        value = value.toString();
        for(var i = 1; i <= n; i++) {
            if(value.length < i) {
                value = '0' + value;
            }
        }
        return value;
    };

    var Time = function(hour, minute, second) {
        if(typeof hour == 'string') {
            this.hour = Number(hour.substr(0, 2));
            this.minute = Number(hour.substr(3, 2));
            this.second = Number(hour.substr(6, 2));
        } else if(hour != null) {
            this.hour = hour || 0;
            this.minute = minute || 0;
            this.second = second || 0;
        } else {
            var date = new Date();
            this.hour = date.getHours();
            this.minute = date.getMinutes();
            this.second = date.getSeconds();
        }
    };
    Time.prototype.toISOString = function() {
        return pad(this.hour ) + ':' + pad(this.minute) + ':' + pad(this.second);
    };

    var ABBREVIATED_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul',
        'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December']
    var ABBREVIATED_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var FULL_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
        'Friday', 'Saturday'];

    return {
        Time: Time,
        format: function(value, format) {
            var result = [], token, n;
            if(format == null) {
                format = '%Y-%m-%d %H:%M:%S';
            }
            for(var i = 0, l = format.length; i < l; i++) {
                token = format.substr(i, 2);
                if(token.length === 2 && token[0] === '%') {
                    switch(token) {
                        case '%a':
                            result.push(ABBREVIATED_WEEKDAYS[value.getDay()]);
                            break;
                        case '%A':
                            result.push(FULL_WEEKDAYS[value.getDay()]);
                            break;
                        case '%b':
                            result.push(ABBREVIATED_MONTHS[value.getMonth()]);
                            break
                        case '%B':
                            result.push(FULL_MONTHS[value.getMonth()]);
                            break;
                        case '%d':
                            result.push(pad(value.getDate()));
                            break;
                        case '%f':
                            result.push(pad(value.getMilliseconds(), 3));
                            break;
                        case '%H':
                            result.push(pad(value.getHours()));
                            break;
                        case '%I':
                            n = value.getHours();
                            if(n > 12) {
                                n -= 12;
                            } else if (n === 0) {
                            	n = 12;
                            }
                            result.push(pad(n));
                            break;
                        case '%m':
                            result.push(pad(value.getMonth() + 1));
                            break;
                        case '%M':
                            result.push(pad(value.getMinutes()));
                            break;
                        case '%p':
                        case '%P':
                            n = value.getHours();
                            if(n >= 12) {
                                result.push((token === '%p') ? 'pm' : 'PM');
                            } else {
                                result.push((token === '%p') ? 'am' : 'AM');
                            }
                            break;
                        case '%S':
                            result.push(pad(value.getSeconds()));
                            break;
                        case '%w':
                            result.push(value.getDay());
                            break;
                        case '%y':
                            result.push(value.getFullYear().toString().substr(2));
                            break;
                        case '%Y':
                            result.push(value.getFullYear());
                            break;
                        case '%%':
                            result.push('%');
                            break;
                        default:
                            result.push(token);
                            break;                            
                    }
                    i++;
                } else {
                    result.push(format[i]);
                }
            }
            return result.join('');
        },
        fromISO8601: function(value) {
            var result = new Date(2000, 0, 0);
            result.setUTCFullYear(Number(value.substr(0, 4)),
                                  Number(value.substr(5, 2)) - 1,
                                  Number(value.substr(8, 2)));
            if(value.length > 10) {
                result.setUTCHours(Number(value.substr(11, 2)));
                result.setUTCMinutes(Number(value.substr(14, 2)));
                result.setUTCSeconds(Number(value.substr(17, 2)));
            }
            return result;
        },
        toISO8601: function(value, include_time) {
            var result = value.getUTCFullYear() + '-' + pad(value.getUTCMonth() + 1)
                + '-' + pad(value.getUTCDate());
            if(include_time) {
                result += 'T' + pad(value.getUTCHours()) + ':' + pad(value.getUTCMinutes())
                    + ':' + pad(value.getUTCSeconds()) + 'Z';
            }
            return result;
        }
    };
});
