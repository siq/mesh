import BaseHTTPServer
import re
from httplib import HTTPConnection
from urlparse import urlparse

from mesh.bundle import Specification
from mesh.constants import *
from mesh.exceptions import *
from mesh.transport.base import *
from scheme.fields import INCOMING, OUTGOING
from scheme.formats import *

__all__ = ('ForwardingHttpServer', 'HttpClient', 'HttpRequest', 'HttpResponse', 'HttpServer')

STATUS_CODES = {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    SUBSET: 203,
    PARTIAL: 206,
    BAD_REQUEST: 400,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    INVALID: 406,
    CONFLICT: 409,
    GONE: 410,
    SERVER_ERROR: 500,
    UNIMPLEMENTED: 501,
    UNAVAILABLE: 503,
}

STATUS_CODES.update(dict((code, status) for status, code in STATUS_CODES.items()))

STATUS_LINES = {
    OK: '200 OK',
    CREATED: '201 Created',
    ACCEPTED: '202 Accepted',
    SUBSET: '203 Subset',
    PARTIAL: '206 Partial',
    BAD_REQUEST: '400 Bad Request',
    FORBIDDEN: '403 Forbidden',
    NOT_FOUND: '404 Not Found',
    METHOD_NOT_ALLOWED: '405 Method Not Allowed',
    INVALID: '406 Invalid',
    CONFLICT: '409 Conflict',
    GONE: '410 Gone',
    SERVER_ERROR: '500 Internal Server Error',
    UNIMPLEMENTED: '501 Not Implemented',
    UNAVAILABLE: '503 Service Unavailable',
}

PATH_EXPR = r"""(?x)^%s
    /(?P<bundle>\w+)
    /(?P<major>\d+)[.](?P<minor>\d+)
    /(?P<resource>\w+)
    (?:/(?P<subject>\w+)(?P<tail>(?:/\w+)+)?)?
    (?:[.](?P<format>\w+))?
    /?$"""

class Connection(object):
    def __init__(self, url):
        self.scheme, self.host, self.path = urlparse(url)[:3]
        self.path = self.path.rstrip('/')

    def request(self, method, url, body=None, headers=None):
        if url[0] != '/':
            url = '/' + url

        connection = HTTPConnection(self.host)
        connection.request(method, self.path + url, body, headers or {})

        response = connection.getresponse()
        content = response.read() or None

        mimetype = response.getheader('Content-Type', None)
        return HttpResponse(STATUS_CODES[response.status], content, mimetype)

class HttpRequest(ServerRequest):
    """An HTTP API request."""

    def __init__(self, method=None, path=None, mimetype=None, headers=None,
        context=None, serialized=True, **params):

        super(HttpRequest, self).__init__(serialized=serialized, **params)
        self.context = context
        self.headers = headers
        self.method = method
        self.mimetype = mimetype
        self.path = path

class HttpResponse(ServerResponse):
    """An HTTP response."""

    def __init__(self, status=None, content=None, mimetype=None):
        super(HttpResponse, self).__init__(status, content, mimetype)
        self.headers = {}

    @property
    def status_code(self):
        return STATUS_CODES[self.status]

    @property
    def status_line(self):
        return STATUS_LINES[self.status]

    def header(self, name, value):
        self.headers[name] = value

class Path(object):
    """An HTTP request path."""

    def __init__(self, server, path):
        self.path = path

        match = server.path_expr.match(path)
        if not match:
            raise ValueError(path)

        self.bundle = match.group('bundle')
        if self.bundle not in server.bundles:
            raise ValueError(path)

        self.resource = match.group('resource')
        resource_path = [self.resource]

        self.subject = match.group('subject')
        if self.subject:
            resource_path.append('id')

        self.tail = match.group('tail')
        if self.tail:
            resource_path.append(self.tail)

        self.format = match.group('format')
        if self.format is not None and self.format not in server.formats:
            raise ValueError(path)

        self.version = (int(match.group('major')), int(match.group('minor')))
        self.resource_path = '/'.join(resource_path)

