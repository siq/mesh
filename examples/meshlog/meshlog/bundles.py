from mesh.standard import *
from resources import *
from controllers import *

meshlog_bundle = Bundle('meshlog',
    mount(Blog, BlogController),
    mount(Post, PostController))

