from bake import *
from bake.util import execute_python_shell
from mesh.util import StructureFormatter
from scheme import *
from scheme.supplemental import ObjectReference

class ClientShell(Task):
    name = 'mesh.shell'
    description = 'the mesh client shell'
    parameters = {
        'context': Map(Text()),
        'context_header_prefix': Text(),
        'bundle': Text(required=True),
        'mixins': Text(),
        'url': Text(required=True),
        'version': Text(default='1.0'),
        'introspect': Boolean(default=False),
        'ipython': Boolean(default=True),
    }

    source = """
        from bake.util import import_object
        from mesh.standard import bind
        from mesh.transport.http import HttpClient

        if %(introspect)r:
            CLIENT = HttpClient(%(url)r, bundle=%(bundle)r, context=%(context)r,
                context_header_prefix=%(context_header_prefix)r).register()
            SPECIFICATION = CLIENT.specification
            API = bind(SPECIFICATION, %(bundle)r + '/' + %(version)r, %(mixins)r)
        else:
            SPECIFICATION = import_object(%(bundle)r).specify()
            CLIENT = HttpClient(%(url)r, SPECIFICATION, context=%(context)r,
                context_header_prefix=%(context_header_prefix)r).register()
            API = bind(SPECIFICATION, SPECIFICATION.name + '/' + %(version)r, %(mixins)r)
    """

    ipython_source = """
        IP = get_ipython()
        for name in API:
            IP.ex(name + ' = getattr(API, "' + name + '")')

        print 'Models available: ' + ', '.join(sorted(API))
    """

    def run(self, runtime):
        source = self.source
        if self['ipython']:
            source += self.ipython_source

        execute_python_shell(source % self, self['ipython'])

class GenerateDocs(Task):
    name = 'mesh.docs'
    description = 'generate api documentation for a mesh bundle'
    parameters = {
        'bundle': ObjectReference(description='module path of bundle', required=True),
        'docroot': Path(description='path to docroot', required=True),
        'nocache': Boolean(default=False),
        'sphinx': Text(default='sphinx-build'),
        'view': Boolean(description='view documentation after build', default=False),
    }

    def run(self, runtime):
        from mesh.documentation.generator import DocumentationGenerator
        DocumentationGenerator(self['docroot']).generate(self['bundle'].describe(verbose=True))
        runtime.execute('sphinx.html', sourcedir=self['docroot'], view=self['view'],
            nocache=self['nocache'], binary=self['sphinx'])

class GenerateJavascriptBindings(Task):
    name = 'mesh.javascript'
    description = 'generate javascript bindings for a mesh bundle'
    parameters = {
        'bundle': ObjectReference(description='module path of bundle', required=True),
        'mimetype': Text(description='mimetype'),
        'path': Path(description='path to target directory', required=True),
        'templates': Path(description='path to templates directory'),
    }

    def run(self, runtime):
        from mesh.binding.javascript import Generator
        generator = Generator(template_dir=self['templates'], mimetype=self['mimetype'])

        root = self['path']
        if not root.exists():
            root.makedirs_p()
        if not root.isdir():
            raise TaskError('path is not a directory')

        files = generator.generate(self['bundle'])
        self._create_files(root, files)

    def _create_files(self, root, files):
        for name, content in files.iteritems():
            if isinstance(content, dict):
                directory = root / name
                directory.mkdir()
                self._create_files(directory, content)
            else:
                (root / name).write_bytes(content)

class GeneratePythonBindings(Task):
    name = 'mesh.python'
    description = 'generate python bindings for a mesh bundle'
    parameters = {
        'binding_module': Text(default='mesh.standard.python'),
        'bundle': ObjectReference(required=True),
        'mixin_modules': Sequence(Text()),
        'path': Path(description='path to target directory', required=True),
    }

    def run(self, runtime):
        from mesh.binding.python import BindingGenerator
        generator = BindingGenerator(binding_module=self['binding_module'],
            mixin_modules=self['mixin_modules'])
        filename, source = generator.generate(self['bundle'])

        root = self['path']
        if not (root.exists() and root.isdir()):
            raise TaskError('path is not an existing directory')

        (root / filename).write_bytes(source)

class GenerateSpecification(Task):
    name = 'mesh.specification'
    description = 'generate the specification for a bundle'
    parameters = {
        'bundle': ObjectReference(required=True),
        'path': Path(required=True),
        'targets': Sequence(Text()),
    }

    def run(self, runtime):
        description = self['bundle'].describe(self['targets'])
        content = StructureFormatter().format(description)
        self['path'].write_bytes(content)

class StartWsgiServer(Task):
    name = 'mesh.wsgi'
    description = 'runs a wsgi test server for a mesh bundle'
    parameters = {
        'bundle': ObjectReference(description='module path of bundle', required=True),
        'hostname': Text(description='hostname', required=True),
        'detached': Boolean(default=False),
        'pidfile': Text(),
        'uid': Text(),
        'gid': Text(),
    }

    def run(self, runtime):
        from mesh.transport.wsgiserver import WsgiServer, DaemonizedWsgiServer
        if self['detached']:
            server = DaemonizedWsgiServer(self['hostname'], self['bundle'])
            runtime.info('serving at %s' % self['hostname'])
            server.serve(self['pidfile'], self['uid'], self['gid'])
        else:
            server = WsgiServer(self['hostname'], self['bundle'])
            runtime.info('serving at %s' % self['hostname'])
            server.serve()

class StartMockServer(Task):
    name = 'mesh.mock'
    description = 'runs a wsgi test server for a mocked mesh bundle'
    parameters = {
        'bundle': ObjectReference(description='module path of bundle', required=True),
        'fixtures': Path(description='path to fixtures'),
        'hostname': Text(description='hostname', default='127.0.0.1:8080'),
        'storage': Text(description='path to storage db', default=':memory:'),
    }

    def run(self, runtime):
        from mesh.standard.mock import MockStorage, mock_bundle
        from mesh.transport.wsgiserver import WsgiServer

        storage = MockStorage(self['storage'])
        if self['fixtures']:
            storage.load(self['fixtures'].bytes(), True)

        bundle = mock_bundle(self['bundle'], storage)
        server = WsgiServer(self['hostname'], bundle)

        runtime.info('serving at %s' % self['hostname'])
        server.serve()
