from mesh.standard import *

class Blog(Resource):
    '''Definition of a blog'''

    name = 'blog'
    version = 1

    class schema:
        title = Text(required=True, nonull=True, operators=['contains'])
        posts = Sequence(Integer())

class Post(Resource):
    '''Definition of a blog post'''

    name = 'post'
    version = 1

    class schema:
        title = Text(operators=['contains'])
        author = Text(operators=['equal'])
        body = Text(operators=['contains'])
        blog = Integer(required=True, nonnull=True, operators=['equal'])

