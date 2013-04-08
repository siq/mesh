import errno
import re
import socket
from cgi import parse_header
from httplib import HTTPConnection, HTTPSConnection
from urlparse import urlparse

from scheme import formats
from scheme.fields import INCOMING, OUTGOING

from mesh.bundle import Specification
from mesh.constants import *
from mesh.exceptions import *
from mesh.transport.base import *
from mesh.util import LogHelper

__all__ = ('HttpClient', 'HttpProxy', 'HttpRequest', 'HttpResponse', 'HttpServer')

log = LogHelper(__name__)

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
    TIMEOUT: 408,
    CONFLICT: 409,
    GONE: 410,
    SERVER_ERROR: 500,
    UNIMPLEMENTED: 501,
    BAD_GATEWAY: 502,
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
    TIMEOUT: '409 Request Timeout',
    CONFLICT: '409 Conflict',
    GONE: '410 Gone',
    SERVER_ERROR: '500 Internal Server Error',
    UNIMPLEMENTED: '501 Not Implemented',
    BAD_GATEWAY: '502 Bad Gateway',
    UNAVAILABLE: '503 Service Unavailable',
}

PATH_EXPR = r"""(?x)^%s
    (?P<preamble>(?:/[\w.]+/\d+[.]\d+)+)
    /(?P<resource>[\w.]+)
    (?:/(?P<subject>[-.:;\w]+)
        (?:/(?P<subresource>[\w.]+)
            (?:/(?P<subsubject>[-.:;\w]+))?
        )?
    )?
    (?:[!](?P<format>\w+))?
    /?$"""
        
BUNDLE_EXPR = re.compile(r"""(?x)
    /(?P<bundle>[\w.]+)
    /(?P<major>\d+)[.](?P<minor>\d+)""")

INTROSPECTION_PATH_EXPR = r"""(?x)^%s
    /(?P<bundle>[\w.]+)
    /_(?P<request>[\w.]+)
    (?:[!](?P<format>\w+))?
    /?$"""
    
class Connection(object):
    def __init__(self, url, timeout=None):
        self.scheme, self.host, self.path = urlparse(url)[:3]
        self.path = self.path.rstrip('/')
        self.timeout = timeout
        
        if self.scheme == 'https':
            self.implementation = HTTPSConnection
        elif self.scheme == 'http':
            self.implementation = HTTPConnection
        else:
            raise ValueError(url)

    def request(self, method, url=None, body=None, headers=None,
            mimetype=None, serialize=False):

        if url:
            if url[0] != '/':
                url = '/' + url
        else:
            url = ''

        url = self.path + url
        if body:
            if method == 'GET':
                url = '%s?%s' % (url, body)
                body = None
            elif serialize:
                if mimetype:
                    body = formats.serialize(mimetype, body)
                else:
                    raise ValueError(mimetype)

        headers = headers or {}
        if 'Content-Type' not in headers and mimetype:
            headers['Content-Type'] = mimetype

        connection = self.implementation(self.host, timeout=self.timeout)
        try:
            connection.request(method, url, body, headers)
        except socket.error, exception:
            if exception.errno in (errno.EACCES, errno.EPERM, errno.ECONNREFUSED):
                raise ConnectionRefused(url)
            elif exception.errno == errno.ETIMEDOUT:
                raise ConnectionTimedOut(url)
            else:
                raise ConnectionFailed(url)
        except socket.timeout:
            raise ConnectionTimedOut(url)

        try:
            response = connection.getresponse()
        except socket.error, exception:
            raise ConnectionFailed(url)
        except socket.timeout:
            raise ConnectionTimedOut(url)

        headers = dict((key.title(), value) for key, value in response.getheaders())
        content = response.read() or None

        mimetype = response.getheader('Content-Type', None)
        return HttpResponse(STATUS_CODES[response.status], content, mimetype, headers)

class HttpRequest(ServerRequest):
    """An HTTP API request."""

    def __init__(self, method=None, path=None, mimetype=None, headers=None,
        context=None, serialized=True, **params):

        super(HttpRequest, self).__init__(serialized=serialized, **params)
        self.accept = self._parse_accept_header(headers)
        self.context = context
        self.headers = headers
        self.method = method
        self.mimetype = mimetype
        self.path = path

    def __repr__(self):
        aspects = ['%s:%s' % (self.method, self.path)]
        if self.mimetype:
            aspects.append('(%s)' % self.mimetype)
        if self.context:
            aspects.append('context=%r' % self.context)
        return 'HttpRequest(%s)' % ' '.join(aspects)

    @property
    def description(self):
        aspects = ['%s %s' % (self.method, self.path)]
        if self.mimetype:
            aspects.append('(%s)' % self.mimetype)
        return ' '.join(aspects)

    def _parse_accept_header(self, headers):
        if not headers:
            return

        header = headers.get('HTTP_ACCEPT')
        if not header:
            return

        mimetype = header.split(';', 1)[0]
        if mimetype in formats.Format.formats:
            return parse_header(header)

