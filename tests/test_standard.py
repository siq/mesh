from datetime import date, time
from unittest2 import TestCase

from mesh.standard import *
from mesh.transport.internal import *

from fixtures import *

server = InternalServer([primary_bundle])

def endpoint(request):
    return ('primary', (1, 0), 'example', request)

class TestStandardResources(TestCase):
    def setUp(self):
        storage.reset()

    def test_resource_declaration(self):
        request = Example.requests['create']
        self.assertIs(request.validators[0], Example.validators['validate_float_field'])

    def test_resource_creation(self):
        response = server.dispatch(endpoint('create'), {}, None, {})
        self.assertEqual(response.status, INVALID)

        response = server.dispatch(endpoint('create'), {}, None, {'required_field': 'text', 'readonly_field': 2})
        self.assertEqual(response.status, INVALID)

        response = server.dispatch(endpoint('create'), {}, None, {'required_field': 'text'})
        self.assertEqual(response.status, OK)

        resource = storage.get(response.content['id'])
        self.assertIsInstance(resource, dict)
        self.assertEqual(resource['required_field'], 'text')

    def test_resource_update(self):
        response = server.dispatch(endpoint('create'), {}, None, {'required_field': 'text', 'integer_field': 2})
        id = response.content['id']

        resource = storage.get(id)
        self.assertEqual(resource['required_field'], 'text')
        self.assertEqual(resource['integer_field'], 2)

        today = date.today()
        response = server.dispatch(endpoint('update'), {}, id, {'integer_field': 3, 'date_field': today})
        self.assertEqual(response.status, OK)
        self.assertIsInstance(response.content, dict)
        self.assertEqual(response.content.get('id'), id)

        resource = storage.get(id)
        self.assertEqual(resource['required_field'], 'text')
        self.assertEqual(resource['integer_field'], 3)
        self.assertEqual(resource['date_field'], today)

    def test_resource_delete(self):
        response = server.dispatch(endpoint('create'), {}, None, {'required_field': 'text'})
        id = response.content['id']

        resource = storage.get(id)
        self.assertEqual(resource['required_field'], 'text')
        self.assertEqual(resource['default_field'], 1)

        response = server.dispatch(endpoint('delete'), {}, id, None)
        self.assertEqual(response.status, OK)
        self.assertIsInstance(response.content, dict)
        self.assertEqual(response.content.get('id'), id)

        resource = storage.get(id)
        self.assertIs(resource, None)

    def test_resource_get(self):
        today = date.today()
        response = server.dispatch(endpoint('create'), {}, None, {'required_field': 'text', 'deferred_field': 'deferred'})
        id = response.content['id']

        response = server.dispatch(endpoint('get'), {}, id, None)
        self.assertEqual(response.status, OK)
        self.assertEqual(response.content, {'id': id, 'required_field': 'text', 'default_field': 1})

        response = server.dispatch(endpoint('get'), {}, id, {'include': ['deferred_field']})
        self.assertEqual(response.status, OK)
        self.assertEqual(response.content, {'id': id, 'required_field': 'text',
            'default_field': 1, 'deferred_field': 'deferred'})

        response = server.dispatch(endpoint('get'), {}, id, {'exclude': ['default_field']})
        self.assertEqual(response.status, OK)
        self.assertEqual(response.content, {'id': id, 'required_field': 'text'})
