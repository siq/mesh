from unittest2 import TestCase

from mesh.constants import *
from mesh.request import *
from mesh.resource import *
from scheme import *

def construct_example_request(resource):
    return Request(
        name = 'test',
        endpoint = (GET, 'resource'),
        auto_constructed = True,
        resource = resource,
        schema = Structure({
            'id': Integer()
        }),
        responses = {
            OK: Response(Structure({'id': Integer()}))
        }
    )

EXAMPLE_REQUESTS = {'test': construct_example_request}

class TestResource(TestCase):
    def setUp(self):
        self.configuration = Configuration(EXAMPLE_REQUESTS)

    def example_resource(self):
        class Example(Resource):
            """description"""

            configuration = self.configuration
            name = 'example'
            version = 1

            class schema:
                name = Text()

        return Example

    def test_resource_declaration(self):
        Example = self.example_resource()

        self.assertIs(Example.configuration, self.configuration)
        self.assertEqual(Example.name, 'example')
        self.assertEqual(Example.version, 1)

        self.assertIsInstance(Example.schema, dict)
        self.assertIsInstance(Example.requests, dict)

        id_field = Example.schema.get('id')
        self.assertIsInstance(id_field, Integer)
        self.assertEqual(id_field.name, 'id')
        self.assertIs(Example.id_field, id_field)

        name_field = Example.schema.get('name')
        self.assertIsInstance(name_field, Text)
        self.assertEqual(name_field.name, 'name')

        request = Example.requests.get('test')
        self.assertIsInstance(request, Request)
        self.assertFalse(request.specific)
        self.assertTrue(request.auto_constructed)
        self.assertEqual(request.endpoint, (GET, 'resource'))
        self.assertIs(request.filter, None)
        self.assertEqual(request.name, 'test')
        self.assertIs(request.resource, Example)

        self.assertIs(Example[1], Example)
        self.assertEqual(repr(Example), 'Resource:Example(name=example, version=1)')
        self.assertEqual(Example.description, 'description')
        self.assertEqual(Example.minimum_version, Example.maximum_version == 1)
        self.assertEqual(Example.versions, {1: Example})
        self.assertEqual(Example.title, 'Example')

    def test_explicit_requests(self):
        class Example(Resource):
            configuration = self.configuration
            name = 'example'
            version = 1
            requests = []

        self.assertEqual(Example.requests, {})

    def test_request_declaration(self):
        class Example(Resource):
            configuration = self.configuration
            name = 'example'
            version = 1

            class operation:
                endpoint = (POST, 'resource/id')
                schema = {'id': Integer()}
                responses = {OK: {'id': Integer()}}

        self.assertIsInstance(Example.requests, dict)
        self.assertEqual(len(Example.requests), 2)

        operation = Example.requests['operation']
        self.assertEqual(operation.name, 'operation')
        self.assertFalse(operation.auto_constructed)
        self.assertEqual(operation.endpoint, (POST, 'resource/id'))
        self.assertIsInstance(operation.schema, Structure)
        self.assertIsInstance(operation.responses[OK], Response)

    def test_resource_inheritance(self):
        class Example(Resource):
            configuration = self.configuration
            name = 'example'
            version = 1

            class schema:
                name = Text()
                something = Text()

        first = Example

        class Example(Example):
            name = 'example'
            version = 2

            class schema:
                added = Text()
                something = None

        self.assertEqual(Example.version, 2)
        self.assertEqual(set(Example.schema.keys()), set(['id', 'name', 'added']))

        self.assertIs(Example[1], first)
        self.assertIs(Example[2], Example)
        self.assertEqual(Example.minimum_version, 1)
        self.assertEqual(Example.maximum_version, 2)

    def test_controller_declaration(self):
        Example = self.example_resource()

        class ExampleController(Controller):
            configuration = self.configuration
            resource = Example
            version = (1, 0)

            def test(self):
                pass

        self.assertEqual(ExampleController.version, (1, 0))
        self.assertIs(ExampleController.resource, Example)

        self.assertEqual(ExampleController.minimum_version, (1, 0))
        self.assertEqual(ExampleController.maximum_version, (1, 0))
        self.assertEqual(len(ExampleController.versions), 1)

        self.assertIsInstance(ExampleController.requests, dict)
        self.assertEqual(ExampleController.requests['test'], ExampleController.test)

    def test_controller_inheritance(self):
        Example = self.example_resource()

        class ExampleController(Controller):
            configuration = self.configuration
            resource = Example
            version = (1, 0)

            def test(self):
                pass

        first = ExampleController

        class ExampleController(ExampleController):
            resource = Example
            version = (1, 1)

            def test(self):
                pass

        self.assertEqual(ExampleController.version, (1, 1))
        self.assertIs(ExampleController.resource, Example)

        self.assertEqual(ExampleController.minimum_version, (1, 0))
        self.assertEqual(ExampleController.maximum_version, (1, 1))
        self.assertEqual(len(ExampleController.versions), 2)
