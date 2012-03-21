from datetime import date

from mesh.standard import *
from mesh.standard.mock import MockStorage, MockController

storage = MockStorage(':memory:')

class HarnessController(MockController):
    storage = storage

class Example(Resource):
    name = 'example'
    version = 1

    class schema:
        required_field = Text(required=True, nonnull=True, sortable=True)
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
        integer_field = Integer(sortable=True)
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
