import re
from copy import deepcopy
from datetime import datetime, date, time
from time import mktime, strptime

from mesh.constants import *
from mesh.exceptions import *
from mesh.timezone import LOCAL, UTC
from mesh.util import construct_all_list, minimize_string, pluralize

NATIVELY_SERIALIZABLE = (basestring, bool, float, int, long, type(None))
PATTERN_TYPE = type(re.compile(''))

class InvalidTypeError(ValidationError):
    """A validation error indicating the value being processed is invalid due
    to its type."""

class FieldMeta(type):
    def __new__(metatype, name, bases, namespace):
        declared_errors = namespace.pop('errors', {})
        declared_parameters = namespace.pop('parameters', ())

        field = type.__new__(metatype, name, bases, namespace)
        field.type = name.lower()

        errors = {}
        parameters = set()

        for base in reversed(bases):
            inherited_errors = getattr(base, 'errors', None)
            if inherited_errors:
                errors.update(inherited_errors)
            inherited_parameters = getattr(base, 'parameters', None)
            if inherited_parameters:
                parameters.update(inherited_parameters)

        errors.update(declared_errors)
        field.errors = errors

        parameters.update(declared_parameters)
        field.parameters = parameters

        field.types[field.type] = field
        return field

    def reconstruct(field, specification):
        """Reconstructs the field described by ``specification``."""

        if specification is not None:
            return field.types[specification['type']].construct(specification)

class Field(object):
    """A resource field.

    :param string name: The name of this field.

    :param string description: Optional, a concise description of this field,
        used prominently in documentation.

    :param default: Optional, default is ``None``; if specified, indicates
        the default value for this field when no value is present in a
        request to the associated resource. Only applicable when this field
        is part of a ``Structure``.

    :param boolean nonnull: Optional, default is ``False``; if ``True``, indicates
        this field must have a value other than ``None`` when present in a
        request to the associated resource.

    :param boolean required: Optional, default is ``False``; if ``True``, indicates
        this field is required to be present in a request to the associated
        resource. Only applicable when this field is part of a ``Structure``.

    :param boolean readonly: Optional, default is ``False``; if ``True``, indicates
        this field should only be present in responses for this resource and
        should not specified in a request.

    :param boolean deferred: Optional, default is ``False``; if ``True``, indicates
        this field should only be included in responses for this response when
        explicitly requested.

    :param boolean sortable: Optional, default is ``False``; if ``True``, indicates
        this field can be sorted on in queries to this resource.

    :param list operators: Optional, default is ``None``; specifies the filter
        operators supported by this field in queries to this resource. Can be
        specified as either a list of strings or a space-delimited string.

    :param dict errors: Optional, default is ``None``; specifies custom error
        strings for this field.

    :param string notes: Optional, notes of any length concerning the use of
        this field, used primarily for documentation.
    """

    __metaclass__ = FieldMeta
    types = {}

    errors = {
        'invalid': '%(field)s has an invalid value',
        'nonnull': '%(field)s must be a non-null value',
    }
    parameters = ('name', 'description', 'default', 'nonnull', 'required',
        'readonly', 'deferred', 'sortable', 'operators', 'notes', 'structural')
    structural = False
    
    def __init__(self, name=None, description=None, default=None, nonnull=False, required=False,
        readonly=False, deferred=False, sortable=False, operators=None, errors=None,
        notes=None, type=None, is_identifier=False, **params):

        if isinstance(operators, basestring):
            operators = operators.split(' ')

        self.__dict__.update(params)
        self.default = default
        self.deferred = deferred
        self.description = (minimize_string(description) if description else None)
        self.instance_errors = errors or {}
        self.is_identifier = is_identifier
        self.name = name
        self.notes = notes
        self.nonnull = nonnull
        self.operators = operators or []
        self.readonly = readonly
        self.required = required
        self.sortable = sortable

    def __repr__(self):
        return '%s(%r)' % (type(self).__name__, self.name)

    def __deepcopy__(self, memo):
        return self.clone()

    def clone(self, **params):
        """Clones this field by deep copying it. Keyword parameters are applied to the cloned
        field before returning it."""

        for key, value in self.__dict__.iteritems():
            if key not in params:
                if not isinstance(value, PATTERN_TYPE):
                    value = deepcopy(value)
                params[key] = value

        return type(self)(**params)

    @classmethod
    def construct(cls, specification):
        """Constructs an instance of this field using ``specification``, which should be a
        dictionary of field parameters."""

        return cls(**specification)

    def describe(self, **params):
        """Constructs a serializable description of this field as a dictionary, which will
        contain enough information to reconstruct this field in another context. Any keyword
        parameters are mixed into the description."""

        description = {'type': self.type}
        for parameter in self.parameters:
            value = getattr(self, parameter, None)
            description[parameter] = value

        description.update(params)
        return description

    def extract(self, subject):
        raise NotImplementedError()

    def filter(self, exclusive=False, **params):
        """Filters this field based on the tests given in ``params``."""

        included = (not exclusive)
        for attr, value in params.iteritems():
            if value is True:
                if getattr(self, attr, False):
                    included = True
            elif value is False:
                if getattr(self, attr, False):
                    included = False
                    break
                else:
                    included = True
        if included:
            return self

    def get_default(self):
        """Returns the default value for this field."""

        default = self.default
        if callable(default):
            default = default()
        return default

    def get_error(self, error):
        return self.instance_errors.get(error) or self.errors.get(error)

    def process(self, value, phase, serialized=False):
        """Processes ``value`` for this field.

        :param value: The value to process.

        :param string phase: The phase for this particular processing; either ``incoming``,
            to indicate the value is coming into the framework, or ``outgoing``, to indicate
            the value is leaving the framework.

        :param boolean serialized: Optional, defaults to ``False``; if ``True``, indicates
            ``value`` should either be unserialized before validation, if ``phase`` is
            ``incoming``, or serialized after validation, if ``phase`` is ``outgoing``.
        """

        if self._is_null(value):
            return None

        if serialized and phase == INCOMING:
            value = self._unserialize_value(value)

        candidate = self._validate_value(value)
        if candidate is not None:
            value = candidate

        if serialized and phase == OUTGOING:
            value = self._serialize_value(value)
        return value

    def _is_null(self, value):
        if value is None:
            if self.nonnull:
                raise ValidationError().construct(self, 'nonnull')
            else:
                return True

    def _serialize_value(self, value):
        """Serializes and returns ``value``, if necessary."""

        return value

    def _unserialize_value(self, value):
        return value

    def _validate_value(self, value):
        """Validates ``value`` according to the parameters of this field."""

        return value

