from unittest2 import TestCase

from mesh.interface.python import *
from mesh.standard import *
from mesh.transport.internal import *

from fixtures import *

server = InternalServer([primary_bundle])
specification = primary_bundle.specify((1, 0))
client = InternalClient(server, specification)

class Example(Model):
    __resource__ = (specification, 'example')

class TestPythonInterface(TestCase):
    def setUp(self):
        storage.reset()

    def test_model_create(self):
        example = Example.create(required_field='text')
        self.assertTrue(example.id)
        self.assertEqual(example.required_field, 'text')

    def test_model_get(self):
        self.assertRaises(GoneError, lambda: Example.get(0))
        
        id = Example.create(required_field='text', integer_field=2).id

        example = Example.get(id)
        self.assertEqual(example.required_field, 'text')
        self.assertEqual(example.integer_field, 2)

        example = Example.get(id, exclude=['integer_field'])
        self.assertEqual(example.required_field, 'text')
        self.assertIs(example.integer_field, None)

    def test_model_update(self):
        example = Example.create(required_field='text')
        self.assertEqual(example.required_field, 'text')

        example.required_field = 'changed'
        example.save()
        self.assertEqual(example.required_field, 'changed')
        
        example.update({'required_field': 'again'})
        self.assertEqual(example.required_field, 'again')

    def test_model_destroy(self):
        example = Example.create(required_field='text')
        self.assertTrue(example.id)
        self.assertTrue(Example.get(example.id))

        example.destroy()
        self.assertRaises(GoneError, lambda: Example.get(example.id))
        
