import os

try:
    import json
except ImportError:
    from scheme import json

from mesh.constants import *
from mesh.transport.http import STATUS_CODES
from mesh.util import get_package_data, write_file
from scheme import Field

class JavascriptConstructor(object):
    RESERVED_WORDS = ['delete']

    def __init__(self, indent=4, constructor_attr=None):
        self.constructor_attr = constructor_attr
        self.indent = ' ' * indent

    def construct(self, value, indent=0, initial_indent=0):
        source = self._construct_value(value, indent)
        if isinstance(source, list):
            if initial_indent > 0:
                source[0] = '%s%s' % (self.indent * initial_indent, source[0])
            if indent > 0:
                source[-1] = '%s%s' % (self.indent * indent, source[-1])
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
        'field': 'fields.Field',
        'float': 'fields.FloatField',
        'map': 'fields.MapField',
        'sequence': 'fields.SequenceField',
        'structure': 'fields.StructureField',
        'text': 'fields.TextField',
        'time': 'fields.TimeField',
        'tuple': 'fields.TupleField',
        'union': 'fields.UnionField',
    }
    IGNORED_ATTRS = ('description', 'notes', 'structural', 'type')
    MODEL_TMPL = get_package_data('mesh.binding', 'templates/model.js.tmpl')

    def __init__(self, template_dir=None, mimetype=None):
        self.constructor = JavascriptConstructor(constructor_attr='type')
        self.mimetype = mimetype or JSON
        self.template_dir = template_dir

    def generate(self, bundle, version):
        files = {}

        description = bundle.describe(version)
        for name, resource in description['resources'].iteritems():
            files['%s.js' % name] = self._construct_resource(resource)

        return files

    def _construct_field(self, field):
        specification = {'type': self.FIELDS[field['type']]}
        for name, value in field.iteritems():
            if name not in self.IGNORED_ATTRS:
                specification[name] = value

        if field.get('structural'):
            specification.update(Field.visit(field, self._construct_field))
        return specification

    def _construct_request(self, request):
        mimetype = self.mimetype
        if request['endpoint'][0] == GET:
            mimetype = URLENCODED

        schema = None
        if request['schema']:
            schema = self._construct_field(request['schema'])

        responses = {}
        for status, response in request['responses'].iteritems():
            code = STATUS_CODES[status]
            responses[code] = {
                'status': status,
                'mimetype': self.mimetype,
                'schema': self._construct_field(response['schema']),
            }

        return {
            'type': 'model.Request',
            'name': request['name'],
            'method': request['endpoint'][0],
            'mimetype': mimetype,
            'url': request['path'],
            'schema': schema,
            'responses': responses,
        }

    def _construct_resource(self, resource):
        schema = {}
        for name, field in resource['schema'].iteritems():
            schema[name] = self._construct_field(field)

        requests = {}
        for name, request in resource['requests'].iteritems():
            requests[name] = self._construct_request(request)

        specification = {
            '__name__': resource['name'],
            '__schema__': schema,
            '__requests__': requests,
        }

        source = self.constructor.construct(specification, indent=1)
        return self._get_template(resource['name']) % source

    def _get_template(self, name):
        template = self.MODEL_TMPL
        if self.template_dir:
            filename = os.path.join(self.template_dir, '%s.js' % name)
            if os.path.exists(filename):
                openfile = open(filename)
                try:
                    return openfile.read()
                finally:
                    openfile.close()

        return template