class Boolean(Field):
    """A resource field for ``boolean`` values."""

    errors = {'invalid': '%(field)s must be a boolean value'}

    def _validate_value(self, value):
        if not isinstance(value, bool):
            raise InvalidTypeError(value=value).construct(self, 'invalid')

class Constant(Field):
    """A resource field for constant values.

    :param value: The constant value for this field; must be a natively serializable
        value (i.e., a ``bool``, ``float``, ``integer``, or ``string``).
    """

    errors = {'invalid': '%(field)s must be %(constant)r'}
    parameters = ('value',)

    def __init__(self, value, **params):
        super(Constant, self).__init__(**params)
        if isinstance(value, NATIVELY_SERIALIZABLE):
            self.value = value
        else:
            raise SpecificationError('Constant.value must be natively serializable')

    def _validate_value(self, value):
        if value != self.value:
            raise InvalidTypeError(value=value).construct(self, 'invalid', constant=self.value)

class Date(Field):
    """A resource field for ``date`` values.

    :param minimum: Optional, default is ``None``; the earliest valid value for this field, as
        either a ``date`` or a callable which returns a ``date``.
    :param maximum: Optional, default is ``None``; the latest valid value for this field, as
        either a ``date`` or a callable which returns a ``date``.
    """

    parameters = ('maximum', 'minimum')
    pattern = '%Y-%m-%d'

    errors = {
        'invalid': '%(field)s must be a date value',
        'minimum': '%(field)s must not occur before %(minimum)s',
        'maximum': '%(field)s must not occur after %(maximum)s',
    }

    def __init__(self, minimum=None, maximum=None, **params):
        super(Date, self).__init__(**params)
        self.maximum = maximum
        self.minimum = minimum

    def _serialize_value(self, value):
        return value.strftime(self.pattern)

    def _unserialize_value(self, value):
        try:
            return date(*strptime(value, self.pattern)[:3])
        except Exception:
            raise InvalidTypeError(value=value).construct(self, 'invalid')

    def _validate_value(self, value):
        if not isinstance(value, date):
            raise InvalidTypeError(value=value).construct(self, 'invalid')

        minimum = self.minimum
        if minimum is not None:
            if callable(minimum):
                minimum = minimum()
            if value < minimum:
                raise ValidationError(value=value).construct(self, 'minimum',
                    minimum=minimum.strftime(self.pattern))

        maximum = self.maximum
        if maximum is not None:
            if callable(maximum):
                maximum = maximum()
            if value > maximum:
                raise ValidationError(value=value).construct(self, 'maximum',
                    maximum=maximum.strftime(self.pattern))

