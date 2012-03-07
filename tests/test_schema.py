from datetime import date, datetime, time, timedelta
from unittest2 import TestCase

from mesh.constants import *
from mesh.exceptions import *
from mesh.schema import *
from mesh.timezone import LOCAL, UTC

def construct_now(delta=None):
    now = datetime.now().replace(microsecond=0, tzinfo=LOCAL)
    if delta is not None:
        now += timedelta(seconds=delta)
    now_text = now.astimezone(UTC).strftime('%Y-%m-%dT%H:%M:%SZ')
    return now, now_text

def construct_today(delta=None):
    today = date.today()
    if delta is not None:
        today += timedelta(days=delta)
    return today, today.strftime('%Y-%m-%d')

def should_fail(callable, *args, **params):
    try:
        callable(*args, **params)
    except Exception, exception:
        return exception
    else:
        assert False, 'exception should be raised'

INVALID_ERROR = ValidationError({'token': 'invalid'})
NULL_ERROR = ValidationError({'token': 'nonnull'})
REQUIRED_ERROR = ValidationError({'token': 'required'})

class FieldTestCase(TestCase):
    def assert_processed(self, field, *tests):
        for test in tests:
            unserialized, serialized = test if isinstance(test, tuple) else (test, test)
            self.assertEqual(field.process(unserialized, INCOMING), unserialized)
            self.assertEqual(field.process(unserialized, OUTGOING), unserialized)
            self.assertEqual(field.process(serialized, INCOMING, True), unserialized)
            self.assertEqual(field.process(unserialized, OUTGOING, True), serialized)

    def assert_not_processed(self, field, expected, *tests):
        if isinstance(expected, basestring):
            expected = ValidationError().append({'token': expected})
        for test in tests:
            if not isinstance(test, tuple):
                test = (test, test)

            error = should_fail(field.process, test[0], INCOMING)
            failed, reason = self.compare_structural_errors(expected, error)
            assert failed, reason

            for value, phase in zip(test, (OUTGOING, INCOMING)):
                error = should_fail(field.process, value, phase, True)
                failed, reason = self.compare_structural_errors(expected, error)
                assert failed, reason

    def compare_structural_errors(self, expected, received):
        if not isinstance(received, type(expected)):
            return False, 'received error not same type as expected error'
        if not self.compare_errors(expected, received):
            return False, 'notstructural errors do not match'
        if not self.compare_structure(expected, received):
            return False, 'structural errors do not match'
        return True, ''

    def compare_errors(self, expected, received):
        if expected.errors:
            if len(received.errors) != len(expected.errors):
                return False
            for expected_error, received_error in zip(expected.errors, received.errors):
                if received_error.get('token') != expected_error['token']:
                    return False
        elif received.errors:
            return False
        return True

    def compare_structure(self, expected, received):
        expected, received = expected.structure, received.structure
        if isinstance(expected, list):
            if not isinstance(received, list):
                return False
            elif len(received) != len(expected):
                return False
            for expected_item, received_item in zip(expected, received):
                if isinstance(expected_item, StructuralError):
                    if not isinstance(received_item, StructuralError):
                        return False
                    elif expected_item.structure is not None:
                        if not self.compare_structure(expected_item, received_item):
                            return False
                    elif expected_item.errors is not None:
                        if not self.compare_errors(expected_item, received_item):
                            return False
                elif received_item != expected_item:
                    return False
        elif isinstance(expected, dict):
            if not isinstance(received, dict):
                return False
            elif len(received) != len(expected):
                return False
            for expected_pair, received_pair in zip(sorted(expected.items()), sorted(received.items())):
                if expected_pair[0] != received_pair[0]:
                    return False
                expected_value, received_value = expected_pair[1], received_pair[1]
                if isinstance(expected_value, StructuralError):
                    if not isinstance(received_value, StructuralError):
                        return False
                    elif expected_value.structure is not None:
                        if not self.compare_structure(expected_value, received_value):
                            return False
                    elif expected_value.errors is not None:
                        if not self.compare_errors(expected_value, received_value):
                            return False
                elif received_value != expected_value:
                    return False
        elif received:
            return False
        return True

