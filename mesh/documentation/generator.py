import os
import shutil
import textwrap
from datetime import date, datetime, time

from mesh.constants import *
from mesh.resource import *
from mesh.util import format_url_path, get_package_data, get_package_path, write_file
from scheme import *

STATUS_CODES = (
    (OK, '200 OK'),
    (CREATED, '201 CREATED'),
    (ACCEPTED, '202 ACCEPTED'),
    (SUBSET, '203 SUBSET'),
    (PARTIAL, '206 PARTIAL'),
    (BAD_REQUEST, '400 BAD REQUEST'),
    (FORBIDDEN, '403 FORBIDDEN'),
    (NOT_FOUND, '404 NOT FOUND'),
    (METHOD_NOT_ALLOWED, '405 METHOD NOT ALLOWED'),
    (INVALID, '406 INVALID'),
    (CONFLICT, '409 CONFLICT'),
    (GONE, '410 GONE'),
    (SERVER_ERROR, '500 INTERNAL SERVER ERROR'),
    (UNIMPLEMENTED, '501 NOT IMPLEMENTED'),
    (UNAVAILABLE, '503 SERVICE UNAVAILABLE'),
)

RESOURCE_HEADER = """
.. default-domain:: api
"""

class directive(object):
    def __init__(self, directive, *args):
        self.args = list(args)
        self.content = []
        self.directive = directive
        self.params = []

    def add(self, arg):
        self.args.append(arg)
        return self

    def append(self, item):
        self.content.append(item)
        return self

    def extend(self, items):
        self.content.extend(items)
        return self

    def set(self, name, value):
        self.params.append((name, value))
        return self

    def render(self, indent=0):
        inner_indent = indent + 1
        inner_prefix = '    ' * inner_indent

        content = []
        for node in self.content:
            if isinstance(node, directive):
                content.append(node.render(inner_indent))
            elif isinstance(node, basestring):
                node = node.lstrip()
                content.append('\n'.join(textwrap.wrap(node, 80, expand_tabs=False,
                    initial_indent=inner_prefix,
                    subsequent_indent=inner_prefix)))


        params = []
        for name, value in self.params:
            value = str(value)
            if '\n' in value:
                values = value.split('\n')
                value = '\n'.join([values[0]] + ['%s    %s' % (inner_prefix, v) for v in values[1:]])
            params.append('%s:%s: %s' % (inner_prefix, name, value))

        return '\n%s.. %s:: %s\n%s\n\n%s' % (
            '    ' * indent,
            self.directive,
            ' '.join(str(arg) for arg in self.args),
            '\n'.join(params),
            '\n\n'.join(content),
        )

