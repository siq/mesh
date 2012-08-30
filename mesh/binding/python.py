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
    MODEL_TMPL = get_package_data('mesh.binding', 'templates/model.py.tmpl')
    MODULE_TMPL = get_package_data('mesh.binding', 'templates/module.py.tmpl')

    def __init__(self, module_path=None, generate_package=False,
        binding_module='mesh.standard.python', class_modules=None,
        specification_var='specification'):

        if module_path:
            module_path = module_path.strip('.') + '.'
        else:
            module_path = ''

        self.class_modules = []
        if class_modules:
            for module in class_modules:
                self.class_modules.append((module, import_object(module)))

        self.binding_module = binding_module
        self.generate_package = generate_package
        self.module_path = module_path
        self.specification_var = specification_var

    def generate(self, bundle, version):
        if not self.generate_package:
            return self._generate_single_module(bundle, version)

        module_path = '%s%s.' % (self.module_path, bundle.name)
        description = bundle.describe(version)

        models = []
        for name, model in sorted(description['resources'].iteritems()):
            models.append((name, self._generate_model(name, model)))

        files = {}
        if self.separate_models:
            for name, model in models:
                module = self._generate_module(module_path, model)
                files[name] = ('%s.py' % name, module)
        else:
            module = self._generate_module(module_path, '\n\n'.join(item[1] for item in models))
            files['models'] = ('models.py', module)

        specfile = '%s.py' % self.specification_var
        files['__spec__'] = (specfile, self._generate_specification(description))

        files['__init__'] = ('__init__.py', '')
        return files

    def _generate_single_module(self, bundle, version):
        description = bundle.describe(version)

        source = ['from %s import *' % self.binding_module]
        source.append(self._generate_specification(description))

        for name, model in sorted(description['resources'].iteritems()):
            source.append(self._generate_model(name, model))

        filename = '%s.py' % bundle.name
        return {bundle.name: (filename, '\n\n'.join(source))}

    def generate_dynamically(self, bundle, version):
        if isinstance(bundle, basestring):
            bundle = import_object(bundle)

        source = ['from %s import *' % self.binding_module]
        description = bundle.describe(version)

        models = []
        for name, model in description['resources'].iteritems():
            class_module = self._find_class_module(model)
            if class_module:
                source.append('from %s import %s' % (class_module, model['classname']))
                base_class = model['classname']
            else:
                base_class = 'Model'
            models.append(self._generate_model(name, model, base_class))

        source.append(self._generate_specification(description))
        source.extend(models)

        module = ModuleType(bundle.name)
        exec '\n'.join(source) in module.__dict__
        return module

    def _find_class_module(self, model):
        classname = model['classname']
        for name, module in self.class_modules:
            try:
                getattr(module, classname)
            except AttributeError:
                pass
            else:
                return name

    def _generate_model(self, name, model, base_class='Model'):
        return self.MODEL_TMPL % {
            'base_class': base_class,
            'class_name': model['classname'],
            'resource_name': name,
            'specification_var': self.specification_var,
        }

    def _generate_module(self, module_path, content):
        imports = [
            'from %s import *' % self.binding_module,
            'from %s%s import %s' % (module_path, self.specification_var, self.specification_var)
        ]

        return self.MODULE_TMPL % {
            'imports': '\n'.join(imports),
            'content': content,
        }

    def _generate_specification(self, description):
        return '%s = %s' % (self.specification_var, StructureFormatter().format(description))
