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

class TestServer(TestCase):
    def test_bundles(self):
        alpha, beta = Bundle('alpha'), Bundle('beta')
        server = Server([alpha, beta])
        self.assertIs(server.bundles['alpha'], alpha)
        self.assertIs(server.bundles['beta'], beta)

        duplicate = Bundle('alpha')
        self.assertRaises(Exception, lambda:Server([alpha, beta, duplicate]))

