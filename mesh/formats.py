import re
from urllib import urlencode

try:
    import json
except ImportError:
    import simplejson as json

try:
    from urlparse import parse_qsl
except ImportError:
    from cgi import parse_qsl

from mesh.constants import *

__all__ = ('STANDARD_FORMATS', 'Format', 'Json', 'UrlEncoded')

class Format(object):
    """A data format."""

    mimetype = None
    name = None

    @classmethod
    def serialize(cls, value):
        raise NotImplementedError()

    @classmethod
    def unserialize(cls, value):
        raise NotImplementedError()

class Json(Format):
    mimetype = JSON
    name = 'json'

    @classmethod
    def serialize(cls, value):
        return json.dumps(value)

    @classmethod
    def unserialize(cls, value):
        return json.loads(value)

class UrlEncoded(Format):
    mimetype = URLENCODED
    name = 'urlencoded'

    STRUCTURE_EXPR = re.compile(r'(?:\{[^{\[\]]*?\})|(?:\[[^{}\[]*?\])')

    @classmethod
    def serialize(cls, content):
        if not content:
            return None
        elif not isinstance(content, dict):
            raise ValueError(content)

        data = []
        for name, value in content.iteritems():
            data.append((name, cls._serialize_content(value)))
        return urlencode(data)

    @classmethod
    def unserialize(cls, text):
        if not text:
            return None
        elif not isinstance(text, basestring):
            raise ValueError(text)

        data = {}
        for name, value in parse_qsl(text):
            if '{' in value or '[' in value:
                value = cls._unserialize_structured_content(value)
            else:
                value = cls._unserialize_simple_value(value)
            data[name] = value
        return data

    @classmethod
    def _serialize_content(cls, content):
        if isinstance(content, dict):
            tokens = []
            for key, value in sorted(content.iteritems()):
                tokens.append('%s:%s' % (key, cls._serialize_content(value)))
            return '{%s}' % ','.join(tokens)
        elif isinstance(content, (list, tuple)):
            tokens = []
            for value in content:
                tokens.append(cls._serialize_content(value))
            return '[%s]' % ','.join(tokens)
        elif isinstance(content, bool):
            return content and 'true' or 'false'
        else:
            return str(content)

    @classmethod
    def _unserialize_structure(cls, text, structures):
        head, tail = text[0], text[-1]
        if head == '{' and tail == '}':
            tokens = text[1:-1]
            if tokens:
                try:
                    pairs = []
                    for pair in tokens.split(','):
                        key, value = pair.split(':')
                        if value in structures:
                            value = structures[value]
                        else:
                            value = cls._unserialize_simple_value(value)
                        pairs.append((key, value))
                    return dict(pairs)
                except Exception:
                    raise ValueError(value)
            else:
                return {}
        elif head == '[' and tail == ']':
            tokens = text[1:-1]
            if tokens:
                values = []
                for value in tokens.split(','):
                    if value in structures:
                        value = structures[value]
                    else:
                        value = cls._unserialize_simple_value(value)
                    values.append(value)
                return values
            else:
                return []
        else:
            raise ValueError(value)

    @classmethod
    def _unserialize_structured_content(cls, text):
        expr = cls.STRUCTURE_EXPR
        structures = {}

        def replace(match):
            token = '||%d||' % len(structures)
            structures[token] = cls._unserialize_structure(match.group(0), structures)
            return token
            
        while True:
            text, count = expr.subn(replace, text)
            if count == 0:
                return structures[text]

    @classmethod
    def _unserialize_simple_value(cls, value):
        if value == 'true':
            return True
        elif value == 'false':
            return False
        else:
            return value

STANDARD_FORMATS = (Json, UrlEncoded)
