import sys
from imp import new_module
from inspect import getsourcelines
from os.path import exists, join as joinpath
from types import ModuleType

from mesh.bundle import Specification
from mesh.constants import *
from mesh.exceptions import *
from mesh.transport.base import Client
from mesh.util import StructureFormatter, get_package_data, import_object

class ReadOnlyError(Exception):
    """..."""

class Attribute(object):
    """A model attribute."""

    def __init__(self, name, field):
        self.field = field
        self.name = name

    def __get__(self, instance, owner):
        if instance is not None:
            try:
                return instance._data[self.name]
            except KeyError:
                return None
        else:
            return self

    def __set__(self, instance, value):
        if self.field.readonly:
            raise ReadOnlyError(self.name)
        instance._data[self.name] = value

class ModelMeta(type):
    def __new__(metatype, name, bases, namespace):
        resource = namespace.pop('__resource__', None)
        if resource is not None:
            specification, resource = resource
            if not isinstance(specification, Specification):
                specification = Specification(specification)
        else:
            return type.__new__(metatype, name, bases, namespace)

        resource = specification.resources.get(resource)
        if not resource:
            raise Exception('unknown resource')

        namespace['_name'] = resource['name']
        namespace['_resource'] = resource
        namespace['_specification'] = specification

        attributes = namespace['_attributes'] = {}
        for attr, field in resource['schema'].iteritems():
            namespace[attr] = attributes[attr] = Attribute(attr, field)

        model = type.__new__(metatype, name, bases, namespace)
        return model

class Query(object):
    """A resource query."""

    def __init__(self, model, **params):
        self.model = model
        self.params = params

    def __iter__(self):
        return iter(self._execute_query())

    def all(self):
        return self._execute_query()

    def one(self):
        return self._execute_query()[0]

    def _execute_query(self):
        model = self.model
        models = []
        for result in model._get_client().execute(model._name, 'query', None, self.params or None):
            models.append(model(**result))
        return models

class Model(object):
    """A resource model."""

    __metaclass__ = ModelMeta
    query_class = Query
    repr_attrs = ('id', 'name', 'status', 'platform_id')

    def __init__(self, **params):
        self._data = {}
        if params:
            self._update_model(params)

    def __repr__(self):
        attrs = []
        for attr in self.repr_attrs:
            value = getattr(self, attr, None)
            if value is not None:
                attrs.append('%s=%r' % (attr, value))

        classname = type(self).__name__
        return '%s(%s)' % (classname, ', '.join(attrs))

    @classmethod
    def create(cls, **params):
        request = cls._resource['requests'].get('create')
        if not request:
            raise RuntimeError()

        instance = cls(**request['schema'].extract(params))
        return instance.save(request, **params)

    def destroy(self, quiet=False, **params):
        request = self._get_request('delete')
        if self.id is None:
            return self

        try:
            response = self._execute_request(request, params or None)
        except GoneError:
            if not quiet:
                raise
        else:
            return response.content

    @classmethod
    def execute(cls, request, data, subject=None):
        return cls._get_client().execute(cls._name, request, subject, data)

    @classmethod
    def get(cls, id, **params):
        return cls(id=id).refresh(**params)

    def refresh(self, **params):
        request = self._get_request('get')
        if self.id is None:
            return self

        response = self._execute_request(request, params or None)
        self._update_model(response.content)
        return self

    def put(self, **params):
        request = self._get_request('put')
        return self.save(request, **params)

    @classmethod
    def query(cls, **params):
        return cls.query_class(cls, **params)

    def save(self, _request=None, **params):
        request = _request
        if not request:
            if self.id is not None:
                request = self._get_request('update')
            else:
                request = self._get_request('create')

        data = request['schema'].extract(self._data)
        if params:
            data.update(params)

        response = self._execute_request(request, data)
        self._update_model(response.content)
        return self

    def set(self, **params):
        for attr, value in params.iteritems():
            setattr(self, attr, value)
        return self

    def update(self, attrs, **params):
        self._update_model(attrs)
        return self.save(**params)

    def _execute_request(self, request, data=None):
        subject = None
        if request['specific']:
            subject = self.id
        return self._get_client().execute(self._name, request['name'], subject, data)

    @classmethod
    def _get_client(cls):
        return Client.get_client(cls._specification)

    def _get_request(self, name):
        request = self._resource['requests'].get(name)
        if request:
            return request
        else:
            raise ValueError(name)

    def _update_model(self, data):
        if data:
            self._data.update(data)

