try:
    import json
except ImportError:
    import simplejson as json

from unittest2 import TestCase

from mesh.bundle import *
from mesh.constants import *
from mesh.exceptions import *
from mesh.transport.internal import *

from fixtures import *

server = InternalServer([primary_bundle, secondary_bundle])

def endpoint(request, resource='example', version=(1, 0), bundle='primary'):
    return (bundle, version, resource, request)

class TestInternalServer(TestCase):
    def setUp(self):
        storage.reset()

    def test_not_found(self):
        for attempt in (endpoint('wrong'), endpoint('create', 'wrong'), endpoint('create', 'example', (10, 0)),
                endpoint('create', 'example', (1, 0), 'wrong')):
            response = server.dispatch(attempt, {}, None, {})
            self.assertEqual(response.status, NOT_FOUND)

    def test_bad_request(self):
        response = server.dispatch(endpoint('create'), {}, None, '!!!', 'json')
        self.assertEqual(response.status, BAD_REQUEST)

    def test_unserialized_request(self):
        response = server.dispatch(endpoint('create'), {}, None, {'required_field': 'text'})
        self.assertEqual(response.status, OK)
        self.assertIsInstance(response.content, dict)
        self.assertIn('id', response.content)
        self.assertIsInstance(response.content['id'], int)

    def test_json_request(self):
        data = {'required_field': 'text'}
        response = server.dispatch(endpoint('create'), {}, None, json.dumps(data), 'json')
        self.assertEqual(response.status, OK)

        content = json.loads(response.content)
        self.assertIsInstance(content, dict)
        self.assertIn('id', content)
        self.assertIsInstance(content['id'], int)

class TestInternalClient(TestCase):
    def setUp(self):
        storage.reset()

    def test_client_requests(self):
        specification = Specification(primary_bundle.describe(version=(1,0)))
        client = InternalClient(server, specification)

        response = client.execute('example', 'create', None, {'required_field': 'text'})
        self.assertEqual(response.status, OK)

    def test_invalid_requests(self):
        specification = Specification(primary_bundle.describe(version=(1,0)))
        client = InternalClient(server, specification)

        self.assertRaises(InvalidError, lambda:client.execute('example', 'create', None, set()))
        self.assertRaises(GoneError, lambda:client.execute('example', 'get', 2, None))

