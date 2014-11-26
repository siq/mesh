from mesh.bundle import Specification
from mesh.constants import *
from mesh.exceptions import *
from mesh.util import subclass_registry
from scheme.fields import Field
from scheme import formats

__all__ = ('STANDARD_FORMATS', 'Client', 'Server', 'ServerRequest', 'ServerResponse', 'Transport')

STANDARD_FORMATS = (formats.Csv, formats.Json, formats.UrlEncoded, formats.Xml)

class ServerRequest(object):
    """An API request."""

    def __init__(self, endpoint=None, context=None, subject=None, data=None, serialized=False):
        self.context = context
        self.data = data
        self.endpoint = endpoint
        self.serialized = serialized
        self.subject = subject

    def __repr__(self):
        return '%s(endpoint=%r)' % (type(self).__name__, self.endpoint)

    @property
    def description(self):
        return str(self.endpoint or '')

class ServerResponse(object):
    """An API response."""

    def __init__(self, status=None, content=None, mimetype=None, headers=None):
        self.content = content
        self.headers = headers or {}
        self.mimetype = mimetype
        self.status = status

    def __call__(self, status=None, content=None):
        return self.construct(status, content)

    def __repr__(self):
        return '%s(status=%r)' % (type(self).__name__, self.status)

    @property
    def ok(self):
        return (self.status in VALID_STATUS_CODES)

    def construct(self, status=None, content=None):
        if status in STATUS_CODES:
            self.status = status
        else:
            content = status

        if content is not None:
            self.content = content
        return self

    def header(self, name, value, conditional=False):
        name = name.lower()
        if conditional and name in self.headers:
            return
        self.headers[name] = value

    def unserialize(self):
        if self.content:
            return formats.unserialize(self.mimetype, self.content)

class Server(object):
    """An API server."""

    def __init__(self, default_format=None, available_formats=None, mediators=None):
        self.default_format = default_format
        self.mediators = mediators

        self.formats = {}
        for format in (available_formats or STANDARD_FORMATS):
            self.formats[format.name] = self.formats[format.mimetype] = format

    def dispatch(self):
        raise NotImplementedError()

class Client(object):
    """An API client."""

    clients = {}

    def __init__(self, specification=None, context=None, format=None, formats=None):
        self.context = context or {}
        self.format = format

        self.bundle = None
        if specification is not None:
            self.specification = specification
            self.bundle = specification.name

        self.formats = {}
        for format in (formats or STANDARD_FORMATS):
            for key in (format, format.name, format.mimetype):
                self.formats[key] = format

    def execute(self, resource, request, subject=None, data=None, format=None, context=None):
        raise NotImplementedError()

    def extract(self, resource, request, subject, sparse=True):
        request = self.get_request(resource, request)
        return request['schema'].extract(subject, sparse=sparse)

    @classmethod
    def get_client(cls, name):
        if isinstance(name, Specification):
            name = name.name
        return cls.clients.get(name)

    def get_request(self, resource, request):
        if not isinstance(resource, dict):
            resource = self.specification.find(resource)
        return resource['requests'][request]

    def register(self):
        self.clients[self.bundle] = self
        return self

    def unregister(self):
        if self.clients.get(self.bundle) is self:
            del self.clients[self.bundle]
        return self

    def _construct_context(self, additional=None):
        context = self.context
        if callable(context):
            context = context()
        if context is None:
            context = {}

        if additional:
            context = context.copy()
            context.update(additional)

        return context

class Transport(object):
    """A mesh transport."""

    __metaclass__ = subclass_registry('transports', 'name')
    transports = {}

    request = ServerRequest
    response = ServerResponse
    server = Server
    client = Client

    @classmethod
    def construct_fixture(cls, bundle, specification, environ=None):
        raise NotImplementedError()