class BindingGenerator(object):
    CONSTRUCTOR_PARAMS = ('class_modules', 'binding_module')
    MODEL_TMPL = get_package_data('mesh.binding', 'templates/model.py.tmpl')

    def __init__(self, class_modules=None, binding_module='mesh.standard.python',
            specification_var='specification'):

        self.class_modules = []
        if class_modules:
            for module in class_modules:
                self.class_modules.append((module, import_object(module)))

        self.binding_module = binding_module
        self.specification_var = specification_var

    def generate(self, bundle, version):
        if isinstance(bundle, basestring):
            bundle = import_object(bundle)

        source = self._generate_binding(bundle, version)
        return '%s.py' % bundle.name, source

    def generate_dynamically(self, bundle, version, module=None):
        if isinstance(bundle, basestring):
            bundle = import_object(bundle)

        source = self._generate_binding(bundle, version)
        if not module:
            module = ModuleType(bundle.name)

        exec source in module.__dict__
        return module

    def _find_subclass_candidates(self, classname):
        for name, module in self.class_modules:
            try:
                subclass = getattr(module, classname)
            except AttributeError:
                pass
            else:
                yield subclass

    def _generate_binding(self, bundle, version):
        description = bundle.describe(version)

        source = ['from %s import *' % self.binding_module]
        source.append(self._generate_specification(description))

        for name, model in description['resources'].iteritems():
            source.extend(self._generate_model(name, model))

        return '\n\n'.join(source)

    def _generate_model(self, name, model, base_class='Model'):
        classname = model['classname']
        source = [self.MODEL_TMPL % {
            'base_class': base_class,
            'class_name': classname,
            'resource_name': name,
            'specification_var': self.specification_var,
        }]

        for subclass in self._find_subclass_candidates(classname):
            source.append(self._generate_subclass(classname, subclass))

        return source

    def _generate_specification(self, description):
        return '%s = %s' % (self.specification_var, StructureFormatter().format(description))

    def _generate_subclass(self, classname, subclass):
        source, lineno = getsourcelines(subclass)
        source[0] = source[0].replace('Model', classname)
        return ''.join(source)

def generate_dynamic_binding(bundle, version, class_modules=None,
        binding_module='mesh.standard.python'):

    generator = BindingGenerator(class_modules, binding_module)
    return generator.generate_dynamically(bundle, version)

class BindingLoader(object):
    """Import loader for mesh bindings."""

    def __init__(self, filename):
        self.filename = filename

    def __repr__(self):
        return 'BindingLoader(%r)' % self.filename

    @classmethod
    def find_module(cls, fullname, path=None):
        if path:
            path = path[0]
        else:
            return

        module = fullname.rpartition('.')[-1]
        if exists(joinpath(path, '%s.py' % module)):
            return

        filename = joinpath(path, '%s.mesh' % module)
        if exists(filename):
            return cls(filename)

    def load_module(self, fullname):
        namespace = {}
        execfile(self.filename, namespace)

        try:
            bundle, version = namespace['binding']
        except Exception:
            raise ImportError(fullname)

        if fullname in sys.modules:
            module = sys.modules[fullname]
        else:
            module = sys.modules[fullname] = new_module(fullname)

        module.__file__ = self.filename
        module.__loader__ = self
        module.__package__ = fullname.rpartition('.')[0]

        generator = self._construct_generator(namespace)
        return generator.generate_dynamically(bundle, version, module)

    def _construct_generator(self, namespace):
        params = {}
        for param in BindingGenerator.CONSTRUCTOR_PARAMS:
            if param in namespace:
                params[param] = namespace[param]

        return BindingGenerator(**params)

def install_binding_loader():
    if BindingLoader not in sys.meta_path:
        sys.meta_path.insert(0, BindingLoader)
