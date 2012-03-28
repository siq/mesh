from mesh.standard import *

class Blog(Resource):
    '''Definition of a blog'''

    name = 'blog'
    version = 1

    class schema:
        title = Text(required=True, nonull=True, operators=['cnt'])
        posts = Sequence(Integer())

class Post(Resource):
    '''Definition of a blog post'''

    name = 'post'
    version = 1

    class schema:
        title = Text(operators=['cnt'])
        author = Text(operators=['eq'])
        body = Text(operators=['cnt'])
        blog = Integer(required=True, nonnull=True, operators=['eq'])

