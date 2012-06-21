from mesh.standard import *
from resources import MelloWorld

class MelloWorldController(Controller):
    '''Controller for the :class:`MelloWorld` resource'''

    resource = MelloWorld
    version = (1, 0)

    def mello(self, context, response, subject, data):
        '''
        Updates the response with a friendly message to the individual whose
        name is provided in the data
        '''
        response({'message': 'Mello, ' + data['name']})