class TestField(FieldTestCase):
    def test_nulls(self):
        field = Field()
        for phase in (INCOMING, OUTGOING):
            self.assert_processed(field, phase)

        field = Field(nonnull=True)
        self.assert_not_processed(field, 'nonnull', None)

    def test_filtering(self):
        field = Field()
        self.assertIs(field.filter(), field)
        self.assertIs(field.filter(exclusive=True), None)
        self.assertIs(field.filter(readonly=True), field)
        self.assertIs(field.filter(readonly=False), field)
        self.assertIs(field.filter(exclusive=True, readonly=True), None)
        self.assertIs(field.filter(exclusive=True, readonly=False), field)

        field = Field(readonly=True)
        self.assertIs(field.filter(), field)
        self.assertIs(field.filter(exclusive=True), None)
        self.assertIs(field.filter(readonly=True), field)
        self.assertIs(field.filter(readonly=False), None)
        self.assertIs(field.filter(exclusive=True, readonly=True), field)
        self.assertIs(field.filter(exclusive=True, readonly=False), None)

    def test_defaults(self):
        field = Field(default=True)
        assert field.get_default() is True

        field = Field(default=datetime.now)
        assert isinstance(field.get_default(), datetime)

class TestBoolean(FieldTestCase):
    def test_processing(self):
        field = Boolean()
        self.assert_processed(field, None, True, False)
        self.assert_not_processed(field, 'invalid', '')

class TestConstant(FieldTestCase):
    def test_specification(self):
        with self.assertRaises(SpecificationError):
            Constant(datetime.now())

    def test_processing(self):
        field = Constant('constant')
        self.assert_processed(field, None, 'constant')
        self.assert_not_processed(field, 'invalid', '')

class TestDate(FieldTestCase):
    def test_processing(self):
        field = Date()
        self.assert_processed(field, None, construct_today())
        self.assert_not_processed(field, 'invalid', ('', ''))

    def test_minimum(self):
        today, today_text = construct_today()
        for field in (Date(minimum=today), Date(minimum=date.today)):
            self.assert_processed(field, (today, today_text), construct_today(+1))
            self.assert_not_processed(field, 'minimum', construct_today(-1))

    def test_maximum(self):
        today, today_text = construct_today()
        for field in (Date(maximum=today), Date(maximum=date.today)):
            self.assert_processed(field, (today, today_text), construct_today(-1))
            self.assert_not_processed(field, 'maximum', construct_today(+1))

class TestDateTime(FieldTestCase):
    def test_processing(self):
        field = DateTime()
        self.assert_not_processed(field, 'invalid', True)
        self.assert_processed(field, None)

        now = datetime.now().replace(microsecond=0)
        now_local = now.replace(tzinfo=LOCAL)
        now_utc = now_local.astimezone(UTC)
        now_text = now_utc.strftime('%Y-%m-%dT%H:%M:%SZ')

        self.assertEqual(field.process(now_text, INCOMING, True), now_local)
        self.assertEqual(field.process(now, OUTGOING, True), now_text)
        self.assertEqual(field.process(now_local, OUTGOING, True), now_text)
        self.assertEqual(field.process(now_utc, OUTGOING, True), now_text)

    def test_minimum(self):
        now, now_text = construct_now()
        for field in (DateTime(minimum=now), DateTime(minimum=lambda: construct_now()[0])):
            self.assert_processed(field, (now, now_text), construct_now(+1))
            self.assert_not_processed(field, 'minimum', construct_now(-1))

    def test_maximum(self):
        now, now_text = construct_now()
        for field in (DateTime(maximum=now), DateTime(maximum=lambda: construct_now()[0])):
            self.assert_processed(field, (now, now_text), construct_now(-1))
            self.assert_not_processed(field, 'maximum', construct_now(+1))

class TestEnumeration(FieldTestCase):
    def test_specification(self):
        with self.assertRaises(SpecificationError):
            Enumeration([datetime.now()])
        with self.assertRaises(SpecificationError):
            Enumeration(True)

    def test_processing(self):
        values = ['alpha', 1, True]
        field = Enumeration(values)

        self.assert_processed(field, None, *values)
        self.assert_not_processed(field, 'invalid', 'beta', 2, False)

