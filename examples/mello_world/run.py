'''
Script to deploy simple "hello world" Mesh example client and server.
'''

from sys import argv, stderr, exit

def _mello_client_request(client, name):
    response = client.execute('melloworld', 'mello', None, {'name': name})
    print response.content['message']

def _mello_client_prompt():
    while True:
        msg = raw_input('name: ')
        if msg:
            yield msg
        else:
            raise StopIteration

def client(argv):
    import logging
    logging.basicConfig(level=logging.INFO)

    from mello.bundles import mello_bundle
    from mesh.transport.internal import InternalServer, InternalClient
    from mesh.bundle import Specification

    from optparse import OptionParser
    op = OptionParser()
    op.add_option('-p', '--port', type='int', default=8888)
    op.add_option('-H', '--host', default='localhost')
    op.add_option('--local', action='store_true')
    opt, args = op.parse_args(argv)

    specification = Specification(mello_bundle.describe(version=(1, 0)))

    if opt.local:
        server = InternalServer([mello_bundle])
        client = InternalClient(server, specification)
    else:
        print >>stderr, 'not supported yet'
        return 1

    for name in args or _mello_client_prompt():
        _mello_client_request(client, name)

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

    except KeyError:
        print >>stderr, 'unexpected command:', argv[0]
        return 1

if __name__ == '__main__':
    exit(main(argv[1:]))
