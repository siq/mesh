from mesh.bundle import *
from mesh.constants import *
from mesh.exceptions import *
from mesh.request import *
from mesh.resource import *
from mesh.schema import *
from mesh.standard.controllers import *
from mesh.standard.requests import STANDARD_REQUESTS, VALIDATED_REQUESTS
from mesh.util import import_object

STANDARD_CONFIGURATION = Configuration(
    standard_requests=STANDARD_REQUESTS,
    validated_requests=VALIDATED_REQUESTS,
    #default_controller=MockController,
)

class Resource(Resource):
    configuration = STANDARD_CONFIGURATION

__all__ = []
for module in ('bundle', 'constants', 'exceptions', 'request', 'resource',
        'schema', 'standard.controllers'):
    __all__.extend(import_object('mesh.%s.__all__' % module))
