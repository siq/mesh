from mesh.constants import *
from mesh.exceptions import *
from mesh.request import *
from mesh.resource import *
from mesh.util import pluralize
from scheme import *

def filter_schema_for_response(resource):
    id_field = resource.id_field
    schema = {}
    for name, field in resource.filter_schema(exclusive=False, readonly=True).iteritems():
        if name == id_field.name:
            schema[name] = field.clone(required=True)
        elif field.required:
            schema[name] = field.clone(required=False)
        else:
            schema[name] = field
    return schema

class construct_model_request(object):
    def _construct_exclude_field(self, id_field, fields):
        tokens = []
        for name, field in fields.iteritems():
            if name != id_field.name and not field.deferred:
                tokens.append(name)
        if tokens:
            return Sequence(Enumeration(sorted(tokens), nonnull=True),
                description='Fields which should not be returned for this query.')

    def _construct_include_field(self, fields):
        tokens = []
        for name, field in fields.iteritems():
            if field.deferred:
                tokens.append(name)
        if tokens:
            return Sequence(Enumeration(sorted(tokens), nonnull=True),
                description='Deferred fields which should be returned for this query.')

class construct_query_request(construct_model_request):
    operators = {
        'equal': 'Equals',
        'iequal': 'Case-insensitive equals.',
        'not': 'Not equal.',
        'inot': 'Case-insensitive not equal.',
        'prefix': 'Prefix search.',
        'iprefix': 'Case-insensitive prefix search.',
        'suffix': 'Suffix search.',
        'isuffix': 'Case-insensitive suffix search.',
        'contains': 'Contains.',
        'icontains': 'Case-insensitive contains.',
        'gt': 'Greater then.',
        'gte': 'Greater then or equal to.',
        'lt': 'Less then.',
        'lte': 'Less then or equal to.',
        'null': 'Is null.',
        'in': 'In given values.',
        'notin': 'Not in given values.',
    }

    def __call__(self, resource):
        fields = filter_schema_for_response(resource)
        schema = {
            'offset': Integer(minimum=0, default=0,
                description='The offset into the result set of this query.'),
            'limit': Integer(minimum=0,
                description='The maximum number of resources to return for this query.'),
            'total': Boolean(default=False, nonnull=True,
                description='If true, only return the total for this query.'),
        }

        include_field = self._construct_include_field(fields)
        if include_field:
            schema['include'] = include_field

        exclude_field = self._construct_exclude_field(resource.id_field, fields)
        if exclude_field:
            schema['exclude'] = exclude_field

        sort_field = self._construct_sort_field(fields)
        if sort_field:
            schema['sort'] = sort_field

        operators = {}
        for name, field in fields.iteritems():
            if field.operators:
                self._construct_operator_fields(operators, field)

        if operators:
            schema['query'] = Structure(operators,
                description='The query to filter resources by.')

        response_schema = Structure({
            'total': Integer(nonnull=True, minimum=0,
                description='The total number of resources in the result set for this query.'),
            'resources': Sequence(Structure(fields), nonnull=True),
        })

        return Request(
            name = 'query',
            endpoint = (GET, resource.name),
            auto_constructed = True,
            resource = resource,
            title = 'Querying %s' % pluralize(resource.title.lower()),
            schema = Structure(schema),
            responses = {
                OK: Response(response_schema),
                INVALID: Response(Errors),
            }
        )

    def _clone_field(self, field, name=None, description=None):
        return field.clone(name=name, description=description, nonnull=True, default=None,
            required=False, notes=None, readonly=False, deferred=False, sortable=False,
            operators=None)

    def _construct_sort_field(self, fields):
        tokens = []
        for name, field in fields.iteritems():
            if field.sortable:
                for suffix in ('', '+', '-'):
                    tokens.append(name + suffix)
        if tokens:
            return Sequence(Enumeration(sorted(tokens), nonnull=True),
                description='The sort order for this query.')

    def _construct_operator_fields(self, operators, field):
        supported = field.operators
        if isinstance(supported, basestring):
            supported = supported.split(' ')

        for operator in supported:
            description = self.operators.get(operator)
            if description:
                constructor = getattr(self, '_construct_%s_operator' % operator, None)
                if constructor:
                    operator_field = constructor(field, description)
                else:
                    name = '%s__%s' % (field.name, operator)
                    operator_field = self._clone_field(field, name, description)
                operators[operator_field.name] = operator_field

    def _construct_equal_operator(self, field, description):
        return self._clone_field(field, field.name, description)

    def _construct_in_operator(self, field, description):
        return Sequence(self._clone_field(field), name='%s__in' % field.name,
            description=description, nonnull=True)

    def _construct_notin_operator(self, field, description):
        return Sequence(self._clone_field(field), name='%s__notin' % field.name,
            description=description, nonnull=True)

    def _construct_null_operator(self, field, description):
        return Boolean(name='%s__null' % field.name, description=description, nonnull=True)