class DateTime(Field):
    """A resource field for ``datetime`` values.

    :param minimum: Optional, default is ``None``; the earliest valid value for this field,
        as either a ``datetime`` or a callable which returns a ``datetime``. In either case,
        a naive value will be assumed to be in the timezone set for this field, and will have
        that timezone applied to it.

    :param maximum: Optional, default is ``None``; the latest valid value for this field,
        as either a ``datetime`` or a callable which returns a ``datetime``. In either case,
        a naive value will be assumed to be in the timezone set for this field, and will have
        that timezone applied to it.

    :param tzinfo timezone: Optional, default is the local timezone; the timezone to apply
        to naive values processed by this field.

    Values are serialized according to ISO-8601, in UTC time. A naive ``datetime`` (one with
    no ``tzinfo``) will be assumed to be in the default timezone for the field, and will be
    converted to UTC after having that timezone applied to it. On unserialization, values will
    be converted back to the default timezone (typically local).
    """

    parameters = ('maximum', 'minimum')
    pattern = '%Y-%m-%dT%H:%M:%SZ'

    errors = {
        'invalid': '%(field)s must be a datetime value',
        'minimum': '%(field)s must not occur before %(minimum)s',
        'maximum': '%(field)s must not occur after %(maximum)s',
    }

    def __init__(self, minimum=None, maximum=None, timezone=LOCAL, **params):
        super(DateTime, self).__init__(**params)
        self.timezone = timezone

        if isinstance(minimum, datetime):
            minimum = self._normalize_value(minimum)
        if isinstance(maximum, datetime):
            maximum = self._normalize_value(maximum)

        self.maximum = maximum
        self.minimum = minimum

    def _normalize_value(self, value):
        if value.tzinfo is not None:
            return value.astimezone(self.timezone)
        else:
            return value.replace(tzinfo=self.timezone)

    def _serialize_value(self, value):
        return value.astimezone(UTC).strftime(self.pattern)

    def _unserialize_value(self, value):
        try:
            unserialized = datetime(*strptime(value, self.pattern)[:6])
            return unserialized.replace(tzinfo=UTC)
        except Exception:
            raise InvalidTypeError(value=value).construct(self, 'invalid')

    def _validate_value(self, value):
        if not isinstance(value, datetime):
            raise InvalidTypeError(value=value).construct(self, 'invalid')

        value = self._normalize_value(value)

        minimum = self.minimum
        if minimum is not None:
            if callable(minimum):
                minimum = self._normalize_value(minimum())
            if value < minimum:
                raise ValidationError(value=value).construct(self, 'minimum',
                    minimum=minimum.strftime(self.pattern))

        maximum = self.maximum
        if maximum is not None:
            if callable(maximum):
                maximum = self._normalize_value(maximum())
            if value > maximum:
                raise ValidationError(value=value).construct(self, 'maximum',
                    maximum=maximum.strftime(self.pattern))

        return value