class TestFloat(FieldTestCase):
    def test_specification(self):
        with self.assertRaises(SpecificationError):
            Float(minimum=True)
        with self.assertRaises(SpecificationError):
            Float(maximum=True)

    def test_processing(self):
        field = Float()
        self.assert_processed(field, None, -1.0, -0.1, 0.0, 0.1, 1.0)
        self.assert_not_processed(field, 'invalid', '')

    def test_minimum(self):
        field = Float(minimum=0.0)
        self.assert_processed(field, 0.0, 0.1, 1.0)
        self.assert_not_processed(field, 'minimum', -1.0, -0.1)

    def test_maximum(self):
        field = Float(maximum=0.0)
        self.assert_processed(field, -1.0, -0.1, 0.0)
        self.assert_not_processed(field, 'maximum', 0.1, 1.0)

    def test_minimum_maximum(self):
        field = Float(minimum=-1.0, maximum=1.0)
        self.assert_processed(field, -1.0, -0.5, 0.0, 0.5, 1.0)
        self.assert_not_processed(field, 'minimum', -2.0, -1.1)
        self.assert_not_processed(field, 'maximum', 1.1, 2.0)

class TestInteger(FieldTestCase):
    def test_specification(self):
        with self.assertRaises(SpecificationError):
            Integer(minimum='bad')
        with self.assertRaises(SpecificationError):
            Integer(maximum='bad')

    def test_processing(self):
        field = Integer()
        self.assert_processed(field, None, -1, 0, 1)
        self.assert_not_processed(field, 'invalid', '')

    def test_minimum(self):
        field = Integer(minimum=0)
        self.assert_processed(field, 0, 1)
        self.assert_not_processed(field, 'minimum', -1)

    def test_maximum(self):
        field = Integer(maximum=0)
        self.assert_processed(field, -1, 0)
        self.assert_not_processed(field, 'maximum', 1)

    def test_minimum_maximum(self):
        field = Integer(minimum=-2, maximum=2)
        self.assert_processed(field, -2, -1, 0, 1, 2)
        self.assert_not_processed(field, 'minimum', -4, -3)
        self.assert_not_processed(field, 'maximum', 4, 5)

class TestMap(FieldTestCase):
    def test_specification(self):
        with self.assertRaises(SpecificationError):
            Map(True)

    def test_processing(self):
        field = Map(Integer())

        self.assert_processed(field, None)
        for valid in [{}, {'a': 1}, {'a': 1, 'b': 2}, {'a': None}]:
            self.assert_processed(field, (valid, valid))

        expected_error = ValidationError(structure={'a': INVALID_ERROR, 'b': 2})
        self.assert_not_processed(field, expected_error, {'a': '', 'b': 2})

    def test_null_values(self):
        field = Map(Integer(nonnull=True))
        self.assert_processed(field, {}, {'a': 1})

        expected_error = ValidationError(structure={'a': NULL_ERROR, 'b': 2})
        self.assert_not_processed(field, expected_error, {'a': None, 'b': 2})

    def test_required_keys(self):
        field = Map(Integer(), required_keys=('a',))
        self.assert_processed(field, {'a': 1})

        expected_error = ValidationError(structure={'a': REQUIRED_ERROR})
        self.assert_not_processed(field, expected_error, {})

    def test_extraction(self):
        field = Map(Integer())
        value = {'a': 1, 'b': 2}

        extracted = field.extract(value)
        self.assertIsNot(value, extracted)
        self.assertEqual(value, extracted)

        field = Map(Map(Integer()))
        value = {'a': {'a': 1}, 'b': {'b': 2}}

        extracted = field.extract(value)
        self.assertIsNot(value, extracted)
        self.assertIsNot(value['a'], extracted['a'])
        self.assertEqual(value, extracted)

