from datetime import date

from mesh.standard import *

class storage(object):
    resources = {}
    id = 0

    @classmethod
    def delete(cls, id):
        del cls.resources[id]

    @classmethod
    def get(cls, id):
        return cls.resources.get(id)

    @classmethod
    def next_id(cls):
        cls.id += 1
        return cls.id

    @classmethod
    def put(cls, id, resource):
        cls.resources[id] = resource

    @classmethod
    def reset(cls):
        cls.resources = {}
        cls.id = 0

class HarnessController(Controller):
    @classmethod
    def acquire(cls, subject):
        try:
            subject = int(subject)
        except ValueError:
            return None
        return storage.get(subject)

    def query(self, context, response, subject, data):
        pass

    def get(self, context, response, subject, data):
        data = data or {}
        include = data.get('include') or []
        exclude = data.get('exclude') or []

        resource = {}
        for name, value in subject.iteritems():
            if name == 'id':
                resource[name] = value
            elif name not in exclude:
                field = self.resource.schema[name]
                if name in include or not field.deferred:
                    resource[name] = value
        response(resource)

    def create(self, context, response, subject, data):
        id = data['id'] = storage.next_id()
        storage.put(id, data)
        response({'id': id})

    def update(self, context, response, subject, data):
        subject.update(data)
        response({'id': subject['id']})

    def delete(self, context, response, subject, data):
        storage.delete(subject['id'])
        response({'id': subject['id']})

class Example(Resource):
    name = 'example'
    version = 1

    class schema:
        required_field = Text(required=True, nonnull=True)
        deferred_field = Text(deferred=True)
        default_field = Integer(default=1)
        constrained_field = Integer(minimum=2, maximum=4)
        readonly_field = Integer(readonly=True)
        boolean_field = Boolean()
        constant_field = Constant('constant')
        date_field = Date()
        datetime_field = DateTime()
        enumeration_field = Enumeration([1, 2, 3])
        float_field = Float()
        integer_field = Integer()
        map_field = Map(Integer())
        sequence_field = Sequence(Integer())
        structure_field = Structure({
            'required_field': Integer(required=True),
            'optional_field': Integer(),

        })
        text_field = Text()
        time_field = Time()
        tuple_field = Tuple((Text(), Integer()))
        union_field = Union((Text(), Integer()))

    class filtered_update:
        endpoint = (POST, 'example/id')
        filter = {'operation': 'filter'}
        schema = {
            'operation': Constant('filter', required=True, nonnull=True),
        }
        responses = {
            OK: {'id': Integer(required=True, nonnull=True)},
        }

    class custom:
        endpoint = (POST, 'example/id/custom')
        schema = {
            'optional_field': Text(),
        }
        responses = {
            OK: {'id': Integer(required=True, nonnull=True)},
        }

    @validator('float_field')
    def validate_float_field(cls, data):
        pass

class ExampleController(HarnessController):
    resource = Example
    version = (1, 0)

class Alpha(Resource):
    name = 'alpha'
    version = 1

    class schema:
        field = Text()

primary_bundle = Bundle('primary',
    mount(Example, ExampleController)
)

class Secondary(Resource):
    name = 'secondary'
    version = 1

class SecondaryController(HarnessController):
    resource = Secondary
    version = (1, 0)

secondary_bundle = Bundle('secondary',
    mount(Secondary, SecondaryController)
)