class Enumeration(Field):
    """A resource field for enumerated values.

    :param list enumeration: The list of valid values for this field, all of which must be
        natively serializable (i.e., a ``bool``, ``float``, ``integer`` or ``string``). Can
        also be specified as a single space-delimited string.
    """

    errors = {'invalid': '%(field)s must be one of %(values)s'}
    parameters = ('enumeration',)

    def __init__(self, enumeration, **params):
        super(Enumeration, self).__init__(**params)
        if isinstance(enumeration, basestring):
            enumeration = enumeration.split(' ')
        if isinstance(enumeration, list):
            for value in enumeration:
                if not isinstance(value, NATIVELY_SERIALIZABLE):
                    raise SpecificationError('Enumeration values must be natively serializable')
        else:
            raise SpecificationError('enumeration must be a list of natively serializable values')

        self.enumeration = enumeration
        self.representation = ', '.join([repr(value) for value in enumeration])

    def _validate_value(self, value):
        if value not in self.enumeration:
            raise InvalidTypeError(value=value).construct(self, 'invalid', values=self.representation)

class Float(Field):
    """A resource field for ``float`` values.

    :param float minimum: Optional, default is ``None``; the minimum valid value
        for this field.

    :param float maximum: Optional, default is ``None``; the maximum valid value
        for this field.
    """

    errors = {
        'invalid': '%(field)s must be a floating-point number',
        'minimum': '%(field)s must be greater then or equal to %(minimum)f',
        'maximum': '%(field)s must be less then or equal to %(maximum)f',
    }
    parameters = ('maximum', 'minimum')

    def __init__(self, minimum=None, maximum=None, **params):
        super(Float, self).__init__(**params)
        if minimum is None or isinstance(minimum, float):
            self.minimum = minimum
        else:
            raise SpecificationError('Float.minimum must be a float if specified')

        if maximum is None or isinstance(maximum, float):
            self.maximum = maximum
        else:
            raise SpecificationError('Float.maximum must be a float if specified')

    def _unserialize_value(self, value):
        try:
            return float(value)
        except Exception:
            raise InvalidTypeError(value=value).construct(self, 'invalid')

    def _validate_value(self, value):
        if not isinstance(value, float):
            raise InvalidTypeError(value=value).construct(self, 'invalid')

        minimum = self.minimum
        if minimum is not None and value < minimum:
            raise ValidationError(value=value).construct(self, 'minimum', minimum=minimum)

        maximum = self.maximum
        if maximum is not None and value > maximum:
            raise ValidationError(value=value).construct(self, 'maximum', maximum=maximum)

class Integer(Field):
    """A resource field for ``integer`` values.

    :param integer minimum: Optional, default is ``None``; the minimum valid value
        for this field.

    :param integer maximum: Optional, default is ``None``; the maximum valid value
        for this field.
    """

    errors = {
        'invalid': '%(field)s must be an integer',
        'minimum': '%(field)s must be greater then or equal to %(minimum)d',
        'maximum': '%(field)s must be less then or equal to %(maximum)d',
    }
    parameters = ('maximum', 'minimum')

    def __init__(self, minimum=None, maximum=None, **params):
        super(Integer, self).__init__(**params)
        if minimum is None or isinstance(minimum, (int, long)):
            self.minimum = minimum
        else:
            raise SpecificationError('Integer.minimum must be an integer if specified')

        if maximum is None or isinstance(maximum, (int, long)):
            self.maximum = maximum
        else:
            raise SpecificationError('Integer.maximum must be an integer if specified')

    def _unserialize_value(self, value):
        if value is True or value is False:
            raise InvalidTypeError(value=value).construct(self, 'invalid')

        try:
            return int(value)
        except Exception:
            raise InvalidTypeError(value=value).construct(self, 'invalid')

    def _validate_value(self, value):
        if value is True or value is False or not isinstance(value, (int, long)):
            raise InvalidTypeError(value=value).construct(self, 'invalid')

        minimum = self.minimum
        if minimum is not None and value < minimum:
            raise ValidationError(value=value).construct(self, 'minimum', minimum=minimum)

        maximum = self.maximum
        if maximum is not None and value > maximum:
            raise ValidationError(value=value).construct(self, 'maximum', maximum=maximum)

