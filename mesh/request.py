import logging
import re
from copy import deepcopy
from textwrap import dedent
from types import ClassType

from mesh.constants import *
from mesh.exceptions import *
from mesh.util import LogHelper, pull_class_dict
from scheme.fields import INCOMING, OUTGOING, Field, Structure
from scheme.exceptions import *
from scheme.util import format_structure

__all__ = ('Mediator', 'Request', 'Response', 'validator')

log = LogHelper(__name__)

class Response(object):
    """A response definition for a particular request."""

    def __init__(self, schema=None, status=None):
        if isinstance(schema, dict):
            schema = Structure(schema)
        if schema and not schema.name:
            schema.name = 'response'

        self.schema = schema
        self.status = status

    def __repr__(self):
        return 'Response(status=%r)' % self.status

    def describe(self, verbose=False, omissions=None):
        if omissions:
            def omit(field):
                if isinstance(field, Structure):
                    candidate = field.replace(dict((k, Field(name=k)) for k in omissions))
                    if candidate is not field:
                        return candidate

        description = {'status': self.status, 'schema': None}
        if self.schema:
            schema = self.schema
            if omissions:
                schema = schema.transform(omit)
            description['schema'] = schema.describe(FIELD_PARAMETERS, verbose)
        return description

class Request(object):
    """A request definition for a resource.

    :param resource: The resource this request concerns, specified as a resource
        class.

    :param string name: The name of this request, used to identify the request
        in a variety of contexts; must be unique among the set of requests for a
        particular resource.

    :param tuple endpoint: Optional, default is ``None``; the HTTP endpoint for
        this request, specified as a two-tuple containing a ``str`` indicating the
        HTTP method and a ``str`` indicating the path segment.

    :param schema: Optional, default is ``None``; if specified, the schema defining
        the incoming data expected for this request.
    :type schema: :class:`scheme.fields.Structure`

    :param dict responses: Optional, default is ``None``; the set of potential
        responses for this request, specified as a ``dict`` mapping ``str`` keys
        indicating an HTTP status code to :class:`mesh.request.Response` values.

    :param boolean specific: Optional, default is ``False``;

    :param str description: Optional, default is ``None``; a description for this
        request, principally used in documentation.

    :param str title: Optional, default is ``None``; a title for this request,
        principally used in documentation.

    :param boolean auto_constructed: Optional, default is ``False``; if ``True``,
        indicates this request was auto-constructed by mesh and not manually
        defined.

    :param boolean batch: Optional, default is ``False``; if ``True``, indicates
        this request accepts and returns multiple resource instances, instead of
        operating on a single instance.

    :param boolean subject_required: Optional, default is ``True``; if ``False``,
        indicates that a subject is not required for this request despite it
        being marked as ``specific``. When ``True``, a subject will be required
        for requested marked as ``specific``. The primary use case for this
        parameter is to support requests like ``put``.

    :param validators: Optional, default is ``None``.

    :param dict metadata: Optional, default is ``None``.

    :param boolean verbose: Optional, default is ``False``.
    """

    ATTRS = ('batch', 'description', 'endpoint', 'filter', 'specific',
        'subject_required', 'title', 'verbose')

    def __init__(self, resource=None, name=None, endpoint=None, filter=None, schema=None,
            responses=None, specific=False, description=None, title=None, auto_constructed=False,
            batch=False, subject_required=True, validators=None, metadata=None, verbose=False,
            **params):

        self.auto_constructed = auto_constructed
        self.batch = batch
        self.description = description
        self.endpoint = endpoint
        self.filter = filter
        self.metadata = metadata or {}
        self.name = name
        self.resource = resource
        self.responses = responses or {}
        self.schema = schema
        self.specific = specific
        self.subject_required = subject_required
        self.title = title
        self.validators = validators or []
        self.verbose = verbose

        for status, response in self.responses.iteritems():
            if response.status is None:
                response.status = status

    def __repr__(self):
        return 'Request(resource=%r, name=%r)' % (self.resource, self.name)

    def __str__(self):
        return '%s:%s' % (self.resource, self.name)

    def claim(self, data):
        filter = self.filter
        if isinstance(filter, list) and isinstance(data, list):
            if filter and filter[0]:
                filter = filter[0]
                if data and data[0]:
                    data = data[0]
                else:
                    return False
            else:
                return True

        if isinstance(filter, dict) and isinstance(data, dict):
            if filter:
                for attr, value in filter.iteritems():
                    if data.get(attr) != value:
                        return False
                else:
                    return True
            else:
                return True
        else:
            return False

    @classmethod
    def construct(cls, resource, declaration):
        bases = declaration.__bases__
        if isinstance(declaration, (type, ClassType)) and bases:
            params = cls._pull_request(resource, bases[0], declaration)
        else:
            params = {}

        params.update(pull_class_dict(declaration, cls.ATTRS))
        if 'responses' not in params:
            params['responses'] = {}

        schema = getattr(declaration, 'schema', None)
        if schema is not None:
            if isinstance(schema, dict):
                for name, field in schema.items():
                    if isinstance(field, basestring):
                        field = resource.schema.get(field)
                        if field:
                            schema[name] = field
                schema = Structure(schema)
            if not schema.name:
                schema.name = 'request'
            params['schema'] = schema

        fields = getattr(declaration, 'fields', None)
        if fields:
            if isinstance(params['schema'], Structure):
                structure = params['schema'].structure
                for name, field in fields.iteritems():
                    if isinstance(field, Field):
                        if not field.name:
                            field.name = name
                        structure[name] = field
                    elif isinstance(field, basestring):
                        field = resource.schema.get(field)
                        if field:
                            if field.name != name:
                                field = field.clone(name=name)
                            structure[name] = field
                        else:
                            raise SpecificationError()
                    elif field is None and name in structure:
                        del structure[name]
            else:
                raise SpecificationError()

        responses = getattr(declaration, 'responses', {})
        for status, response in responses.iteritems():
            if not isinstance(response, Response):
                response = Response(response)
            response.status = status
            params['responses'][status] = response

        description = params.get('description')
        if not description and declaration.__doc__:
            params['description'] = dedent(declaration.__doc__)

        metadata = getattr(declaration, 'metadata', None)
        if metadata:
            if 'metadata' in params:
                params['metadata'].update(metadata)
            else:
                params['metadata'] = metadata

        return cls(resource=resource, name=declaration.__name__, **params)

    @classmethod
    def reconstruct(cls, resource, description):
        description['schema'] = Field.reconstruct(description['schema'])
        for status, response in description['responses'].items():
            response['schema'] = Field.reconstruct(response['schema'])
            description['responses'][status] = Response(**response)

        return cls(resource, **description)

    @classmethod
    def _pull_request(cls, resource, request, declaration=None):
        try:
            get_request = request.get_request
        except AttributeError:
            pass
        else:
            request = get_request(resource, declaration)

        params = pull_class_dict(request, cls.ATTRS)

        schema = getattr(request, 'schema', None)
        if schema:
            params['schema'] = deepcopy(schema)

        responses = getattr(request, 'responses', None)
        if responses:
            params['responses'] = deepcopy(responses)

        metadata = getattr(request, 'metadata', None)
        if metadata:
            params['metadata'] = deepcopy(metadata)

        return params

    def describe(self, path_prefix=None, verbose=False, omissions=None):
        if omissions:
            def omit(field):
                if isinstance(field, Structure):
                    return field.replace(dict((k, Field(name=k)) for k in omissions))

        description = {'endpoint': None, 'path': None}
        for attr in ('batch', 'description', 'filter', 'name', 'specific', 'title'):
            value = getattr(self, attr, None)
            if value is not None:
                description[attr] = value

        endpoint = self.endpoint
        if endpoint:
            description['endpoint'] = endpoint
            description['path'] = '%s%s' % (path_prefix or '/', endpoint[1])

        description['schema'] = None
        if self.schema:
            schema = self.schema
            if omissions:
                schema = schema.transform(omit)
            description['schema'] = schema.describe(FIELD_PARAMETERS, verbose)

        description['responses'] = {}
        for status, response in self.responses.iteritems():
            description['responses'][status] = response.describe(verbose, omissions)

        return description

    def process(self, controller, request, response, mediators=None):
        if hasattr(request, 'headers') and request.headers.has_key('REMOTE_ADDR'):
            message = 'processing request: %s from %s' % (request.description, request.headers['REMOTE_ADDR'])
        else:
            message = 'processing request: %s' % (request.description)
        if self.verbose:
            message += '\n' + format_structure(request.data, abbreviate=True)
        log('info', message)

        instance = controller()
        
        if mediators:
            for mediator in mediators:
                try:
                    mediator.before_validation(self, request, response)
                    if response.status:
                        self._audit_failed_request(instance, request, response)
                        return response
                except StructuralError, exception:
                    error = exception.serialize()
                    log('info', 'request to %s failed during mediator', str(self))
                    response(INVALID, error)
                    self._audit_failed_request(instance, request, response)
                    return response


        try:
            if not instance.validate_request(request, response):
                log('info', 'validate_request failed for controller %s', str(type(instance)))
                self._audit_failed_request(instance, request, response)
                return response
        except AttributeError:
            log('info', 'exception during validate_request for controller %s', str(type(instance)))
            pass

        subject = None
        if self.specific:
            log('debug','>>>>> self.specific = True')
            log('debug','>>>>> request.subject = %s' % format_structure(subject))
            log('debug','>>>>> self.subject_required = %s' % str(self.subject_required))
            
            if request.subject is None:
                response(BAD_REQUEST)
                self._audit_failed_request(instance, request, response)
                return response
            subject = instance.acquire(request.subject)
            if not subject and self.subject_required:
                log('info', 'request to %r specified unknown subject %r', str(self),
                    request.subject)
                response(GONE)
                self._audit_failed_request(instance, request, response)
                return response
        elif request.subject:
            log('info', 'request to %r improperly specified subject %r', str(self),
                request.subject)
            response(BAD_REQUEST)
            self._audit_failed_request(instance, request, response)
            return response

        data = None
        if self.schema:
            try:
                data = self.schema.process(request.data, INCOMING, request.serialized)
            except StructuralError, exception:
                error = exception.serialize()
                log('info', 'request to %s failed schema validation', str(self))
                response(INVALID, error)

            if not response.status and self.validators:
                try:
                    self.validate(data)
                except StructuralError, exception:
                    error = exception.serialize()
                    log('info', 'request to %s failed resource validation', str(self))
                    response(INVALID, error)
        elif request.data:
            log('info', 'request to %r improperly specified data', str(self))
            response(BAD_REQUEST)
            self._audit_failed_request(instance, request, response, subject)
            return response

        if not response.status:
            try:
                instance.dispatch(self, request, response, subject, data)
                log('debug','>>>>> after instance.dispatch - status = %s' % response.status)
                if not response.status:
                    response.status = OK
            except StructuralError, exception:
                error = exception.serialize()
                log('error', 'request to %s failed controller invocation', str(self))
                response(INVALID, error)
                self._audit_failed_request(instance, request, response, subject, data)
            except RequestError, exception:
                response(status=exception.status, content=exception.content)
 
                if not isinstance(exception, AuditCreateError) and not isinstance(exception, FailedDependencyError):
                    self._audit_failed_request(instance, request, response, subject, data)
                
                return response


        if self.verbose and response.content:
            log('debug', 'response for request to %s:\n%s', request.description,
                format_structure(response.content, abbreviate=True))

        definition = self.responses.get(response.status)
        if not definition:
            if response.status in ERROR_STATUS_CODES and not response.content:
                self._audit_failed_request(instance, request, response, subject, data)
                return response
            else:
                log('error', 'response for %s has undeclared status code %s',
                    str(self), response.status)
                response(SERVER_ERROR)
                self._audit_failed_request(instance, request, response, subject, data)
                return response

        if definition.schema:
            try:
                response.content = definition.schema.process(response.content, OUTGOING, request.serialized)
            except StructuralError, exception:
                log('error', 'response for %s failed schema validation\n%s\n%s',
                    str(self), exception.format_errors(), format_structure(response.content))
                response.content = None
                response(SERVER_ERROR)
                self._audit_failed_request(instance, request, response, subject, data)
                return response
        elif response.content:
            log('error', 'response for %s improperly specified content', str(self))
            response(SERVER_ERROR)
            self._audit_failed_request(instance, request, response, subject, data)
            return response

    def validate(self, data):
        if self.batch:
            errors = []
            for item in data:
                try:
                    self._validate_data(item)
                except StructuralError, exception:
                    errors.append(exception)
                else:
                    errors.append(None)
            if any(errors):
                raise ValidationError(structure=errors)
        else:
            self._validate_data(data)

    def _validate_data(self, data):
        error = ValidationError(structure={})
        for validator in self.validators:
            try:
                validator(data)
            except StructuralError, exception:
                attr = validator.attr
                if attr:
                    if attr in error.structure:
                        error.structure[attr].merge(exception)
                    else:
                        error.structure[attr] = exception
                else:
                    error.merge(exception)
        if error.substantive:
            raise error
        
    def _audit_failed_request(self, controller, request, response, subject=None, data=None):
        reqsubj = subject
        reqdata = data
        if not reqsubj:
            reqsubj = request.subject
        
        from spire.core.auditable import Auditable
        if isinstance(controller, Auditable) and controller.needs_audit(request, subject):
            if not reqdata:
                reqdata = request.data
            try:
                log('debug', 'writing audit entry for failed request: %s' % str(self))
                controller.send_audit_data(request, response, subject, reqdata)
            except AuditCreateError, ace:
                error = str(ace.content)
                log('error', 'request: %s failed during error audit creation: %s', str(self), error)
                
        
class Mediator(object):
    """A request mediator."""

    def before_validation(self, definition, request, response):
        pass

def validator(attr=None, requests=None):
    """Marks the decorated method as a validator.

    :param string attr: Optional, the name of the field within the schema of the resource
        that will receive any validation errors raised by this validator.
    :param requests: Optional, a list of request names to which this validator should
        be attached; defaults to ``('create', 'update')``.

    The decorated method must be implemented as a class method, taking ``cls`` as its
    first argument, but should not be decorated with ``@classmethod``; ``validator`` will
    convert the method to a classmethod itself, as otherwise the method could not be
    annotated. The decorated method will receive on positional argument, the data received
    for the current request (which will already have passed standard validation), and
    should raise :exc:`ValidationError` if warranted.
    """

    if attr is not None and requests is None and not isinstance(attr, basestring):
        requests = attr
    if isinstance(requests, (list, tuple)):
        requests = list(requests)
    elif requests is not None:
        requests = [requests]

    if requests:
        for i in range(len(requests)):
            if isinstance(requests[i], (type, ClassType)):
                requests[i] = requests[i].__name__

    def decorator(method):
        method.__validates__ = True
        method.attr = attr
        method.requests = requests
        return classmethod(method)
    return decorator
