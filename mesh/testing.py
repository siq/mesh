import os
from types import FunctionType

from unittest2 import TestCase

from mesh.transport.http import HttpClient
from mesh.transport.internal import InternalTransport
from mesh.util import call_with_supported_params

def versions(version=None, min_version=None, max_version=None):
    def decorator(method):
        if version is not None:
            method.version = version
        if min_version is not None:
            method.min_version = min_version
        if max_version is not None:
            method.max_version = max_version
        return method
    return decorator

def _execute_wrapper(method, bundle, version):
    def wrapper(resource, *args, **kwargs):
        if isinstance(resource, basestring):
            resource = '%s/%s.%s/%s' % (bundle.name, version[0], version[1], resource)
        return method(resource, *args, **kwargs)

    return wrapper

def _construct_test_method(function, bundle, generator, version, context, mediators):
    test_client = os.environ.get('MESH_TEST_CLIENT', '')
    if test_client[:4] == 'http':
        url = test_client[5:]
        def test(self):
            specification = bundle.specify()
            client = HttpClient(url, specification, context=context)
            client._execute = client.execute
            client.execute = _execute_wrapper(client._execute, bundle, version)

            if generator:
                client.register()
                try:
                    binding = generator.generate_dynamically(bundle, version)
                    call_with_supported_params(function, self, client=client, binding=binding,
                        **binding.__dict__)
                finally:
                    client.unregister()
            else:
                call_with_supported_params(function, self, client=client)
    else:
        def test(self):
            specification = bundle.specify()
            server, client = InternalTransport.construct_fixture(bundle, specification,
                context=context, mediators=mediators)
            client._execute = client.execute
            client.execute = _execute_wrapper(client._execute, bundle, version)

            if generator:
                client.register()
                try:
                    binding = generator.generate_dynamically(bundle, version)
                    call_with_supported_params(function, self, client=client, binding=binding,
                        **binding.__dict__)
                finally:
                    client.unregister()
            else:
                call_with_supported_params(function, self, client=client)

    test.__name__ = '%s_v%d_%d' % (function.__name__, version[0], version[1])
    return test

def _generate_test_methods(testcase, function):
    bundle = testcase.bundle
    versions = bundle.slice(
        getattr(function, 'version', None),
        getattr(function, 'min_version', None),
        getattr(function, 'max_version', None))

    generator = testcase.generator
    for version in versions:
        method = _construct_test_method(function, bundle, generator, version,
            testcase.context, testcase.mediators)
        setattr(testcase, method.__name__, method)

class MeshTestCaseMeta(type):
    def __new__(metatype, name, bases, namespace):
        tests = []
        for attr in namespace.keys():
            function = namespace[attr]
            if isinstance(function, FunctionType) and attr[:5] == 'test_':
                tests.append(namespace.pop(attr))

        testcase = type.__new__(metatype, name, bases, namespace)
        for test in tests:
            _generate_test_methods(testcase, test)

        return testcase

class MeshTestCase(TestCase):
    __metaclass__ = MeshTestCaseMeta
    bundle = None
    context = None
    generator = None
    mediators = None