class TestSequence(FieldTestCase):
    def generate_sequences(self):
        today, today_text = construct_today()
        yesterday, yesterday_text = construct_today(-1)
        tomorrow, tomorrow_text = construct_today(+1)
        return ([yesterday, today, tomorrow],
            [yesterday_text, today_text, tomorrow_text])

    def test_specification(self):
        with self.assertRaises(SpecificationError):
            Sequence(True)
        with self.assertRaises(SpecificationError):
            Sequence(Integer(), min_length='bad')
        with self.assertRaises(SpecificationError):
            Sequence(Integer(), max_length='bad')

    def test_processing(self):
        field = Sequence(Date())
        self.assert_processed(field, None, self.generate_sequences())
        self.assert_not_processed(field, 'invalid', True)

        field = Sequence(Integer())
        self.assert_processed(field, [1, 2, 3], [1, None, 3])
        
        expected_error = ValidationError(structure=[1, INVALID_ERROR, 3])
        self.assert_not_processed(field, expected_error, [1, '', 3])

    def test_null_values(self):
        field = Sequence(Integer(nonnull=True))
        self.assert_processed(field, [], [1, 2, 3])
        
        expected_error = ValidationError(structure=[1, NULL_ERROR, 3])
        self.assert_not_processed(field, expected_error, [1, None, 3])

    def test_min_length(self):
        field = Sequence(Date(), min_length=2)
        a, b = self.generate_sequences()

        self.assert_processed(field, (a, b), (a[:2], b[:2]))
        self.assert_not_processed(field, 'min_length', (a[:1], b[:1]))

    def test_max_length(self):
        field = Sequence(Date(), max_length=2)
        a, b = self.generate_sequences()

        self.assert_processed(field, (a[:1], b[:1]), (a[:2], b[:2]))
        self.assert_not_processed(field, 'max_length', (a, b))
    
    def test_extraction(self):
        field = Sequence(Integer())
        value = [1, 2, 3]

        extracted = field.extract(value)
        self.assertIsNot(value, extracted)
        self.assertEqual(value, extracted)

        field = Sequence(Sequence(Integer()))
        value = [[1], [2], [3]]

        extracted = field.extract(value)
        self.assertIsNot(value, extracted)
        self.assertEqual(value, extracted)
        for i in (0, 1, 2):
            self.assertIsNot(value[i], extracted[i])

class TestStructure(FieldTestCase):
    def test_specification(self):
        with self.assertRaises(SpecificationError):
            Structure(True)
        with self.assertRaises(SpecificationError):
            Structure({'a': True})

    def test_processing(self):
        field = Structure({})
        self.assert_processed(field, None, {})
        self.assert_not_processed(field, 'invalid', True)

        field = Structure({'a': Integer(), 'b': Text(), 'c': Boolean()})
        self.assert_processed(field, None, {}, {'a': None}, {'a': 1}, {'a': 1, 'b': None}, 
            {'a': 1, 'b': 'b', 'c': True})

        expected_error = ValidationError(structure={'a': INVALID_ERROR, 'b': 'b', 'c': True})
        self.assert_not_processed(field, expected_error, {'a': '', 'b': 'b', 'c': True})

    def test_required_values(self):
        field = Structure({'a': Integer(required=True), 'b': Text()})
        self.assert_processed(field, {'a': 1}, {'a': 1, 'b': 'b'}, {'a': None})

        expected_error = ValidationError(structure={'a': REQUIRED_ERROR, 'b': 'b'})
        self.assert_not_processed(field, expected_error, {'b': 'b'})

    def test_unknown_values(self):
        field = Structure({'a': Integer()})
        self.assert_processed(field, {}, {'a': 1})

        expected_error = ValidationError(structure={'a': 1, 'z': ValidationError({'token': 'unknown'})})
        self.assert_not_processed(field, expected_error, {'a': 1, 'z': True})

    def test_default_values(self):
        field = Structure({'a': Integer(default=2)})
        self.assertEqual(field.process({'a': 1}, INCOMING), {'a': 1})
        self.assertEqual(field.process({}, INCOMING), {'a': 2})
        self.assertEqual(field.process({'a': 1}, OUTGOING), {'a': 1})
        self.assertEqual(field.process({}, OUTGOING), {})

    def test_extraction(self):
        field = Structure({'a': Integer()})
        value = {'a': 1}

        extracted = field.extract(value)
        self.assertIsNot(value, extracted)
        self.assertEqual(value, extracted)

        extracted = field.extract({'a': 1, 'b': 2})
        self.assertEqual(value, extracted)

        extracted = field.extract({})
        self.assertEqual(extracted, {})

        field = Structure({'a': Structure({'a': Integer()})})
        value = {'a': {'a': 1}}

        extracted = field.extract(value)
        self.assertIsNot(value, extracted)
        self.assertIsNot(value['a'], extracted['a'])
        self.assertEqual(value, extracted)

