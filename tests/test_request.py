from unittest2 import TestCase

from mesh.constants import *
from mesh.exceptions import *
from mesh.request import *
from mesh.transport.internal import *
from scheme import *

def construct_example_request(resource, name='test', specific=False, endpoint=(GET, 'resource'),
    auto_constructed=True, schema=None, ok=None, filter=None, batch=False, validators=None):

    if schema is None:
        schema = Structure({'id': Integer()})
    elif isinstance(schema, dict):
        schema = Structure(schema)
    if ok is None:
        ok = Response(Structure({'id': Integer()}))
    elif isinstance(ok, dict):
        ok = Response(Structure(ok))

    return Request(
        name = name,
        auto_constructed = auto_constructed,
        endpoint = endpoint,
        specific = specific,
        batch = batch,
        resource = resource,
        filter = filter,
        schema = schema,
        validators = validators,
        responses = {
            OK: ok,
            INVALID: Response(Errors),
        }
    )

def construct_controller_harness(expected_subject=None, subject=None, status=OK, content=None,
    callback=None):

    class Controller(object):
        @classmethod
        def acquire(cls, received_subject):
            assert received_subject == expected_subject
            return subject

        def dispatch(self, request, context, response, dispatched_subject, data):
            assert isinstance(request, Request)
            assert isinstance(context, Context)
            assert isinstance(response, ServerResponse)
            assert dispatched_subject == subject
            if callback:
                callback(request, context, response, dispatched_subject, data)
            else:
                response(status, content)
    return Controller

class RequestHarness(object):
    @classmethod
    def get_request(cls, resource):
        return cls

class TestResponse(TestCase):
    def test(self):
        response = Response()
        self.assertIs(response.schema, None)

        for arg in (Structure({}), {}):
            response = Response(arg)
            self.assertIsInstance(response.schema, Structure)
            self.assertEqual(response.schema.name, 'response')

        response = Response(Structure({}, name='testing'))
        self.assertEqual(response.schema.name, 'testing')