class Map(Field):
    """A resource field for mappings of key/value pairs.

    :param Field value: A :class:`Field` which specifies the values this map can contain;
        can only be ``None`` when instantiating a subclass which specifies ``value`` at
        the class level.

    :param list required_keys: Optional, default is ``None``; a list of keys which are
        required to be present in this map. Can also be specified as a single space-delimited
        string.
    """

    value = None
    errors = {
        'invalid': '%(field)s must be a map',
        'required': "%(field)s is missing required key '%(name)s'",
    }
    parameters = ('required_keys',)
    structural = True

    def __init__(self, value=None, required_keys=None, **params):
        super(Map, self).__init__(**params)
        if value is not None:
            self.value = value
        if not isinstance(self.value, Field):
            raise SpecificationError('Map(value) must be a Field instance')

        self.required_keys = required_keys
        if isinstance(self.required_keys, basestring):
            self.required_keys = self.required_keys.split(' ')
        if self.required_keys is not None and not isinstance(self.required_keys, (list, tuple)):
            raise SpecificationError('Map(required_keys) must be a list of strings')

    @classmethod
    def construct(cls, specification):
        specification['value'] = Field.reconstruct(specification['value'])
        return super(Map, cls).construct(specification)

    def describe(self):
        return super(Map, self).describe(value=self.value.describe())

    def extract(self, subject):
        definition = self.value
        if definition.structural:
            extraction = {}
            for key, value in subject.iteritems():
                if value is not None:
                    value = definition.extract(value)
                extraction[key] = value
            return extraction
        else:
            return subject.copy()
        
    def process(self, value, phase, serialized=False):
        if self._is_null(value):
            return None
        if not isinstance(value, dict):
            raise InvalidTypeError(value=value).construct(self, 'invalid')

        valid = True
        value_field = self.value

        map = {}
        for name, subvalue in value.iteritems():
            try:
                map[name] = value_field.process(subvalue, phase, serialized)
            except StructuralError, exception:
                valid = False
                map[name] = exception

        if self.required_keys:
            for name in self.required_keys:
                if name not in map:
                    valid = False
                    map[name] = ValidationError().construct(self, 'required', name=name)

        if valid:
            return map
        else:
            raise ValidationError(value=value, structure=map)

class Recursive(Field):
    """A resource field which contains a recursive structure.

    :param definition: A :class:`Field` which represents the start of the
        recursive structure.

    Using this field typically requires two steps::

        recursor = RecursiveField()
        structure = Structure({
            'children': recursor,
            ...
        })
        recursor.definition = structure
    """

    structural = True

    def __init__(self, definition=None, **params):
        super(Recursive, self).__init__(**params)
        if definition is None or (isinstance(definition, Field) and definition.structural):
            self.definition = definition
        else:
            raise SpecificationError()

    @classmethod
    def construct(cls, specification):
        specification['definition'] = Field.reconstruct(specification['definition'])
        return super(Recursive, cls).construct(specification)

    def filter(self, exclusive=False, **params):
        return self.definition.filter(exclusive, **params)

    def process(self, value, phase, serialized=False):
        return self.definition.process(value, phase, serialized)

