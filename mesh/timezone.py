from datetime import timedelta, tzinfo
import time

ZERO = timedelta(0)

STD_OFFSET = timedelta(seconds=-time.timezone)
if time.daylight:
    DST_OFFSET = timedelta(seconds=-time.altzone)
else:
    DST_OFFSET = STD_OFFSET
DST_DIFF = DST_OFFSET - STD_OFFSET

class FixedOffsetTimezone(tzinfo):
    name = None
    offset = ZERO

    def __init__(self, offset=None, name=None):
        if offset is not None:
            self.offset = timedelta(minutes=offset)
        if name is not None:
            self.name = name

    def __repr__(self):
        return 'FixedOffsetTimezone(%r)' % self.offset.seconds

    def dst(self, value):
        return ZERO

    def tzname(self, value):
        if self.name is not None:
            return self.name

        seconds = self.offset.seconds + (self.offset.days * 86400)
        hours, seconds = divmod(seconds, 3600)
        minutes = seconds/60
        if minutes:
            return '%+03d:%d' % (hours, minutes)
        else:
            return '%+03d' % hours

    def utcoffset(self, value=None):
        return self.offset

class LocalTimezone(tzinfo):
    def __repr__(self):
        return 'LocalTimezone()'

    def dst(self, value):
        if self._isdst(value):
            return DST_DIFF
        else:
            return ZERO

    def tzname(self, value):
        return time.tzname[self._isdst(value)]

    def utcoffset(self, value):
        if self._isdst(value):
            return DST_OFFSET
        else:
            return STD_OFFSET

    def _isdst(self, value):
        timestamp = time.mktime((value.year, value.month, value.day, value.hour,
            value.minute, value.second, value.weekday(), 0, -1))
        return (time.localtime(timestamp).tm_isdst > 0)

LOCAL = LocalTimezone()
UTC = FixedOffsetTimezone(0)