class HttpResponse(ServerResponse):
    """An HTTP response."""

    @property
    def status_code(self):
        return STATUS_CODES[self.status]

    @property
    def status_line(self):
        return STATUS_LINES[self.status]

    def apply_standard_headers(self):
        headers = self.headers
        if 'Cache-Control' not in headers:
            headers['Cache-Control'] = 'must-revalidate, no-cache'
        if 'Content-Type' not in headers and self.mimetype:
            headers['Content-Type'] = self.mimetype
        if 'Content-Length' not in headers:
            content_length = 0
            if isinstance(self.content, list):
                for chunk in self.content:
                    content_length += len(chunk)
                headers['Content-Length'] = str(content_length)
            else:
                headers['Content-Length'] = str(len(self.content or ''))

class Path(object):
    """An HTTP path."""

    def __init__(self, server, path):
        self.path = path

        match = server.introspection_path_expr.match(path)
        if match:
            self._parse_introspection_path(server, path, match)
            return

        match = server.path_expr.match(path)
        if match:
            self._parse_request_path(server, path, match)
        else:
            raise ValueError(path)

    def __str__(self):
        return self.path

    def __repr__(self):
        tokens = []
        for attr, value in sorted(self.__dict__.iteritems()):
            tokens.append('%s=%r' % (attr, value))
        return 'Path(%s)' % ', '.join(tokens)

    def _parse_format(self, server, path, match):
        self.format = match.group('format')
        if self.format is not None and self.format not in server.formats:
            raise ValueError(path)

    def _parse_introspection_path(self, server, path, match):
        self.type = 'introspection'
        self.bundle = match.group('bundle')
        self.request = match.group('request')
        self.format = self._parse_format(server, path, match)

    def _parse_request_path(self, server, path, match):
        self.type = 'request'
        self.format = self._parse_format(server, path, match)

        candidates = list(BUNDLE_EXPR.finditer(match.group('preamble')))
        if not candidates:
            raise ValueError(path)

        preamble = []
        for candidate in candidates:
            version = (int(candidate.group('major')), int(candidate.group('minor')))
            preamble.extend([candidate.group('bundle'), version])

        self.preamble = tuple(preamble)
        self.resource = match.group('resource')
        self.subject = match.group('subject')
        self.subresource = match.group('subresource')
        self.subsubject = match.group('subsubject')

        tokens = [self.resource]
        if self.subject:
            tokens.append('id')
        if self.subresource:
            tokens.append(self.subresource)
        if self.subsubject:
            tokens.append('id')
        self.signature = (self.preamble, '/'.join(tokens))

class EndpointGroup(object):
    """An HTTP endpoint group."""

    def __init__(self, signature, method, resource, controller, mediators):
        self.controller = controller
        self.default_request = None
        self.filtered_requests = []
        self.mediators = mediators
        self.method = method
        self.resource = resource
        self.signature = signature

    def attach(self, request):
        if request.filter is not None:
            self.filtered_requests.append(request)
        elif self.default_request is None:
            self.default_request = request
        else:
            raise SpecificationError(request)

    def dispatch(self, request, response):
        definition = self.default_request
        for filtered_request in self.filtered_requests:
            if filtered_request.claim(request.data):
                definition = filtered_request
                break

        if not definition:
            return response(BAD_REQUEST)

        definition.process(self.controller, request, response, self.mediators)

