Meshlog -- a very simple Mesh blog
==================================

To run this example from the command-line, make sure the
`mesh` library is in your `PYTHONPATH`, then from this
directory run:

    python run.py client|server [options] [args]

Client interaction
------------------

To interact with the system:

    python run.py client --local

This uses a standalone server connected locally.
(`server` and non-local interaction are still under
development)

Then do some stuff.

Create a blog:

    > create blog Awesome

List your blogs:

    > query blogs
    query:
    Number of results: 1
    {'posts': [], 'id': 0, 'title': 'Awesome'}

"Open" a blog (make it the default for creating posts)

    > open blog 0

View your blog:

    > view blog
    {'posts': [], 'id': 0, 'title': 'Awesome'}

Create a post:

    > create post
    title: this is new
    user: eponvert
    post: hi! how are ya doing. this is my awesome blog.

See the posts in your blog:

    > query posts
    query:
    Number of posts: 1
    {'body': 'hi! how are ya doing. this is my awesome blog.', 'blog': 0, 'title': 'this is new', 'id': 1, 'author': 'eponvert'}