class Sequence(Field):
    """A resource field for sequences of items.

    :param item: A :class:`Field` which specifies the items this sequence can contain;
        can only be ``None`` when instantiating a subclass which specifies ``item`` at
        the class level.

    :param integer min_length: Optional, defaults to ``None``; the minimum length
        of this sequence.

    :param integer max_length: Optional, defaults to ``None``; the maximum length
        of this sequence.
    """

    errors = {
        'invalid': '%(field)s must be a sequence',
        'min_length': '%(field)s must have at least %(min_length)d %(noun)s',
        'max_length': '%(field)s must have at most %(max_length)d %(noun)s',
    }
    item = None
    parameters = ('min_length', 'max_length')
    structural = True

    def __init__(self, item=None, min_length=None, max_length=None, **params):
        super(Sequence, self).__init__(**params)
        if item is not None:
            self.item = item
        if not isinstance(self.item, Field):
            raise SpecificationError('Sequence.item must be a Field instance')

        if min_length is None or (isinstance(min_length, int) and min_length >= 0):
            self.min_length = min_length
        else:
            raise SpecificationError('Sequence.min_length must be an integer if specified')

        if max_length is None or (isinstance(max_length, int) and max_length >= 0):
            self.max_length = max_length
        else:
            raise SpecificationError('Sequence.max_length must be an integer if specified')

    @classmethod
    def construct(cls, specification):
        specification['item'] = Field.reconstruct(specification['item'])
        return super(Sequence, cls).construct(specification)

    def describe(self):
        return super(Sequence, self).describe(item=self.item.describe())

    def extract(self, subject):
        definition = self.item
        if definition.structural:
            extraction = []
            for item in subject:
                if item is not None:
                    item = definition.extract(item)
                extraction.append(item)
            return extraction
        else:
            return list(subject)

    def filter(self, exclusive=False, **params):
        if not super(Sequence, self).filter(exclusive, **params):
            return None
        if self.item and self.item.structural:
            return self.clone(item=self.item.filter(exclusive, **params))
        else:
            return self

    def process(self, value, phase, serialized=False):
        if self._is_null(value):
            return None
        if not isinstance(value, list):
            raise InvalidTypeError(value=value).construct(self, 'invalid')

        min_length = self.min_length
        if min_length is not None and len(value) < min_length:
            raise ValidationError(value=value).construct(self, 'min_length',
                min_length=min_length, noun=pluralize('item', min_length))

        max_length = self.max_length
        if max_length is not None and len(value) > max_length:
            raise ValidationError(value=value).construct(self, 'max_length',
                max_length=max_length, noun=pluralize('item', max_length))

        valid = True
        item = self.item

        sequence = []
        for subvalue in value:
            try:
                sequence.append(item.process(subvalue, phase, serialized))
            except StructuralError, exception:
                valid = False
                sequence.append(exception)

        if valid:
            return sequence
        else:
            raise ValidationError(value=value, structure=sequence)

class Structure(Field):
    """A resource field for structures of key/value pairs.

    A structure has an explicit set of key strings, each related to a :class:`Field`
    specifying the potential value for that key. During validation, a :exc:`ValidationError`
    will be raised if unknown keys are present in the value being processed.

    :param dict structure: A ``dict`` containing ``string`` keys and :class:`Field` values;
        can only be ``None`` when instantiating a subclass which specifies ``structure``
        at the class level.
    """

    errors = {
        'invalid': '%(field)s must be a structure',
        'required': "%(field)s is missing required field '%(name)s'",
        'unknown': "%(field)s includes an unknown field '%(name)s'",
    }
    structure = None
    structural = True

    def __init__(self, structure=None, **params):
        super(Structure, self).__init__(**params)
        if structure is not None:
            self.structure = structure
        if not isinstance(self.structure, dict):
            raise SpecificationError('structure must be a dict')

        for name, field in self.structure.iteritems():
            if not isinstance(field, Field):
                raise SpecificationError('structure values must be Field instances')
            if not field.name:
                field.name = name

    @classmethod
    def construct(cls, specification):
        structure = specification['structure']
        for name, field in structure.items():
            structure[name] = Field.reconstruct(field)
        return super(Structure, cls).construct(specification)

    def describe(self):
        structure = {name: field.describe() for name, field in self.structure.iteritems()}
        return super(Structure, self).describe(structure=structure)

    def extract(self, subject):
        extraction = {}
        for name, field in self.structure.iteritems():
            try:
                value = subject[name]
            except KeyError:
                continue
            if value is not None and field.structural:
                value = field.extract(value)
            extraction[name] = value
        return extraction

    def filter(self, exclusive=False, **params):
        if not super(Structure, self).filter(exclusive, **params):
            return None

        structure = {}
        for name, field in self.structure.iteritems():
            field = field.filter(exclusive, **params)
            if field:
                structure[name] = field
        return self.clone(structure=structure)

    def process(self, value, phase, serialized=False):
        if self._is_null(value):
            return None
        if not isinstance(value, dict):
            raise InvalidTypeError(value=value).construct(self, 'invalid')

        valid = True
        names = set(value.keys())

        structure = {}
        for name, field in self.structure.iteritems():
            if name in names:
                names.remove(name)
                field_value = value[name]
            elif field.required:
                valid = False
                structure[name] = ValidationError().construct(self, 'required', name=name)
                continue
            elif phase == 'incoming' and field.default:
                field_value = field.get_default()
            else:
                continue

            try:
                structure[name] = field.process(field_value, phase, serialized)
            except StructuralError, exception:
                valid = False
                structure[name] = exception

        for name in names:
            valid = False
            structure[name] = ValidationError().construct(self, 'unknown', name=name)

        if valid:
            return structure
        else:
            raise ValidationError(value=value, structure=structure)

