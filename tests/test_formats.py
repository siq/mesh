from unittest2 import TestCase
from urllib import unquote

from mesh.formats import *

class FormatTestCase(TestCase):
    def assert_correct(self, pairs):
        for unserialized, serialized in pairs:
            self.assertEqual(unquote(UrlEncoded.serialize(unserialized)), serialized)
            self.assertEqual(UrlEncoded.unserialize(serialized), unserialized)

class TestUrlEncoded(FormatTestCase):
    def test_nulls(self):
        for value in (None, ''):
            self.assertIs(UrlEncoded.serialize(value), None)
            self.assertIs(UrlEncoded.unserialize(value), None)

    def test_invalid_data(self):
        with self.assertRaises(ValueError):
            UrlEncoded.serialize(True)
        with self.assertRaises(ValueError):
            UrlEncoded.unserialize(True)

    def test_booleans(self):
        self.assert_correct([
            ({'a': True}, 'a=true'),
            ({'a': False}, 'a=false'),
        ])

    def test_mappings(self):
        self.assert_correct([
            ({'a': {}}, 'a={}'),
            ({'a': {'b': '1'}}, 'a={b:1}'),
            ({'a': {'b': '1', 'c': '2'}}, 'a={b:1,c:2}'),
            ({'a': {'b': True}}, 'a={b:true}'),
        ])

    def test_sequences(self):
        self.assert_correct([
            ({'a': []}, 'a=[]'),
            ({'a': ['1']}, 'a=[1]'),
            ({'a': ['1', '2']}, 'a=[1,2]'),
            ({'a': [True]}, 'a=[true]'),
        ])

    def test_nested_structures(self):
        self.assert_correct([
            ({'a': {'b': {}}}, 'a={b:{}}'),
            ({'a': ['1', '2', ['3', []]]}, 'a=[1,2,[3,[]]]'),
            ({'a': [True, {'b': [False, '1']}]}, 'a=[true,{b:[false,1]}]'),
        ])
