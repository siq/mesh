from mesh.bundle import Specification
from mesh.constants import *
from mesh.exceptions import *
from mesh.util import subclass_registry
from scheme.fields import Field
from scheme.formats import *

__all__ = ('STANDARD_FORMATS', 'Client', 'Server', 'ServerRequest', 'ServerResponse', 'Transport')

STANDARD_FORMATS = (Csv, Json, UrlEncoded)

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

    def __init__(self, specification, context=None, format=None, formats=None):
        if not isinstance(specification, Specification):
            specification = Specification(specification)

        self.context = context or {}
        self.format = format
        self.specification = specification

        self.formats = {}
        for format in (formats or STANDARD_FORMATS):
            for key in (format, format.name, format.mimetype):
                self.formats[key] = format

    def execute(self, resource, request, subject=None, data=None, format=None, context=None):
        raise NotImplementedError()

    @classmethod
    def get_client(cls, name):
        if isinstance(name, Specification):
            name = name.name
        return cls.clients.get(name)

    def register(self):
        self.clients[self.specification.name] = self
        return self

    def unregister(self):
        name = self.specification.name
        if self.clients.get(name) is self:
            del self.clients[name]
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