class Text(Field):
    """A resource field for text values.

    :param pattern: Optional, default is ``None``; a regular expression which values of this
        field must match, specified as either a compiled regular expression or a string.

    :param integer min_length: Optional, default is ``None``; the minimum length of valid
        values for this field.

    :param integer max_length: Optional, default is ``None``; the maximum length of valid
        values for this field.
    """

    errors = {
        'invalid': '%(field)s must be a textual value',
        'pattern': '%(field)s has an invalid value',
        'min_length': '%(field)s must contain at least %(min_length)d %(noun)s',
        'max_length': '%(field)s may contain at most %(max_length)d %(noun)s',
    }
    parameters = ('max_length', 'min_length')
    pattern = None

    def __init__(self, pattern=None, min_length=None, max_length=None, **params):
        super(Text, self).__init__(**params)
        if pattern is not None:
            if isinstance(pattern, basestring):
                pattern = re.compile(pattern)
            self.pattern = pattern

        if min_length is None or (isinstance(min_length, int) and min_length >= 0):
            self.min_length = min_length
        else:
            raise SpecificationError('TextField.min_length must be an integer >= 0, if specified')

        if max_length is None or (isinstance(max_length, int) and max_length >= 0):
            self.max_length = max_length
        else:
            raise SpecificationError('TextField.max_length must be an integer >= 0, if specified')

    def describe(self):
        pattern = (repr(self.pattern.pattern) if self.pattern else None)
        return super(Text, self).describe(pattern=pattern)

    def _validate_value(self, value):
        if not isinstance(value, basestring):
            raise InvalidTypeError(value=value).construct(self, 'invalid')
        if self.pattern and not self.pattern.match(value):
            raise ValidationError(value=value).construct(self, 'pattern')

        min_length = self.min_length
        if min_length is not None and len(value) < min_length:
            noun = 'character'
            if min_length > 1:
                noun = 'characters'
            raise ValidationError(value=value).construct(self, 'min_length',
                min_length=min_length, noun=noun)

        max_length = self.max_length
        if max_length is not None and len(value) > max_length:
            noun = 'character'
            if max_length > 1:
                noun = 'characters'
            raise ValidationError(value=value).construct(self, 'max_length',
                max_length=max_length, noun=noun)

class Time(Field):
    """A resource field for ``time`` values.

    :param minimum: Optional, default is ``None``; the earliest valid value for this field, as
        either a ``time`` or a callable which returns a ``time``.

    :param maximum: Optional, default is ``None``; the earliest valid value for this field, as
        either a ``time`` or a callable which returns a ``time``.
    """

    errors = {
        'invalid': '%(field)s must be a time value',
        'minimum': '%(field)s must not occur before %(minimum)s',
        'maximum': '%(field)s must not occur after %(maximum)s',
    }
    parameters = ('maximum', 'minimum')
    pattern = '%H:%M:%S'

    def __init__(self, minimum=None, maximum=None, **params):
        super(Time, self).__init__(**params)
        self.maximum = maximum
        self.minimum = minimum

    def _serialize_value(self, value):
        return value.strftime(self.pattern)

    def _unserialize_value(self, value):
        try:
            return time(*strptime(value, self.pattern)[3:6])
        except Exception:
            raise InvalidTypeError(value=value).construct(self, 'invalid')

    def _validate_value(self, value):
        if not isinstance(value, time):
            raise InvalidTypeError(value=value).construct(self, 'invalid')

        minimum = self.minimum
        if minimum is not None:
            if callable(minimum):
                minimum = minimum()
            if value < minimum:
                raise ValidationError(value=value).construct(self, 'minimum',
                    minimum=minimum.strftime(self.pattern))

        maximum = self.maximum
        if maximum is not None:
            if callable(maximum):
                maximum = maximum()
            if value > maximum:
                raise ValidationError(value=value).construct(self, 'maximum',
                    maximum=maximum.strftime(self.pattern))

