from mesh.bundle import *
from mesh.constants import *
from mesh.exceptions import *
from mesh.request import *
from mesh.resource import *
from mesh.standard.controllers import StandardController
from mesh.standard.requests import DEFAULT_REQUESTS, STANDARD_REQUESTS, VALIDATED_REQUESTS
from mesh.util import import_object
from scheme import *

STANDARD_CONFIGURATION = Configuration(
    default_requests=DEFAULT_REQUESTS,
    standard_requests=STANDARD_REQUESTS,
    validated_requests=VALIDATED_REQUESTS,
    default_controller=StandardController,
)

class Resource(Resource):
    configuration = STANDARD_CONFIGURATION

Controller = StandardController

def generate_dynamic_binding(bundle, version, binding_module='mesh.standard.python'):
    from mesh.binding.python import BindingGenerator
    generator = BindingGenerator(binding_module=binding_module)
    return generator.generate_dynamically(bundle, version)
