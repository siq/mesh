import threading

from mesh.bundle import Specification
from mesh.constants import *
from mesh.exceptions import *
from mesh.util import subclass_registry
from scheme.fields import Field
from scheme.formats import *

__all__ = ('STANDARD_FORMATS', 'Client', 'Server', 'ServerRequest', 'ServerResponse', 'Transport')

STANDARD_FORMATS = (Json, UrlEncoded)

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

    def __init__(self, status=None, content=None, mimetype=None):
        self.content = content
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

class Server(object):
    """An API server."""

    def __init__(self, default_format=None, available_formats=None):
        self.default_format = default_format
        self.formats = {}
        for format in (available_formats or STANDARD_FORMATS):
            self.formats[format.name] = self.formats[format.mimetype] = format

    def dispatch(self):
        raise NotImplementedError()

class ClientManager(object):
    def __init__(self):
        self.clients = {}

    def clear(self):
        self.clients = {}

    def get(self, specification):
        if isinstance(specification, Specification):
            id = specification.id
        else:
            id = specification
        return self.clients.get(id)

    def register(self, client):
        self.clients[client.specification.id] = client

    def unregister(self, client):
        id = client.specification.id
        if self.clients.get(id) is client:
            del self.clients[id]

class LocalClients(threading.local):
    def __init__(self):
        self.manager = ClientManager()

class Client(object):
    """An API client."""

    global_clients = ClientManager()
    local_clients = LocalClients()

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
        
    def execute(self, resource, request, subject=None, data=None, format=None):
        raise NotImplementedError()

    @classmethod
    def get_client(cls, specification):
        client = cls.local_clients.manager.get(specification)
        if client:
            return client
        else:
            return cls.global_clients.get(specification)

    def register(self, local=True):
        if local:
            self.local_clients.manager.register(self)
        else:
            self.global_clients.register(self)
        return self

    def unregister(self, local=True):
        if local:
            self.local_clients.manager.unregister(self)
        else:
            self.global_clients.unregister(self)
        return self

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
