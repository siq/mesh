import os
import sys
import time
from threading import Thread
from unittest2 import TestCase
from wsgiref.simple_server import make_server

try:
    import json
except ImportError:
    import simplejson as json

from mesh.standard import *
from mesh.transport.http import *
from fixtures import *

server = HttpServer([primary_bundle, secondary_bundle])
wsgi_server = WsgiServer([primary_bundle, secondary_bundle])

def http(method, data=None, resource='example', mimetype=None, **params):
    path = params.pop('path', None)
    if not path:
        bundle = params.pop('bundle', 'primary')
        version = params.pop('version', (1, 0))
        path = '/%s/%d.%d/%s' % (bundle, version[0], version[1], resource)

    if mimetype is None:
        if method == GET:
            mimetype = URLENCODED
        elif data:
            mimetype = JSON
    return server.dispatch(method, path, mimetype, params, data)

class TestHttpServer(TestCase):
    def setUp(self):
        storage.reset()

    def test_not_found(self):
        for attempt in ('/primary/1.0/wrong', '/primary/10.0/example', '/wrong/1.0/example'):
            response = http(GET, path=attempt)
            self.assertEqual(response.status, NOT_FOUND)

    def test_json_request(self):
        data = {'required_field': 'text'}
        response = http(POST, json.dumps(data))
        self.assertEqual(response.status, OK)
        
        content = json.loads(response.content)
        self.assertIsInstance(content, dict)
        self.assertIn('id', content)
        self.assertIsInstance(content['id'], int)

    def test_standard_requests(self):
        response = http(POST, json.dumps({}))
        self.assertEqual(response.status, INVALID)

        response = http(POST, json.dumps({'required_field': 'text'}))
        self.assertEqual(response.status, OK)

        content = json.loads(response.content)
        self.assertIsInstance(content, dict)
        self.assertIn('id', content)

        id = content['id']
        self.assertIsInstance(id, int)

        response = http(GET, resource='example/%d' % id)
        self.assertEqual(response.status, OK)
        self.assertEqual(json.loads(response.content), {'id': id, 'required_field': 'text', 'default_field': 1})

        response = http(POST, json.dumps({'default_field': 3}), resource='example/%d' % id)
        self.assertEqual(response.status, OK)
        self.assertEqual(json.loads(response.content), {'id': id})

        response = http(GET, 'exclude=[required_field]', resource='example/%d' % id)
        self.assertEqual(response.status, OK)
        self.assertEqual(json.loads(response.content), {'id': id, 'default_field': 3})
        
        response = http(DELETE, resource='example/%d' % id)
        self.assertEqual(response.status, OK)
        self.assertEqual(json.loads(response.content), {'id': id})

        response = http(GET, resource='example/%d' % id)
        self.assertEqual(response.status, GONE)

class _TestHttpClient(TestCase):
    @classmethod
    def setUpClass(cls):
        r, w = os.pipe()
        pid = os.fork()
        if pid:
            cls.shutdown_pipe = w
            time.sleep(2)
        else:
            server = make_server('localhost', 8888, wsgi_server)
            thread = Thread(target=server.serve_forever)
            thread.start()
            os.read(r, 1)
            server.shutdown()
            thread.join()
            os._exit(0)

    @classmethod
    def tearDownClass(cls):
        os.write(cls.shutdown_pipe, '0')

    def setUp(self):
        storage.reset()

    def test_standard_requests(self):
        client = HttpClient('localhost:8888', primary_bundle.specify((1, 0)))
        
        #response = client.execute('example', 'create', data={})


        response = client.execute('example', 'create', data={'required_field': 'text'})
        print response