class TestRequest(TestCase):
    def test_declarative_creation(self):
        class operation:
            endpoint = (GET, 'resource')
            title = 'operation'
            schema = {}
            responses = {}

        resource = object()
        request = Request.construct(resource, operation)

        self.assertIs(request.specific, False)
        self.assertIs(request.auto_constructed, False)
        self.assertIs(request.description, None)
        self.assertEqual(request.endpoint, (GET, 'resource'))
        self.assertIs(request.filter, None)
        self.assertEqual(request.name, 'operation')
        self.assertIs(request.resource, resource)
        self.assertEqual(request.responses, {})
        self.assertIsInstance(request.schema, Structure)
        self.assertEqual(request.title, 'operation')

        class described:
            """description"""

        resource = object()
        request = Request.construct(resource, described)
        self.assertEqual(request.description, 'description')

    def test_declarative_inheritance(self):
        class first(RequestHarness):
            endpoint = (GET, 'resource')
            schema = {}
            responses = {
                OK: Response({}, OK),
            }
            title = 'first'

        class second(first):
            schema = {'id': Integer()}
            responses = {
                PARTIAL: {}
            }
            title = 'second'

        resource = object()
        request = Request.construct(resource, second)

        self.assertFalse(request.specific)
        self.assertFalse(request.auto_constructed)
        self.assertEqual(request.endpoint, (GET, 'resource'))
        self.assertIs(request.filter, None)
        self.assertEqual(request.name, 'second')
        self.assertIs(request.resource, resource)
        self.assertEqual(set(request.responses.keys()), set([OK, PARTIAL]))
        self.assertIsInstance(request.schema, Structure)
        self.assertIsInstance(request.schema.structure['id'], Integer)
        self.assertEqual(request.title, 'second')

    def test_auto_constructor_inheritance(self):
        class harness(object):
            @staticmethod
            def get_request(resource):
                return construct_example_request(resource)

        class second(harness):
            responses = {
                PARTIAL: {}
            }
            title = 'second'

        resource = object()
        request = Request.construct(resource, second)

        self.assertFalse(request.specific)
        self.assertFalse(request.auto_constructed)
        self.assertEqual(request.endpoint, (GET, 'resource'))
        self.assertIs(request.filter, None)
        self.assertEqual(request.name, 'second')
        self.assertIs(request.resource, resource)
        self.assertEqual(set(request.responses.keys()), set([OK, PARTIAL, INVALID]))
        self.assertIsInstance(request.schema, Structure)
        self.assertIsInstance(request.schema.structure['id'], Integer)
        self.assertEqual(request.title, 'second')

    def test_field_injection(self):
        class harness(object):
            @staticmethod
            def get_request(resource):
                return construct_example_request(resource, schema={'id': Integer(), 'name': Text()})

        class second(harness):
            fields = {
                'attr': Text(),
                'name': None,
            }

        resource = object()
        request = Request.construct(resource, second)

        self.assertIsInstance(request.schema, Structure)
        self.assertEqual(set(request.schema.structure.keys()), set(['id', 'attr']))

    def test_request_claiming(self):
        request = construct_example_request(object())
        for candidate in [None, {}, [], {'a': 1}, [1, 2], [{'a': 1}]]:
            self.assertFalse(request.claim(candidate))

        request = construct_example_request(object(), filter={})
        for candidate in [{}, {'a': 1}]:
            self.assertTrue(request.claim(candidate))
        for candidate in [None, [], [1, 2], [{'a': 1}]]:
            self.assertFalse(request.claim(candidate))

        request = construct_example_request(object(), filter={'a': 1})
        for candidate in [{'a': 1}]:
            self.assertTrue(request.claim(candidate))
        for candidate in [None, [], {}, [1, 2], [{'a': 1}]]:
            self.assertFalse(request.claim(candidate))

        request = construct_example_request(object(), filter=[])
        for candidate in [[], [1, 2], [{'a': 1}]]:
            self.assertTrue(request.claim(candidate))
        for candidate in [None, {}, {'a': 1}]:
            self.assertFalse(request.claim(candidate))

        request = construct_example_request(object(), filter=[{'a': 1}])
        for candidate in [[{'a': 1}]]:
            self.assertTrue(request.claim(candidate))
        for candidate in [None, {}, [], {'a': 1}]:
            self.assertFalse(request.claim(candidate))

    def test_basic_processing(self):
        request = construct_example_request(object())
        controller = construct_controller_harness(None, None, OK, {'id': 1})

        server_request = ServerRequest(None)
        response = ServerResponse()

        request.process(controller, server_request, response)
        self.assertEqual(response.status, OK)
        self.assertEqual(response.content, {'id': 1})

        req, resp = ServerRequest(None, subject=2), ServerResponse()
        request.process(controller, req, resp)
        self.assertEqual(resp.status, BAD_REQUEST)

    def test_subject_processing(self):
        request = construct_example_request(object(), specific=True)

        controller = construct_controller_harness(2, None)
        req, resp = ServerRequest(None, subject=2), ServerResponse()

        request.process(controller, req, resp)
        self.assertEqual(resp.status, GONE)

        controller = construct_controller_harness(2, True)
        req, resp = ServerRequest(None, subject=2), ServerResponse()

        request.process(controller, req, resp)
        self.assertEqual(resp.status, OK)

    def test_request_validation(self):
        request = construct_example_request(object(), schema={'id': Integer(maximum=1)})
        controller = construct_controller_harness()

        req, resp = ServerRequest(None, data={'id': 1}), ServerResponse()
        request.process(controller, req, resp)
        self.assertEqual(resp.status, OK)

        req, resp = ServerRequest(None, data={'id': 2}), ServerResponse()
        request.process(controller, req, resp)
        self.assertEqual(resp.status, INVALID)
        self.assertEqual(resp.content, (None, {'id': [{'token': 'maximum', 'message': 'id must be less then or equal to 1'}]}))

    def test_response_validation(self):
        request = construct_example_request(object(), ok={'id': Integer(required=True)})
        controller = construct_controller_harness(content={'id': 1})

        req, resp = ServerRequest(None), ServerResponse()
        request.process(controller, req, resp)
        self.assertEqual(resp.status, OK)

        controller = construct_controller_harness(content={})
        req, resp = ServerRequest(None), ServerResponse()
        request.process(controller, req, resp)
        self.assertEqual(resp.status, SERVER_ERROR)

    def test_general_validators(self):
        class Resource(object):
            @validator()
            def validate(cls, data):
                if data['id'] != 2:
                    raise ValidationError({'token': 'incorrect'})

        request = construct_example_request(Resource, validators=[Resource.validate])
        controller = construct_controller_harness()
        req, resp = ServerRequest(None, data={'id': 2}), ServerResponse()

        request.process(controller, req, resp)
        self.assertEqual(resp.status, OK)

        req, resp = ServerRequest(None, data={'id': 1}), ServerResponse()
        request.process(controller, req, resp)
        self.assertEqual(resp.status, INVALID)
        self.assertEqual(resp.content, ([{'token': 'incorrect'}], None))

    def test_specific_validators(self):
        class Resource(object):
            @validator('id')
            def validate(cls, data):
                if data['id'] != 2:
                    raise ValidationError({'token': 'incorrect'})

        request = construct_example_request(Resource, validators=[Resource.validate])
        controller = construct_controller_harness()

        req, resp = ServerRequest(None, data={'id': 2}), ServerResponse()
        request.process(controller, req, resp)
        self.assertEqual(resp.status, OK)

        req, resp = ServerRequest(None, data={'id': 1}), ServerResponse()
        request.process(controller, req, resp)
        self.assertEqual(resp.status, INVALID)
        self.assertEqual(resp.content, (None, {'id': [{'token': 'incorrect'}]}))

    def test_multiple_validators(self):
        class Resource(object):
            @validator()
            def validate(cls, data):
                raise ValidationError({'token': 'general'})
            @validator('id')
            def validate2(cls, data):
                if data['id'] < 2:
                    raise ValidationError({'token': '2'})
            @validator('id')
            def validate3(cls, data):
                if data['id'] < 3:
                    raise ValidationError({'token': '3'})

        request = construct_example_request(Resource, validators=[Resource.validate,
            Resource.validate2, Resource.validate3])
        controller = construct_controller_harness()
        
        req, resp = ServerRequest(None, data={'id': 3}), ServerResponse()
        request.process(controller, req, resp)
        self.assertEqual(resp.status, INVALID)
        self.assertEqual(resp.content, ([{'token': 'general'}], None))

        req, resp = ServerRequest(None, data={'id': 2}), ServerResponse()
        request.process(controller, req, resp)
        self.assertEqual(resp.status, INVALID)
        self.assertEqual(resp.content, ([{'token': 'general'}], {'id': [{'token': '3'}]}))

        req, resp = ServerRequest(None, data={'id': 1}), ServerResponse()
        request.process(controller, req, resp)
        self.assertEqual(resp.status, INVALID)
        self.assertEqual(resp.content, ([{'token': 'general'}], {'id': [{'token': '2'}, {'token': '3'}]}))