class WsgiServer(Server):
    def __init__(self, default_format=None, available_formats=None, mediators=None,
            context_key=None):

        super(WsgiServer, self).__init__(default_format or formats.Json, available_formats, mediators)
        self.context_key = context_key

    def __call__(self, environ, start_response):
        try:
            method = environ['REQUEST_METHOD']
            if method == GET:
                data = environ['QUERY_STRING']
            elif method == OPTIONS:
                data = None
            else:
                data = environ['wsgi.input'].read()

            context = {}
            if self.context_key and self.context_key in environ:
                context = environ[self.context_key]

            path_info = environ['PATH_INFO']

            response = self.dispatch(method, path_info, environ.get('CONTENT_TYPE'),
                context, environ, data)
            response.apply_standard_headers()

            log('verbose', 'for: %s request %s:%s data=%s \t\tresponse status:%s, content=%s' % (environ['REMOTE_ADDR'], method, path_info, str(data),response.status, response.content))
            start_response(response.status_line, response.headers.items())
            return response.content or ''
        except Exception, exception:
            log('exception', 'exception raised during wsgi dispatch')
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

    def __init__(self, bundles, path_prefix=None, default_format=None,
            available_formats=None, mediators=None, context_key=None):

        super(HttpServer, self).__init__(default_format, available_formats,
            mediators, context_key)

        if path_prefix:
            path_prefix = '/' + path_prefix.strip('/')
        else:
            path_prefix = ''

        self.path_expr = re.compile(PATH_EXPR % path_prefix)
        self.introspection_path_expr = re.compile(INTROSPECTION_PATH_EXPR % path_prefix)
        
        self.bundles = {}
        for bundle in bundles:
            if bundle.name not in self.bundles:
                self.bundles[bundle.name] = bundle
            else:
                raise Exception()

        self.descriptions = {}
        self.configure_endpoints()

    def configure_endpoints(self):
        self.groups = {}
        for name, bundle in self.bundles.iteritems():
            for version, candidates in bundle.versions.iteritems():
                preamble = [name, version]
                for subname, candidate in candidates.iteritems():
                    if isinstance(candidate, dict):
                        for subversion, resources in candidate.iteritems():
                            subpreamble = preamble + [subname, subversion]
                            for resource, controller in resources.itervalues():
                                for request in resource.requests.itervalues():
                                    self._construct_endpoint(subpreamble, resource, controller, request)
                    else:
                        resource, controller = candidate
                        for request in resource.requests.itervalues():
                            self._construct_endpoint(preamble, resource, controller, request)

    def dispatch(self, method, path, mimetype, context, headers, data):
        response = HttpResponse()
        if method == OPTIONS:
            for name, value in self.ACCESS_CONTROL_HEADERS.iteritems():
                response.header(name, value)
            return response(OK)

        striped_path = path.strip('/')
        if striped_path in self.bundles:
            return response(OK)

        mimetype = mimetype or URLENCODED
        if ';' in mimetype:
            mimetype, charset = mimetype.split(';', 1)
        if mimetype not in self.formats:
            mimetype = URLENCODED

        try:
            path = Path(self, path)
        except Exception:
            log('info', 'no path found for %s', path)
            return response(NOT_FOUND)

        request = HttpRequest(method, path, mimetype, headers, context)
        request.format = self._identify_response_format(request)

        if path.type == 'introspection':
            return self._dispatch_introspection(request, response)

        if path.signature in self.groups:
            groups = self.groups[path.signature]
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
                log('exception', 'failed to parse data for %r', request)
                return response(BAD_REQUEST)

        try:
            group.dispatch(request, response)
        except Exception:
            log('exception', 'exception raised during dispatch of %r', request)
            return response(SERVER_ERROR)

        if response.content:
            self._prepare_response_content(request, response)
            
        return response

    def _construct_endpoint(self, preamble, resource, controller, request):
        preamble = tuple(preamble)
        if not request.endpoint:
            return

        method, path = request.endpoint
        signature = (preamble, path)

        if signature in self.groups:
            groups = self.groups[signature]
        else:
            self.groups[signature] = groups = dict()

        try:
            group = groups[method]
        except KeyError:
            group = groups[method] = EndpointGroup(signature, method, resource,
                controller, self.mediators)

        group.attach(request)

    def _dispatch_introspection(self, request, response):
        if request.method != GET:
            return response(METHOD_NOT_ALLOWED)

        bundle = request.path.bundle
        if request.path.request == 'specification':
            response(OK, self._get_description(bundle))

        if response.content:
            self._prepare_response_content(request, response)
        return response

    def _get_description(self, name):
        try:
            return self.descriptions[name]
        except KeyError:
            self.descriptions[name] = self.bundles[name].describe()
            return self.descriptions[name]

    def _identify_response_format(self, request):
        if request.accept:
            return (self.formats[request.accept[0]], request.accept[1])
        elif request.path.format:
            return (self.formats[request.path.format], None)
        elif request.mimetype and request.mimetype != URLENCODED:
            return (self.formats[request.mimetype], None)
        else:
            return (self.default_format, None)

    def _prepare_response_content(self, request, response):
        format, params = request.format
        if params:
            response.content = format.serialize(response.content, **params)
        else:
            response.content = format.serialize(response.content)

        response.mimetype = format.mimetype
        if not isinstance(response.content, list):
            response.content = [response.content]

