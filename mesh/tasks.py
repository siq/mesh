from bake import *
from bake.util import execute_python_shell
from scheme import *
from scheme.supplemental import ObjectReference

class ClientShell(Task):
    name = 'mesh.shell'
    description = 'the mesh client shell'
    parameters = {
        'bundle': Text(required=True),
        'url': Text(required=True),
        'version': Text(default='1.0'),
        'ipython': Boolean(default=True),
    }

    source = """
        def _generate_mesh_binding():
            from bake.util import import_object
            from mesh.standard import generate_dynamic_binding
            from mesh.transport.http import HttpClient

            bundle = import_object(%(bundle)r)
            specification = bundle.specify(%(version)r)

            HttpClient(%(url)r, specification).register()
            return generate_dynamic_binding(bundle, %(version)r)

        API = _generate_mesh_binding()
        del _generate_mesh_binding
    """

    ipython_source = """
        def _prepare_mesh_environment():
            ip = get_ipython()
            models = []
            for name, resource in sorted(API.specification['resources'].iteritems()):
                classname = resource['classname']
                models.append(classname)
                ip.ex(classname + ' = getattr(API, "' + classname + '")')

            print 'Models available: ' + ', '.join(models)

        _prepare_mesh_environment()
        del _prepare_mesh_environment
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
        DocumentationGenerator(self['docroot']).generate(self['bundle'].describe())
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
        'version': Tuple((Integer(), Integer()), description='version to build', required=True),
    }

    def run(self, runtime):
        from mesh.binding.javascript import Generator
        generator = Generator(template_dir=self['templates'], mimetype=self['mimetype'])
        files = generator.generate(self['bundle'], self['version'])

        root = self['path']
        if not root.exists():
            root.makedirs_p()
        if not root.isdir():
            raise TaskError('...')

        for filename, content in files.iteritems():
            (root / filename).write_bytes(content)


class GeneratePythonBindings(Task):
    name = 'mesh.python'
    description = 'generate python bindings for a mesh bundle'
    parameters = {
        'binding_module': Text(description='binding module', default='mesh.standard.python'),
        'bundle': ObjectReference(description='module path of bundle', required=True),
        'mixin_modules': Sequence(Text()),
        'path': Path(description='path to target directory', required=True),
        'version': Text(description='version to build', default='1.0'),
    }

    def run(self, runtime):
        from mesh.binding.python import BindingGenerator
        generator = BindingGenerator(binding_module=self['binding_module'],
            mixin_modules=self['mixin_modules'])
        filename, source = generator.generate(self['bundle'], self['version'])

        root = self['path']
        if not (root.exists() and root.isdir()):
            raise TaskError('...')

        (root / filename).write_bytes(source)

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
