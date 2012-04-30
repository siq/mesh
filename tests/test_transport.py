try:
    import json
except ImportError:
    import simplejson as json

from unittest2 import TestCase

from mesh.bundle import *
from mesh.constants import *
from mesh.exceptions import *
from mesh.transport.base import *

from fixtures import *

class TestServerResponse(TestCase):
    def test(self):
        response = ServerResponse()()
        self.assertIs(response.status, None)
        self.assertIs(response.content, None)

        response = ServerResponse()(OK)
        self.assertEqual(response.status, OK)
        self.assertIs(response.content, None)

        response = ServerResponse()(OK, 'content')
        self.assertEqual(response.status, OK)
        self.assertEqual(response.content, 'content')

        response = ServerResponse()('content')
        self.assertIs(response.status, None)
        self.assertEqual(response.content, 'content')

class TestClient(TestCase):
    def test_global_clients(self):
        specification = Specification({'name': 'test', 'version': (1, 0), 'resources': {}})
        self.assertIs(Client.get_client(specification), None)

        client = Client(specification).register()
        self.assertIs(Client.get_client(specification), client)

        client.unregister()
        self.assertIs(Client.get_client(specification), None)
