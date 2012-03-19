try:
    import json
except ImportError:
    import simplejson as json

from mesh.util import StructureFormatter

class JavascriptConstructor(object):
    RESERVED_WORDS = ['delete']

    def __init__(self, indent=4, constructor_attr='__func__'):
        self.constructor_attr = constructor_attr
        self.indent = ' ' * indent

    def construct(self, value, indent=0):
        source = self._construct_value(value, indent)
        if isinstance(source, list):
            source = '\n'.join(source)
        return source

    def _construct_array(self, obj, indent):
        inner_indent = self.indent * (indent + 1)
        single_line = True

        lines = []
        for value in obj:
            description = self._construct_value(value, indent + 1)
            if isinstance(description, list):
                single_line = False
                lines.append('%s%s' % (inner_indent, description[0]))
                lines.extend(description[1:-1])
                lines.append('%s%s,' % (inner_indent, description[-1]))
            else:
                lines.append('%s%s,' % (inner_indent, description))

        if single_line:
            single_line = '[' + ', '.join(l.strip().rstrip(',') for l in lines) + ']'
            if len(single_line) <= 60:
                return single_line

        if lines[-1][-1] == ',':
            lines[-1] = lines[-1][:-1]
        return ['['] + lines + [']']

    def _construct_object(self, obj, indent):
        inner_indent = self.indent * (indent + 1)
        singles, multiples = [], []

        constructor = None
        if self.constructor_attr in obj:
            constructor = obj.pop(self.constructor_attr)

        for key, value in sorted(obj.iteritems()):
            if key in self.RESERVED_WORDS:
                key = '"%s"' % key
            description = self._construct_value(value, indent + 1)
            if isinstance(description, list):
                multiples.append('%s%s: %s' % (inner_indent, key, description[0]))
                multiples.extend(description[1:-1])
                multiples.append('%s%s,' % (inner_indent, description[-1]))
            else:
                singles.append('%s%s: %s,' % (inner_indent, key, description))

        prefix = '{'
        if constructor:
            prefix = '%s({' % constructor

        lines = [prefix] + singles + multiples
        if lines[-1][-1] == ',':
            lines[-1] = lines[-1][:-1]

        suffix = '}'
        if constructor:
            suffix += ')'

        return lines + [suffix]

    def _construct_value(self, value, indent):
        if isinstance(value, dict):
            return self._construct_object(value, indent)
        elif isinstance(value, (list, tuple)):
            return self._construct_array(value, indent)
        else:
            return json.dumps(value)

class Generator(object):
    """Generates javascript bindings."""

    FIELDS = {
        'boolean': 'fields.BooleanField',
        'constant': 'fields.ConstantField',
        'date': 'fields.DateField',
        'datetime': 'fields.DateTimeField',
        'enumeration': 'fields.EnumerationField',
        'integer': 'fields.IntegerField',
        'float': 'fields.FloatField',
        'map': 'fields.MapField',
        'sequence': 'fields.SequenceField',
        'structure': 'fields.StructureField',
        'text': 'fields.TextField',
        'time': 'fields.TimeField',
        'tuple': 'fields.TupleField',
        'union': 'fields.UnionField',
    }

    def __init__(self, path_prefix=None):
        self.constructor = JavascriptConstructor()
        self.path_prefix = path_prefix

    def generate(self, bundle, version):
        files = {}

        description = bundle.describe(self.path_prefix, version)
        for name, resource in description['resources'].iteritems():

            


            return JavascriptConstructor().construct(resource)


    def _construct_field(self, field):
        

    def _pull_dict(self, subject, attrs, **params):
        for attr in attrs:
            value = subject.get(attr)
            if value is not None and attr not in params:
                params[attr] = value
        return params
