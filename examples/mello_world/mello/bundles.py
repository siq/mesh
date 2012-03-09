from mesh.standard import *
from resources import MelloWorld
from controllers import MelloWorldController

#: bundle for the mello_world application
mello_bundle = Bundle('mello', mount(MelloWorld, MelloWorldController))
