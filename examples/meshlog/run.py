'''
Driver script for a Mesh blogging example
'''

from sys import argv, stderr, exit
import readline

def client(argv):
    '''Basic CLI client to meshlog'''

    import logging
    logging.basicConfig(level=logging.INFO)

    from meshlog.bundles import meshlog_bundle
    from mesh.transport.internal import InternalServer, InternalClient
    from mesh.transport.http import HttpServer, HttpClient
    from mesh.bundle import Specification
    import re

    from optparse import OptionParser
    op = OptionParser()
    op.add_option('-p', '--port', type='int', default=8888)
    op.add_option('-H', '--host', default='localhost')
    op.add_option('--local', action='store_true')
    opt, args = op.parse_args(argv)

    specification = Specification(meshlog_bundle.describe(version=(1, 0)))

    if opt.local:
        server = InternalServer([meshlog_bundle])
        client = InternalClient(server, specification)
    else:
        client = HttpClient('http://%s:%s/' % (opt.host, opt.port), specification)

    state = dict(blog=None, user=None)

    def open_blog_action(params):
        state['blog'] = int(params[0] if params else raw_input('blog id: '))

    def get_blog_id():
        return state['blog'] if state['blog'] is not None else int(raw_input('blog id: '))

    def set_user_action(params):
        state['user'] = get_param(params, 'user')

    def get_param(params, param_name):
        return ' '.join(params) if params else raw_input(param_name + ': ')

    def get_user():
        return state['user'] if state['user'] is not None else raw_input('user: ')

    def create_blog_action(params):
        title = get_param(params, 'title')
        client.execute('blog', 'create', None, {'title': title})

    def query_blog_action(params):
        q = get_param(params, 'query')
        response = client.execute('blog', 'query', None, {'query': {'title__contains': q}})
        print 'Number of results:', response.content['total']
        for blog in response.content['resources']:
            print blog

    def update_blog_action(params):
        blog_id = get_blog_id()
        title = get_param(params, 'new title')
        client.execute('blog', 'update', blog_id, {'title': title})

    def delete_blog_action(params):
        blog_id = get_blog_id()
        client.execute('blog', 'delete', blog_id, {})
        if state['blog'] == blog_id:
            del state['blog']

    def view_blog_action(params):
        print client.execute('blog', 'get', get_blog_id(), {}).content

    def create_post_action(params):
        title = get_param(params, 'title')
        author = get_user()
        blog_id = get_blog_id()
        body = raw_input('post: ')
        data = dict(title=title, author=author, blog=blog_id, body=body)
        client.execute('post', 'create', None, data)

    def query_post_action(params):
        blog_id = get_blog_id()
        q = get_param(params, 'query')
        query = {'query':
                    {'blog': blog_id,
                     'title__contains': q,
                     'body__contains': q}}
        response = client.execute('post', 'query', None, query)
        print 'Number of posts:', response.content['total']
        for post in response.content['resources']:
            print post

    while True:
        try:
            input = tuple(re.split('\\s+', raw_input('> ')))

            if input is None or input == ('exit',):
                return

            commands = ['open blog',
                        'create blog',
                        'query blogs',
                        'update blog',
                        'delete blog',
                        'view blog',
                        'set user',
                        'create post',
                        'query posts']

            actions =   [open_blog_action,
                         create_blog_action,
                         query_blog_action,
                         update_blog_action,
                         delete_blog_action,
                         view_blog_action,
                         set_user_action,
                         create_post_action,
                         query_post_action]

            dispatch = dict(zip(commands, actions))

            key, params = ' '.join(input[:2]), input[2:]

            if key in dispatch:
                dispatch[key](params)

            elif key == 'help':
                for c in commands:
                    print c

            else:
                print 'unexpected action:', (' '.join(input))

        except EOFError:
            print
            return 0

    return 0

def server(argv):
    import logging
    logging.basicConfig(level=logging.INFO)

    from mello.bundles import mello_bundle
    from optparse import OptionParser
    from wsgiref.simple_server import make_server
    from mesh.transport.http import WsgiServer

    op = OptionParser()
    op.add_option('-p', '--port', type='int', default=8888)
    op.add_option('-H', '--host', default='localhost')

    # jump out now
    if 1 == 1:
        print >>stderr, 'not supported yet'
        return 1
    opt, args = op.parse_args(argv)

    wsgi_server = WsgiServer([mello_bundle])
    server = make_server(opt.host, opt.port, wsgi_server)
    server.shutdown()
    return 0

_commands = (client, server)

def main(argv):
    dispatch = dict((cmd.__name__, cmd) for cmd in _commands)
    try:
        return dispatch[argv[0]](argv[1:])

    except IndexError:
        print >>stderr, 'please supply a command:', (', '.join(dispatch.keys()))
        return 1

if __name__ == '__main__':
    exit(main(argv[1:]))
