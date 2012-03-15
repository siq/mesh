from bake import *
from mesh.documentation.generator import DocumentationGenerator
from mesh.binding.python import BindingGenerator

class GenerateDocs(Task):
    name = 'mesh:docs'
    description = 'generate api documentation for a mesh bundle'
    params = [
        param('mesh.bundle', 'module path of bundle', required=True),
        param('mesh.docroot', 'path to docroot', required=True),
    ]

    def run(self, runtime, environment):
        docroot = path(environment['mesh.docroot'])
        if not docroot.exists():
            raise TaskError("docroot '%s' does not exist" % docroot)

        bundle = import_object(environment['mesh.bundle'])
        DocumentationGenerator(docroot).generate(bundle.describe())

class GeneratePythonBindings(Task):
    name = 'mesh:py'
    description = 'generate python bindings for a mesh bundle'
    params = [
        param('mesh.path', 'path to module directory', required=True),
        param('mesh.bundle', 'module path of bundle', required=True),
        param('mesh.version', 'bundle version', required=True),
        param('mesh.separate', 'separate models into individual modules', default=False),
        param('mesh.package', 'package prefix for generated modules'),
        param('mesh.pathprefix', 'path prefix'),
    ]

    def run(self, runtime, environment):
        generator = BindingGenerator(path_prefix=environment['mesh.pathprefix'],
            module_path=environment['mesh.package'],
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
        