class TestText(FieldTestCase):
    def test_specification(self):
        with self.assertRaises(SpecificationError):
            Text(min_length='bad')
        with self.assertRaises(SpecificationError):
            Text(max_length='bad')

    def test_processing(self):
        field = Text()
        self.assert_processed(field, None, '', 'testing')
        self.assert_not_processed(field, 4)

    def test_pattern(self):
        field = Text(pattern=r'^[abc]*$')
        self.assert_processed(field, '', 'a', 'ab', 'bc', 'abc', 'aabbcc')
        self.assert_not_processed(field, 'pattern', 'q', 'aq')

    def test_min_length(self):
        field = Text(min_length=2)
        self.assert_processed(field, 'aa', 'aaa')
        self.assert_not_processed(field, 'min_length', '', 'a')

    def test_max_length(self):
        field = Text(max_length=2)
        self.assert_processed(field, '', 'a', 'aa')
        self.assert_not_processed(field, 'max_length', 'aaa')

class TestTime(FieldTestCase):
    def construct(self, delta=None):
        now = datetime.now().time().replace(second=30, microsecond=0)
        if delta is not None:
            now = now.replace(second=(30 + delta))
        return now, now.strftime('%H:%M:%S')

    def test_processing(self):
        field = Time()
        self.assert_processed(field, None, self.construct())
        self.assert_not_processed(field, 'invalid', '')

    def test_minimum(self):
        now, now_text = self.construct()
        for field in (Time(minimum=now), Time(minimum=lambda: self.construct()[0])):
            self.assert_processed(field, (now, now_text), self.construct(+1))
            self.assert_not_processed(field, 'minimum', self.construct(-1))

    def test_maximum(self):
        now, now_text = self.construct()
        for field in (Time(maximum=now), Time(maximum=lambda: self.construct()[0])):
            self.assert_processed(field, (now, now_text), self.construct(-1))
            self.assert_not_processed(field, 'maximum', self.construct(+1))

class TestTuple(FieldTestCase):
    def test_specification(self):
        with self.assertRaises(SpecificationError):
            Tuple(True)

    def test_processing(self):
        field = Tuple((Text(), Boolean(), Integer()))
        self.assert_not_processed(field, 'invalid', True)

        self.assert_processed(field, None)
        for valid in [('test', True, 1), ('test', None, 1)]:
            self.assert_processed(field, (valid, valid))

        self.assert_not_processed(field, 'length', ((), ()))

        expected_error = ValidationError(structure=['test', INVALID_ERROR, 1])
        self.assert_not_processed(field, expected_error, (('test', 'a', 1), ('test', 'a', 1)))

    def test_null_values(self):
        field = Tuple((Text(nonnull=True), Integer()))
        for valid in [('test', 1), ('test', None)]:
            self.assert_processed(field, (valid, valid))

        expected_error = ValidationError(structure=[NULL_ERROR, None])
        self.assert_not_processed(field, expected_error, ((None, None), (None, None)))

    def test_extraction(self):
        field = Tuple((Integer(), Text()))
        value = (1, '1')

        extracted = field.extract(value)
        self.assertIsNot(value, extracted)
        self.assertEqual(value, extracted)

        field = Tuple((Tuple((Integer(),)), Text()))
        value = ((1,), '1')

        extracted = field.extract(value)
        self.assertIsNot(value, extracted)
        self.assertIsNot(value[0], extracted[0])
        self.assertEqual(value, extracted)

class TestUnion(FieldTestCase):
    def test_specification(self):
        with self.assertRaises(SpecificationError):
            Union(True)
        with self.assertRaises(SpecificationError):
            Union((Date(), True))

    def test_processing(self):
        field = Union((Text(), Integer()))
        self.assert_processed(field, None, 'testing', 1)
        self.assert_not_processed(field, 'invalid', True, {}, [])

        field = Union((Map(Integer()), Text()))
        self.assert_processed(field, None, {'a': 1}, 'testing')
        self.assert_not_processed(field, 'invalid', 1, True, [])
