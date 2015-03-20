from mesh.standard import *

class MelloWorld(Resource):
    '''Definition of the melloworld resource'''

    name = "melloworld"
    version = 1

    # request defines the support request for this resoures
    #   @param {string} space delemeted string
    #
    # In this example we are overridding all default requests.
    # This means that no request will be supported unless we manually add them
    # below, which we will do.
    requests = []

    # Provide a custom request class that this resource will supports
    # This is similar to providing a new HTTP Method like GET but the method name will be `say_mello`
    #   i.e. `response = client.execute('mello/1.0/melloworld', 'say_mello', None, {'name': name})`
    # Because we're providing a custom request we will need a method in our controller with the
    #   same name to handle this request.
    class say_mello:
        # Manually define an `endpoint`
        #   @param {http method} an http method to support
        #   @param {string} name (does not have to match the classname)
        endpoint = (GET, 'say_mello')
        schema = {'name': Text()}
        responses = {OK: {'message':Text(required=True, nonnull=True)}}
