from mesh.bundle import Specification, format_version
from mesh.constants import *
from mesh.exceptions import *
from mesh.transport.base import *
from scheme.formats import *

__all__ = ('InternalClient', 'InternalServer', 'ServerRequest', 'ServerResponse')

class InternalServer(Server):
    """An API server."""

    def __init__(self, bundles, default_format=None, available_formats=None, mediators=None):
        super(InternalServer, self).__init__(default_format, available_formats, mediators)

        self.bundles = {}
        for bundle in bundles:
            if bundle.name not in self.bundles:
                self.bundles[bundle.name] = bundle
            else:
                raise Exception()

        self.endpoints = {}
        for name, bundle in self.bundles.iteritems():
            for version, candidates in bundle.versions.iteritems():
                preamble = [name, format_version(version)]
                for subname, candidate in candidates.iteritems():
                    if isinstance(candidate, dict):
                        for subversion, resources in candidate.iteritems():
                            subpreamble = preamble + [subname, format_version(subversion)]
                            for resource, controller in resources.itervalues():
                                for request in resource.requests.itervalues():
                                    self._construct_endpoint(subpreamble, resource,
                                        controller, request)
                    else:
                        resource, controller = candidate
                        for request in resource.requests.itervalues():
                            self._construct_endpoint(preamble, resource, controller, request)

    def dispatch(self, endpoint, environ, subject, data, format=None):
        request = ServerRequest(endpoint, environ, subject, data)
        response = ServerResponse()

        endpoint = self.endpoints.get(endpoint)
        if endpoint:
            resource, controller, definition = endpoint
        else:
            return response(NOT_FOUND)

        if format:
            try:
                format = self.formats[format]
                request.data = format.unserialize(data)
            except Exception:
                return response(BAD_REQUEST)
            else:
                request.serialized = True

        try:
            definition.process(controller, request, response, self.mediators)
        except Exception, exception:
            import traceback;traceback.print_exc()

        if format:
            response.mimetype = format.mimetype
            if response.content:
                response.content = format.serialize(response.content)
        return response

    def _construct_endpoint(self, preamble, resource, controller, request):
        signature = ('/'.join(preamble + [resource.name]), request.name)
        if signature not in self.endpoints:
            self.endpoints[signature] = (resource, controller, request)
        else:
            raise Exception()

class InternalClient(Client):
    """An internal API client."""

    def __init__(self, server, specification, context=None, format=None, formats=None):
        super(InternalClient, self).__init__(specification, context, format, formats)
        self.server = server

    def execute(self, resource, request, subject=None, data=None, format=None, context=None):
        context = self._construct_context(context)
        if isinstance(resource, dict):
            resource = resource['id']

        format = format or self.format
        if not format:
            return self._dispatch_request(resource, request, subject, data, context)

    def _dispatch_request(self, resource, request, subject, data, context):
        response = self.server.dispatch((resource, request), context, subject, data)
        if response.ok:
            return response
        else:
            raise RequestError.construct(response.status, response.content)

class InternalTransport(Transport):
    name = 'internal'
    server = InternalServer
    client = InternalClient

    @classmethod
    def construct_fixture(cls, bundle, specification, context=None, mediators=None):
        server = InternalServer([bundle], mediators=mediators)
        client = InternalClient(server, specification, context)
        return server, client