class construct_get_request(construct_model_request):
    def __call__(self, resource):
        fields = filter_schema_for_response(resource)
        schema = {}

        include_field = self._construct_include_field(fields)
        if include_field:
            schema['include'] = include_field

        exclude_field = self._construct_exclude_field(resource.id_field, fields)
        if exclude_field:
            schema['exclude'] = exclude_field

        response_schema = Structure(fields)
        return Request(
            name = 'get',
            endpoint = (GET, resource.name + '/id'),
            specific = True,
            auto_constructed = True,
            resource = resource,
            title = 'Getting a specific %s' % resource.title.lower(),
            schema = schema and Structure(schema) or None,
            responses = {
                OK: Response(response_schema),
                INVALID: Response(Errors),
            }
        )

def construct_create_request(resource):
    resource_schema = {}
    for name, field in resource.filter_schema(exclusive=False, readonly=False).iteritems():
        if field.is_identifier:
            if field.oncreate is True:
                resource_schema[name] = field
        elif field.oncreate is not False:
            resource_schema[name] = field

    response_schema = {
        resource.id_field.name: resource.id_field.clone(required=True),
    }
    
    return Request(
        name = 'create',
        endpoint = (POST, resource.name),
        auto_constructed = True,
        resource = resource,
        title = 'Creating a new %s' % resource.title.lower(),
        schema = Structure(resource_schema),
        responses = {
            OK: Response(Structure(response_schema)),
            INVALID: Response(Errors),
        }
    )

def construct_put_request(resource):
    resource_schema = {}
    for name, field in resource.filter_schema(exclusive=False, readonly=False).iteritems():
        if not field.is_identifier and field.onput is not False:
            resource_schema[name] = field

    response_schema = {
        resource.id_field.name: resource.id_field.clone(required=True),
    }

    return Request(
        name = 'put',
        endpoint = (PUT, resource.name + '/id'),
        specific = True,
        auto_constructed = True,
        subject_required = False,
        resource = resource,
        title = 'Putting a specific %s' % resource.title.lower(),
        schema = Structure(resource_schema),
        responses = {
            OK: Response(Structure(response_schema)),
            INVALID: Response(Errors),
        }
    )

def construct_update_request(resource):
    resource_schema = {}
    for name, field in resource.filter_schema(exclusive=False, readonly=False).iteritems():
        if not field.is_identifier and field.onupdate is not False:
            if field.required:
                field = field.clone(required=False)
            resource_schema[name] = field

    response_schema = {
        resource.id_field.name: resource.id_field.clone(required=True),
    }

    return Request(
        name = 'update',
        endpoint = (POST, resource.name + '/id'),
        specific = True,
        auto_constructed = True,
        resource = resource,
        title = 'Updating a specific %s' % resource.title.lower(),
        schema = Structure(resource_schema),
        responses = {
            OK: Response(Structure(response_schema)),
            INVALID: Response(Errors),
        }
    )

def construct_create_update_request(resource):
    schema = {}
    for name, field in resource.filter_schema(exclusive=False, readonly=False).iteritems():
        if field.required:
            field = field.clone(required=False)
        schema[name] = field

    schema = Sequence(Structure(schema))
    response_schema = Sequence(Structure({
        resource.id_field.name: resource.id_field.clone(required=True),
    }))

    return Request(
        name = 'create_update',
        endpoint = (PUT, resource.name),
        specific = False,
        auto_constructed = True,
        resource = resource,
        title = 'Creating and updating multiple %s' % pluralize(resource.title.lower()),
        schema = schema,
        responses = {
            OK: Response(response_schema),
            INVALID: Response(Errors),
        }
    )

def construct_delete_request(resource):
    id_field = resource.id_field
    response_schema = Structure({
        id_field.name: id_field.clone(required=True)
    })

    return Request(
        name = 'delete',
        endpoint = (DELETE, resource.name + '/id'),
        specific = True,
        auto_constructed = True,
        resource = resource,
        title = 'Deleting a specific %s' % resource.title.lower(),
        schema = None,
        responses = {
            OK: Response(response_schema),
        }
    )

DEFAULT_REQUESTS = ['create', 'delete', 'get', 'query', 'update']
STANDARD_REQUESTS = {
    'create': construct_create_request,
    'create_update': construct_create_update_request,
    'delete': construct_delete_request,
    'get': construct_get_request(),
    'put': construct_put_request,
    'query': construct_query_request(),
    'update': construct_update_request,
}
VALIDATED_REQUESTS = ['create', 'put', 'update']