class EndpointGroup(object):
    """An HTTP endpoint group."""

    def __init__(self, signature, method, resource, controller):
        self.controller = controller
        self.default_request = None
        self.filtered_requests = []
        self.method = method
        self.resource = resource
        self.signature = signature

    def attach(self, request):
        if request.filter is not None:
            self.filtered_requests.append(request)
        elif self.default_request is None:
            self.default_request = request
        else:
            raise SpecificationError()

    def dispatch(self, request, response):
        definition = self.default_request
        for filtered_request in self.filtered_requests:
            if filtered_request.claim(request.data):
                definition = filtered_request
                break

        if not definition:
            return response(BAD_REQUEST)
        definition.process(self.controller, request, response)

class WsgiServer(Server):
    HEADER_PREFIX = 'HTTP_X_MESH_'
    HEADER_PREFIX_LENGTH = len(HEADER_PREFIX)

    def __call__(self, environ, start_response):
        try:
            method = environ['REQUEST_METHOD']
            if method == GET:
                data = environ['QUERY_STRING']
            elif method == OPTIONS:
                data = None
            else:
                data = environ['wsgi.input'].read()

            path = environ['PATH_INFO']
            response = self.dispatch(method, path, environ.get('CONTENT_TYPE'), environ, data)

            start_response(response.status_line, response.headers.items())
            return response.content or ''
        except Exception, exception:
            import traceback; traceback.print_exc()
            start_response('500 Internal Server Error', [])
            return ''

class HttpServer(WsgiServer):
    """The HTTP API server."""

    ACCESS_CONTROL_HEADERS = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, GET, OPTIONS, POST, PUT',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '2592000',
    }
    CONTEXT_HEADER_PREFIX = 'HTTP_X_MESH_'
    CONTEXT_HEADER_PREFIX_LENGTH = len(CONTEXT_HEADER_PREFIX)

    def __init__(self, bundles, path_prefix=None, default_format=Json, available_formats=None):
        super(HttpServer, self).__init__(default_format, available_formats)
        if path_prefix:
            path_prefix = '/' + path_prefix.strip('/')
        else:
            path_prefix = ''
        self.path_expr = re.compile(PATH_EXPR % path_prefix)
        
        self.bundles = {}
        for bundle in bundles:
            if bundle.name not in self.bundles:
                self.bundles[bundle.name] = bundle
            else:
                raise Exception()

        self.groups = {}
        for name, bundle in self.bundles.iteritems():
            for version, resources in bundle.versions.iteritems():
                for resource, controller in resources.itervalues():
                    for request in resource.requests.itervalues():
                        if request.endpoint:
                            self._construct_endpoint(name, version, resource, controller, request)

    def dispatch(self, method, path, mimetype, headers, data):
        response = HttpResponse()
        if method == OPTIONS:
            for name, value in self.ACCESS_CONTROL_HEADERS.iteritems():
                response.header(name, value)
            return response(OK)

        mimetype = mimetype or URLENCODED
        if ';' in mimetype:
            mimetype, charset = mimetype.split(';', 1)
        if mimetype not in self.formats:
            mimetype = URLENCODED

        prefix = self.CONTEXT_HEADER_PREFIX
        prefix_len = self.CONTEXT_HEADER_PREFIX_LENGTH

        context = {}
        for name, value in headers.iteritems():
            if name[:prefix_len] == prefix:
                context[name[prefix_len:].lower()] = value

        request = HttpRequest(method=method, mimetype=mimetype, headers=headers, context=context)
        try:
            request.path = path = Path(self, path)
        except Exception:
            return response(NOT_FOUND)

        signature = (path.bundle, path.version, path.resource_path)
        if signature in self.groups:
            groups = self.groups[signature]
            if method in groups:
                group = groups[method]
            else:
                return response(METHOD_NOT_ALLOWED)
        else:
            return response(NOT_FOUND)

        request.subject = path.subject
        if data:
            try:
                request.data = self.formats[mimetype].unserialize(data)
            except Exception:
                import traceback;traceback.print_exc()
                return response(BAD_REQUEST)

        try:
            group.dispatch(request, response)
        except Exception:
            from traceback import print_exc;print_exc()
            return response(SERVER_ERROR)

        format = self.default_format
        if path.format:
            format = self.formats[path.format]
        elif mimetype and mimetype != URLENCODED:
            format = self.formats.get(mimetype)

        response.header('Access-Control-Allow-Origin', '*')
        if response.content:
            response.mimetype = format.mimetype
            response.content = format.serialize(response.content)
            response.header('Content-Type', response.mimetype)
            response.header('Content-Length', str(len(response.content)))

        return response

    def _construct_endpoint(self, bundle, version, resource, controller, request):
        method, path = request.endpoint
        signature = (bundle, version, path)

        if signature in self.groups:
            groups = self.groups[signature]
        else:
            self.groups[signature] = groups = dict()

        try:
            group = groups[method]
        except KeyError:
            group = groups[method] = EndpointGroup(signature, method, resource, controller)
        group.attach(request)

