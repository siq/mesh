from bake import *

class GenerateDocs(Task):
    name = 'mesh:docs'
    description = 'generate api documentation for a mesh bundle'
    params = [
        param('mesh.bundle', 'module path of bundle', required=True),
        param('mesh.docroot', 'path to docroot', required=True),
        param('mesh.view', 'view documentation after building', default=False),
    ]

    def run(self, runtime, environment):
        #HACK
        environment['sphinx.sourcedir'] = environment['mesh.docroot']
        docroot = path(environment['mesh.docroot'])
        bundle = import_object(environment['mesh.bundle'])

        from mesh.documentation.generator import DocumentationGenerator
        DocumentationGenerator(docroot).generate(bundle.describe())
        runtime.execute('sphinx:html')

        if environment['mesh.view']:
            self._view_docs(docroot)

    def _view_docs(self, docroot):
        import webbrowser
        webbrowser.open('file://%s' % str(docroot.abspath() / 'html/index.html'))

class GenerateJavascriptBindings(Task):
    name = 'mesh:js'
    description = 'generate javascript bindings for a mesh bundle'
    params = [
        param('mesh.path', 'path to target directory', required=True),
        param('mesh.bundle', 'module path of bundle', required=True),
        param('mesh.mimetype', 'mimetype'),
        param('mesh.templates', 'path to templates'),
        param('mesh.version', 'bundle version', required=True),
    ]

    def run(self, runtime, environment):
        from mesh.binding.javascript import Generator
        generator = Generator(template_dir=environment['mesh.templates'],
            mimetype=environment['mesh.mimetype'])

        bundle = import_object(environment['mesh.bundle'])
        files = generator.generate(bundle, tuple(environment['mesh.version']))

        root = path(environment['mesh.path'])
        if not root.exists():
            root.mkdir()
        if not root.isdir():
            raise TaskError('...')

        for filename, content in files.iteritems():
            (root / filename).write_bytes(content)

class GeneratePythonBindings(Task):
    name = 'mesh:py'
    description = 'generate python bindings for a mesh bundle'
    params = [
        param('mesh.path', 'path to module directory', required=True),
        param('mesh.bundle', 'module path of bundle', required=True),
        param('mesh.version', 'bundle version', required=True),
        param('mesh.separate', 'separate models into individual modules', default=False),
        param('mesh.package', 'package prefix for generated modules'),
    ]

    def run(self, runtime, environment):
        from mesh.binding.python import BindingGenerator
        generator = BindingGenerator(module_path=environment['mesh.package'],
            separate_models=environment['mesh.separate'])

        bundle = import_object(environment['mesh.bundle'])
        files = generator.generate(bundle, tuple(environment['mesh.version']))

        root = path(environment['mesh.path'])
        if not root.isdir():
            raise TaskError('...')

        if root.basename() != bundle.name:
            root /= bundle.name
            root.mkdir_p()

        for token in ('__init__', '__spec__'):
            filename, content = files.pop(token)
            (root / filename).write_bytes(content)

        for token, (filename, content) in files.iteritems():
            filepath = root / filename
            if not filepath.exists():
                filepath.write_bytes(content)       
        
