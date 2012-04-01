from bake import *
from scheme import *
from scheme.supplemental import ObjectReference

class GenerateDocs(Task):
    name = 'mesh.docs'
    description = 'generate api documentation for a mesh bundle'
    parameters = {
        'bundle': ObjectReference(description='module path of bundle', required=True),
        'docroot': Path(description='path to docroot', required=True),
        'view': Boolean(description='view documentation after build', default=False),
    }

    def run(self, runtime):
        from mesh.documentation.generator import DocumentationGenerator
        DocumentationGenerator(self['docroot']).generate(self['bundle'].describe())
        runtime.execute('sphinx.html', sourcedir=self['docroot'], view=self['view'])

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
            root.mkdir()
        if not root.isdir():
            raise TaskError('...')

        for filename, content in files.iteritems():
            (root / filename).write_bytes(content)

class GeneratePythonBindings(Task):
    name = 'mesh.python'
    description = 'generate python bindings for a mesh bundle'
    parameters = {
        'bundle': ObjectReference(description='module path of bundle', required=True),
        'package': Text(description='package prefix for generated modules'),
        'path': Path(description='path to target directory', required=True),
        'separate': Boolean(description='separate models into individual modules', default=False),
        'version': Tuple((Integer(), Integer()), description='version to build', required=True),
    }

    def run(self, runtime):
        from mesh.binding.python import BindingGenerator
        generator = BindingGenerator(module_path=self['package'], separate_models=self['separate'])
        files = generator.generate(self['bundle'], self['version'])

        root = self['path']
        if not root.isdir():
            raise TaskError('...')

        bundle = self['bundle']
        if root.basename() != bundle.name:
            root /= bundle.name
            root.mkdir_p()

        for token, (filename, content) in files.iteritems():
            filepath = root / filename
            if token in ('__init__', '__spec__') or not filepath.exists():
                filepath.write_bytes(content)

class StartWsgiServer(Task):
    name = 'mesh.wsgi'
    description = 'runs a wsgi test server for a mesh bundle'
    parameters = {
        'bundle': ObjectReference(description='module path of bundle', required=True),
        'hostname': Text(description='hostname', required=True),
    }

    def run(self, runtime):
        from wsgiref.simple_server import make_server
        from mesh.transport.http import WsgiServer

        application = WsgiServer([self['bundle']])
        hostname, port = self['hostname'].split(':')
        make_server(hostname, int(port), application).server_forever()
