from mesh.standard import *
from resources import MelloWorld
from controllers import MelloWorldController

# bundles are used to setup routing for mesh
# a bundle ties urls to resource(s) and controller(s)
#
# A bundle has a single entry point (url)
#   in this case the bundle is 'mello'
#   and would create a /mello/ `endpoint`
#   a complete endpoint is a result of the bundle.name + version + resource.name (/mello/1.0/melloworld)
#
# The reqeusts supported by the endpoint are defined in the resource
#
# The bundle defines the resource(s) and controller(s) that the endpoint maps to via `mount`
#   @param resource
#   @param controller
#   mount(resource, controller)
#
# The following examples illustrate the endpoints that would result from bundle definitions
#
# EXAMPLE 1:
#   mello_bundle = Bundle('mello', mount(MelloWorld, MelloWorldController))
#   URLs:
#       mello/1.0/melloworld
#
# EXAMPLE 2:
#   mello_bundle = Bundle('mello',
#       mount(MelloWorld, MelloWorldController),
#       mount(MelloWorld2, MelloWorldController2))
#   URLs:
#       mello/1.0/melloworld
#       mello/1.0/melloworld2
#

# bundle for the mello_world application
mello_bundle = Bundle('mello', mount(MelloWorld, MelloWorldController))