class DocumentationGenerator(object):
    CONF_TEMPLATE = get_package_data('mesh.documentation', 'templates/sphinx-conf.py.tmpl')
    CSS_PATH = get_package_path('mesh.documentation', 'templates/mesh.css.tmpl')
    INDEX_TEMPLATE = get_package_data('mesh.documentation', 'templates/index.rst.tmpl')
    ROOT_TEMPLATE = get_package_data('mesh.documentation', 'templates/root.rst.tmpl')
    SECTION_TEMPLATE = get_package_data('mesh.documentation', 'templates/section.rst.tmpl')

    def __init__(self, root_path, nested=False):
        self.nested = nested
        self.root_path = root_path

    def generate(self, bundle):
        self._prepare_root()
        if self.nested:
            bundle_path = os.path.join(self.root_path, bundle['name'])
            if not os.path.exists(bundle_path):
                os.mkdir(bundle_path)
        else:
            bundle_path = self.root_path

        sections = []
        for version, resources in sorted(bundle['versions'].iteritems(), reverse=True):
            path_prefix = '/%s/%s' % (bundle['name'], version)

            refs = ['']

            version_path = os.path.join(bundle_path, version)
            if not os.path.exists(version_path):
                os.mkdir(version_path)

            for name, specification in sorted(resources.iteritems()):
                content = self._document_resource(specification, version, path_prefix)
                openfile = open(os.path.join(version_path, '%s.rst' % name), 'w+')
                try:
                    openfile.write(content)
                finally:
                    openfile.close()
                refs.append(os.path.join(version, name))

            sections.append(self.SECTION_TEMPLATE % {
                'title': 'Version %s' % version,
                'refs': '\n    '.join(sorted(refs)),
            })

        self._generate_index(bundle, bundle_path, sections)

    def _collate_fields(self, fields):
        if 'id' in fields:
            yield 'id', fields['id']

        optional = []
        for name, field in sorted(fields.iteritems()):
            if name != 'id':
                if field.get('required'):
                    yield name, field
                else:
                    optional.append((name, field))

        for name, field in optional:
            yield name, field

    def _describe_date(self, field, block, role):
        constraints = []
        if isinstance(field.get('minimum'), date):
            constraints.append('min=%s' % field['minimum'])
        if isinstance(field.get('maximum'), date):
            constraints.append('max=%s' % field['maximum'])
        if constraints:
            block.set('constraints', ', '.join(constraints))

    def _describe_datetime(self, field, block, role):
        constraints = []
        if isinstance(field.get('minimum'), datetime):
            constraints.append('min=%s' % field['minimum'])
        if isinstance(field.get('maximum'), datetime):
            constraints.append('max=%s' % field['maximum'])
        if constraints:
            block.set('constraints', ', '.join(constraints))

    def _describe_enumeration(self, field, block, role):
        if field.get('constant') is None:
            block.set('values', repr(field['enumeration']))

    def _describe_float(self, field, block, role):
        constraints = []
        if field.get('minimum') is not None:
            constraints.append('min=%r' % field['minimum'])
        if field.get('maximum') is not None:
            constraints.append('max=%r' % field['maximum'])
        if constraints:
            block.set('constraints', ' '.join(constraints))

    def _describe_integer(self, field, block, role):
        constraints = []
        if field.get('minimum') is not None:
            constraints.append('min=%r' % field['minimum'])
        if field.get('maximum') is not None:
            constraints.append('max=%r' % field['maximum'])
        if constraints:
            block.set('constraints', ' '.join(constraints))

    def _describe_map(self, field, block, role):
        if field.get('required_keys'):
            block.set('required_keys', repr(sorted(field['required_keys'])))
        value = field.get('value')
        if value:
            if not value.get('description'):
                block.set('subtype', value['__type__'])
            else:
                block.append(self._document_field('', value, role))

    def _describe_sequence(self, field, block, role):
        constraints = []
        if field.get('unique'):
            block.set('unique', '')
        if field.get('min_length') is not None:
            constraints.append('min=%d' % field['min_length'])
        if field.get('max_length') is not None:
            constraints.append('max=%d' % field['max_length'])
        if constraints:
            block.set('constraints', ', '.join(constraints))
        item = field.get('item')
        if item:
            block.append(self._document_field('', item, role))

    def _describe_structure(self, field, block, role):
        structure = field.get('structure')
        if structure:
            polymorphic_on = field.get('polymorphic_on')
            if polymorphic_on:
                block.set('polymorphic', '')
                field_name = polymorphic_on['name']
                for value, substructure in sorted(structure.iteritems()):
                    subblock = directive('field', '%s = %r' % (field_name, value))
                    for name, subfield in self._collate_fields(substructure):
                        subblock.append(self._document_field(name, subfield, role))
                    block.append(subblock)
            else:
                for name, subfield in self._collate_fields(structure):
                    block.append(self._document_field(name, subfield, role))

    def _describe_text(self, field, block, role):
        constraints = []
        if isinstance(field.get('min_length'), (int, long)):
            constraints.append('min=%r' % field['min_length'])
        if isinstance(field.get('max_length'), (int, long)):
            constraints.append('max=%r' % field['max_length'])
        if constraints:
            block.set('constraints', ', '.join(constraints))
        if field.get('pattern'):
            block.set('pattern', field['pattern'])

    def _describe_time(self, field, block, role):
        constraints = []
        if isinstance(field.get('minimum'), time):
            constraints.append('min=%s' % field['minimum'])
        if isinstance(field.get('maximum'), time):
            constraints.append('max=%s' % field['maximum'])
        if constraints:
            block.set('constraints', ', '.join(constraints))

    def _describe_tuple(self, field, block, role):
        values = field.get('values')
        if values:
            for i, value in enumerate(values):
                block.append(self._document_field('', value, role))

    def _describe_union(self, field, block, role):
        fields = field.get('fields')
        if fields:
            for i, subfield in enumerate(fields):
                block.append(self._document_field('', subfield, role))

    def _document_field(self, name, field, role=None, sectional=False):
        block = directive('field', name)
        block.set('type', field['__type__'])
        if sectional:
            block.set('sectional', '')

        for attr in ('description', 'notes'):
            value = field.get(attr)
            if value:
                block.set(attr, value)
        for attr in ('nonnull', 'readonly'):
            if field.get(attr):
                block.set(attr, '')

        if field.get('required') and role != 'schema':
            block.set('required', '')
        if field.get('deferred') and role != 'request':
            block.set('deferred', '')

        constant = field.get('constant')
        if constant is not None:
            block.set('constant', repr(constant))

        default = field.get('default')
        if default is not None:
            block.set('default', repr(default))
        
        formatter = getattr(self, '_describe_%s' % field['__type__'], None)
        if formatter:
            formatter(field, block, role)
        return block

    def _document_request(self, version, request, path_prefix):
        block = directive('request', request['name'])
        if request.get('title'):
            block.set('title', request['title'])
        if request.get('endpoint'):
            block.set('endpoint', '%s %s' % (request['endpoint'][0],
                request['path']))

        if request.get('description'):
            block.append(request['description'])
        if request['schema']:
            block.append(self._document_field('REQUEST', request['schema'],
                'request', sectional=True))
        
        responses = request['responses']
        for status, status_line in STATUS_CODES:
            if status in responses:
                response = responses[status]
                if response['schema']:
                    block.append(self._document_field(status_line, response['schema'],
                        'response', sectional=True))

        return block

    def _document_resource(self, specification, version, path_prefix):
        block = directive('resource', specification['name'], specification['title'])
        block.set('version', version)
        
        description = specification['description']
        if description:
            block.append(description)

        schema = directive('structure', 'SCHEMA')
        for name, field in self._collate_fields(specification['schema']):
            schema.append(self._document_field(name, field, 'schema'))

        block.append(schema)
        for name, request in sorted(specification['requests'].iteritems()):
            block.append(self._document_request(version, request, path_prefix))

        return RESOURCE_HEADER + block.render()

    def _generate_index(self, bundle, bundle_path, sections):
        content = self.INDEX_TEMPLATE % {
            'name': bundle['name'],
            'description': bundle.get('description', ''),
            'sections': '\n\n'.join(sections),
        }

        openfile = open(os.path.join(bundle_path, 'index.rst'), 'w+')
        try:
            openfile.write(content)
        finally:
            openfile.close()

    def _prepare_root(self):
        root = self.root_path
        if not os.path.exists(root):
            os.mkdir(root)

        static = os.path.join(root, '_static')
        if not os.path.exists(static):
            os.mkdir(static)
        
        css = os.path.join(static, 'mesh.css')
        if not os.path.exists(css):
            shutil.copyfile(self.CSS_PATH, css)

        templates = os.path.join(root, '_templates')
        if not os.path.exists(templates):
            os.mkdir(templates)

        conf = os.path.join(root, 'conf.py')
        if not os.path.exists(conf):
            write_file(conf, self.CONF_TEMPLATE)

        if not self.nested:
            return

        root_index = os.path.join(root, 'index.rst')
        if not os.path.exists(root_index):
            write_file(root_index, self.ROOT_TEMPLATE)
