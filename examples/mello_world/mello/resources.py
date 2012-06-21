from mesh.standard import *

class MelloWorld(Resource):
    '''Definition of the melloworld resource'''

    name = "melloworld"
    version = 1

    requests = []

    class mello:
        endpoint = (GET, 'mello')
        schema = { 'name': Text()}
        responses = {OK: {'message':Text(required=True, nonnull=True)}}