class Tuple(Field):
    """A resource field for tuples of values.

    :param tuple values: A ``tuple`` of :class:`Field`s which specifies the values this
        tuple contains; can only be ``None`` when instantiating a subclass which specifies
        ``values`` at the class level.
    """

    errors = {
        'invalid': '%(field)s must be a tuple',
        'length': '%(field)s must contain exactly %(length)d values',
    }
    structural = True
    values = None

    def __init__(self, values=None, **params):
        super(Tuple, self).__init__(**params)
        if values is not None:
            self.values = values
        if not isinstance(self.values, (list, tuple)):
            raise SpecificationError('Tuple.values must be a list or tuple')

    @classmethod
    def construct(cls, specification):
        specification['values'] = tuple(Field.reconstruct(field) for field in specification['values'])
        return super(Tuple, cls).construct(specification)

    def describe(self):
        return super(Tuple, self).describe(values=[value.describe() for value in self.values])

    def extract(self, subject):
        extraction = []
        for i, definition in enumerate(self.values):
            value = subject[i]
            if value is not None and definition.structural:
                value = definition.extract(value)
            extraction.append(value)
        return tuple(extraction)

    def process(self, value, phase, serialized=False):
        if self._is_null(value):
            return None
        if not isinstance(value, (list, tuple)):
            raise InvalidTypeError(value=value).construct(self, 'invalid')

        values = self.values
        if len(value) != len(values):
            raise ValidationError(value=value).construct(self, 'length', length=len(values))

        valid = True
        sequence = []

        for i, field in enumerate(values):
            try:
                sequence.append(field.process(value[i], phase, serialized))
            except StructuralError, exception:
                valid = False
                sequence.append(exception)

        if valid:
            return tuple(sequence)
        else:
            raise ValidationError(value=value, structure=sequence)

class Union(Field):
    """A resource field that supports multiple field values.

    :param tuple fields: A ``tuple`` of :class:`Field`s which specify, in order of preference,
        potential values for this field; can only be ``None`` when instantiating a subclass
        which specifies ``fields`` at the class level.
    """

    fields = None
    structural = True

    def __init__(self, fields=None, **params):
        super(Union, self).__init__(**params)
        if fields is not None:
            self.fields = fields
        if not isinstance(self.fields, tuple) or not self.fields:
            raise SpecificationError('Union.fields must be a tuple with at least one item')
        for field in self.fields:
            if not isinstance(field, Field):
                raise SpecificationError('Union.fields items must be Field instances')

    @classmethod
    def construct(cls, specification):
        specification['fields'] = tuple(Field.reconstruct(field) for field in specification['fields'])
        return super(Union, cls).construct(specification)

    def describe(self):
        return super(Union, self).describe(fields=[field.describe() for field in self.fields])

    def process(self, value, phase, serialized=False):
        if self._is_null(value):
            return None

        for field in self.fields:
            try:
                return field.process(value, phase, serialized)
            except InvalidTypeError:
                pass
        else:
            raise InvalidTypeError(value=value).construct(self, 'invalid')

Errors = Tuple((
    Sequence(
        Map(Text(nonnull=True), description='A mapping describing an error with this request.'),
        description='A sequence of global errors for this request.'),
    Field(description='A structure containing structural errors for this request.')),
    description='A two-tuple containing the errors for this request.'
)

__all__ = ['Field', 'Errors'] + construct_all_list(locals(), Field)