class HttpClient(Client):
    """An HTTP API client."""

    DEFAULT_HEADER_PREFIX = 'X-MESH-'

    def __init__(self, url, specification=None, context=None, format=formats.Json, formats=None,
            context_header_prefix=None, timeout=None, bundle=None):

        super(HttpClient, self).__init__(context=context, format=format,
                formats=formats)
        if '//' not in url:
            url = 'http://' + url

        self.connection = Connection(url, timeout)
        if bundle and not specification:
            specification = self._introspect_bundle(bundle)
        if not specification:
            raise ValueError(specification)
        if not isinstance(specification, Specification):
            specification = Specification(specification)

        self.context_header_prefix = context_header_prefix or self.DEFAULT_HEADER_PREFIX
        self.paths = {}
        self.specification = specification
        self.url = url.rstrip('/')

    def construct_headers(self, context=None):
        headers = {}
        if context is not False:
            for name, value in self._construct_context(context).iteritems():
                headers[self.context_header_prefix + name] = value

        return headers

    def execute(self, resource, request, subject=None, data=None, format=None, context=None):
        request, method, path, mimetype, data, headers = self._prepare_request(resource, request,
            subject, data, format, context)

        try:
            response = self.connection.request(method, path, data, headers)
        except socket.timeout:
            raise TimeoutError()

        if response.status in request['responses']:
            schema = request['responses'][response.status]['schema']
        elif not (response.status in ERROR_STATUS_CODES and not response.content):
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

    def ping(self):
        try:
            response = self.connection.request('GET', self.specification.name)
            return response.ok
        except (RequestError, IOError):
            return False

    def prepare(self, resource, request, subject=None, data=None, format=None, context=None,
            preparation=None):
        request, method, path, mimetype, data, headers = self._prepare_request(resource, request,
            subject, data, format, context)

        preparation = preparation or {}
        preparation.update(method=method, url=self.url + path)

        if mimetype:
            preparation['mimetype'] = mimetype
        if data:
            preparation['data'] = data
        if headers:
            preparation['headers'] = headers
        return preparation

    def _introspect_bundle(self, bundle):
        response = self.connection.request(GET, '%s/_specification' % bundle,
            headers=self.construct_headers())
        return self.format.unserialize(response.content)
        
    def _prepare_request(self, resource, request, subject=None, data=None, format=None, context=None):
        if not isinstance(resource, dict):
            resource = self.specification.find(resource)
        request = resource['requests'][request]

        format = format or self.format
        method, path = request['endpoint']

        mimetype = None
        if data is not None:
            data = request['schema'].process(data, OUTGOING, True)
            if method == GET:
                data = formats.UrlEncoded.serialize(data)
                mimetype = formats.UrlEncoded.mimetype
            else:
                data = format.serialize(data)
                mimetype = format.mimetype

        path = self._get_path(request['path'])
        if subject:
            path = path % (subject, format.name)
        else:
            path = path % format.name

        headers = self.construct_headers(context)
        if mimetype:
            headers['Content-Type'] = mimetype

        return request, method, path, mimetype, data, headers

    def _get_path(self, path):
        try:
            return self.paths[path]
        except KeyError:
            template = '%s!%%s' % re.sub(r'\/id(?=\/|$)', '/%s', path)
            self.paths[path] = template
            return template

class HttpProxy(WsgiServer):
    """An HTTP proxy."""

    PROXIED_REQUEST_HEADERS = {'HTTP_COOKIE': 'Cookie'}

    def __init__(self, url, context=None, default_format=None, available_formats=None,
            mediators=None, context_key=None, context_header_prefix=None, timeout=None):

        super(HttpProxy, self).__init__(default_format, available_formats, mediators, context_key)
        self.context_header_prefix = context_header_prefix or HttpClient.DEFAULT_HEADER_PREFIX
        self.connection = Connection(url, timeout)
        self.context = context or {}
        self.url = url

    def dispatch(self, method, path, mimetype, context, headers, data):
        if self.context:
            additional = self.context
            if callable(additional):
                additional = additional()
            if additional:
                context.update(additional)

        request_headers = {}
        for name, value in context.iteritems():
            request_headers[self.context_header_prefix + name] = value
        if mimetype:
            request_headers['Content-Type'] = mimetype

        for incoming_name, outgoing_name in self.PROXIED_REQUEST_HEADERS.iteritems():
            if incoming_name in headers:
                request_headers[outgoing_name] = headers[incoming_name]

        log('debug', 'proxying wsgi request %s:%s to %s' % (method, path, self.url))

        try:
            return self.connection.request(method, path, data, request_headers)
        except socket.error:
            raise TimeoutError()

class HttpTransport(Transport):
    name = 'http'
    request = HttpRequest
    response = HttpResponse
    server = HttpServer
    client = HttpClient

    @classmethod
    def construct_fixture(cls, bundle, specification, environ=None):
        pass
