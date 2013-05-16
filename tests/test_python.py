from unittest2 import TestCase

from mesh.binding.python import *
from mesh.standard import *
from mesh.transport.internal import *

from fixtures import *

server = InternalServer([primary_bundle])
specification = primary_bundle.specify()
client = InternalClient(server, specification).register()

from mesh.binding.python import Binding

binding = Binding(specification)
Example = binding.generate('primary/1.0/example')

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

    def test_model_extract_dict(self):
        example = Example.create(required_field='text')
        example.text_field = None

        self.assertEqual(
                example.extract_dict(),
                {'id': 1, 'required_field': 'text', 'text_field': None})
        self.assertEqual(
                example.extract_dict(attrs='required_field'),
                {'required_field': 'text'})
        self.assertEqual(
                example.extract_dict(exclude='required_field'),
                {'id': 1, 'text_field': None})
        self.assertEqual(
                example.extract_dict(attrs='required_field', exclude='required_field'),
                {})
        self.assertEqual(
                example.extract_dict(drop_none=True),
                {'id': 1, 'required_field': 'text'})
        self.assertEqual(
                example.extract_dict(other_field='other'),
                {'id': 1, 'required_field': 'text', 'text_field': None, 'other_field': 'other'})
        self.assertEqual(
                example.extract_dict(attrs={'required_field': 'new_field'}), 
                {'new_field': 'text'})