class HttpClient(Client):
    """An HTTP API client."""

    CONTEXT_HEADER_PREFIX = 'X-MESH-'

    def __init__(self, url, specification, context=None, format=Json, formats=None):

        super(HttpClient, self).__init__(specification, context, format, formats)
        self.connection = Connection(url)
        self.paths = {}
        self.url = url
        self.initial_path = '/%s/%d.%d/' % (self.specification.name,
            self.specification.version[0], self.specification.version[1])

        self.headers = {}
        for name, value in self.context.iteritems():
            self.headers[self.CONTEXT_HEADER_PREFIX + name] = value

    def execute(self, resource, request, subject=None, data=None, format=None):
        format = format or self.format
        request = self.specification.resources[resource]['requests'][request]

        method, path = request['endpoint']
        mimetype = None

        if data is not None:
            data = request['schema'].process(data, OUTGOING, True)
            if method == GET:
                data = UrlEncoded.serialize(data)
                mimetype = UrlEncoded.mimetype
            else:
                data = format.serialize(data)
                mimetype = format.mimetype

        path = self._get_path(path)
        if subject:
            path = path % (subject, format.name)
        else:
            path = path % format.name

        headers = self.headers.copy()
        if mimetype:
            headers['Content-Type'] = mimetype

        response = self.connection.request(method, path, data, headers)
        if response.status in request['responses']:
            schema = request['responses'][response.status]['schema']
        else:
            exception = RequestError.construct(response.status)
            if exception:
                raise exception
            else:
                raise Exception('unknown status')

        if response.content:
            format = self.formats[response.mimetype]
            response.content = schema.process(format.unserialize(response.content), INCOMING, True)

        if response.ok:
            return response
        else:
            raise RequestError.construct(response.status, response.content)

    def _get_path(self, path):
        try:
            return self.paths[path]
        except KeyError:
            template = '%s%s.%%s' % (self.initial_path, re.sub(r'\/id(?=\/|$)', '/%s', path))
            self.paths[path] = template
            return template

class ForwardingHttpServer(WsgiServer):
    """An HTTP API server which forwards requests."""

    PATH_EXPR = r'^%s/(?P<bundle>\w+)/(?P<path>.*)$'

    def __init__(self, bundles, path_prefix=None, default_format=Json, available_formats=None):
        super(ForwardingHttpServer, self).__init__(default_format, available_formats)
        if path_prefix:
            path_prefix = '/' + path_prefix.strip('/')
        else:
            path_prefix = ''
        self.path_expr = re.compile(self.PATH_EXPR % path_prefix)

        self.connections = {}
        for name, url in bundles.iteritems():
            self.connections[name] = Connection(url)

    def dispatch(self, method, path, mimetype, headers, data):
        match = self.path_expr.match(path)
        if not match:
            return response(NOT_FOUND)

        connection = self.connections.get(match.group('bundle'))
        if not connection:
            return response(NOT_FOUND)

        fullpath = '%s/%s' % (match.group('bundle'), match.group('path'))
        return connection.request(method, fullpath, data)

class HttpTransport(Transport):
    name = 'http'
    request = HttpRequest
    response = HttpResponse
    server = HttpServer
    client = HttpClient

    @classmethod
    def construct_fixture(cls, bundle, specification, environ=None):
        pass
