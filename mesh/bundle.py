from mesh.exceptions import *
from mesh.resource import Controller
from mesh.util import LogHelper, import_object
from scheme.fields import Field

__all__ = ('Bundle', 'Specification', 'mount')

log = LogHelper(__name__)

def format_version(version):
    if isinstance(version, basestring):
        return version
    return '%d.%d' % version

def parse_version(version, silent=False):
    if not isinstance(version, basestring):
        return version

    try:
        major, minor = version.split('.')
        return (int(major), int(minor))
    except Exception:
        if silent:
            return version
        else:
            raise

class mount(object):
    """A resource mount."""

    def __init__(self, resource, controller=None, min_version=None, max_version=None):
        self.controller = controller
        self.max_version = max_version
        self.min_version = min_version
        self.resource = resource

    def __repr__(self):
        return 'mount(%r, %r)' % (self.resource.name, identify_class(self.controller))

    def clone(self):
        return mount(self.resource, self.controller, self.min_version, self.max_version)

    def construct(self, bundle):
        """Constructs this mount for ``bundle``."""

        resource = self.resource
        if isinstance(resource, basestring):
            resource = self.resource = import_object(resource, True)
        if not resource:
            return False

        controller = self.controller
        if isinstance(controller, basestring):
            try:
                controller = import_object(controller)
            except Exception:
                log('exception', 'failed to import %r for %r', controller, bundle.name)
                controller = None
        if not controller:
            controller = resource.configuration.create_controller(resource)

        self.controller = controller
        self.min_version = self._validate_version(resource, controller, self.min_version, 'minimum_version')
        self.max_version = self._validate_version(resource, controller, self.max_version, 'maximum_version')

        self.versions = []
        for candidate in controller.versions.keys():
            if candidate >= self.min_version and candidate <= self.max_version:
                self.versions.append(candidate)

        self.versions.sort()
        return True

    def get(self, version):
        """Get the resource/controller pair for ``version``."""

        for candidate in reversed(self.versions):
            if version >= candidate:
                controller = self.controller.versions[candidate]
                return controller.resource.name, (controller.resource, controller)

    def _validate_version(self, resource, controller, value, attr):
        if value is not None:
            if isinstance(value, tuple) and len(value) == 2:
                if controller:
                    if value in controller.versions:
                        return value
                    else:
                        raise SpecificationError()
                elif value[0] in resource.versions and value[1] == 0:
                    return value
                else:
                    raise SpecificationError()
            else:
                raise SpecificationError()
        elif controller:
            return getattr(controller, attr)
        else:
            return (getattr(resource, attr), 0)

class recursive_mount(mount):
    """A recursive mount."""

    def __init__(self, bundles):
        self.bundles = bundles

    def clone(self):
        return recursive_mount(self.bundles)

    def construct(self, bundle):
        self.versions = sorted(self.bundles.keys())
        return True

    def get(self, version):
        for candidate in reversed(self.versions):
            if version >= candidate:
                bundle = self.bundles[candidate]
                return bundle.name, bundle.versions

class Bundle(object):
    """A bundle of resources."""

    def __init__(self, name, *mounts, **params):
        self.description = params.get('description', None)
        self.name = name
        self.ordering = None
        self.versions = None

        self.mounts = []
        if mounts:
            self.attach(mounts)

    def attach(self, mounts):
        """Attaches ``mounts`` to this ``bundle``."""

        for mount in mounts:
            if mount.construct(self):
                self.mounts.append(mount)

        if self.mounts:
            self._collate_mounts()

    def clone(self, name=None, callback=None):
        mounts = []
        for mount in self.mounts:
            mount = mount.clone()
            if callback:
                mount = callback(mount)
                if mount:
                    mounts.append(mount)

        name = name or self.name
        return Bundle(name, *mounts)

    def describe(self, targets=None):
        description = {'__version__': 1, 'name': self.name, 'versions': {}}
        if self.description:
            description['description'] = description

        for version, resources in sorted(self.versions.iteritems()):
            formatted_version = format_version(version)
            description['versions'][formatted_version] = self._describe_version(version, resources,
                [self.name, formatted_version], targets)

        return description

    def _describe_version(self, version, resources, path, targets=None):
        description = {}
        for name, candidate in resources.iteritems():
            if targets and name not in targets:
                continue
            if isinstance(candidate, dict):
                bundle = description[name] = {'__subject__': 'bundle', 'name': name, 'versions': {}}
                for subversion, subresources in candidate.iteritems():
                    formatted_subversion = format_version(subversion)
                    bundle['versions'][formatted_subversion] = self._describe_version(subversion,
                        subresources, path + [name, formatted_subversion])
            else:
                resource, controller = candidate
                description[name] = resource.describe(controller, path)

        return description

    def slice(self, version=None, min_version=None, max_version=None):
        versions = self.versions
        if version is not None:
            if version in self.versions:
                return [version]
            else:
                return []

        versions = sorted(versions.keys())
        if min_version is not None:
            i = 0
            try:
                while versions[i] < min_version:
                    versions = versions[1:]
                    i += 1
            except IndexError:
                return versions

        if max_version is not None:
            i = len(versions) - 1
            try:
                while versions[i] > max_version:
                    versions = versions[:-1]
                    i -= 1
            except IndexError:
                return versions

        return versions

    def specify(self):
        return Specification(self.describe())

    def _collate_mounts(self):
        ordering = set()
        for mount in self.mounts:
            ordering.update(mount.versions)

        self.ordering = sorted(ordering)
        self.versions = dict()

        for mount in self.mounts:
            for version in self.ordering:
                contribution = mount.get(version)
                if contribution:
                    name, contribution = contribution
                    if version not in self.versions:
                        self.versions[version] = {name: contribution}
                    elif name not in self.versions[version]:
                        self.versions[version][name] = contribution
                    else:
                        raise SpecificationError()

class Specification(object):
    """A bundle specification for a particular version."""

    def __init__(self, description):
        self.cache = {}
        self.description = description.get('description')
        self.name = description['name']

        self.versions = {}
        for version, resources in description['versions'].iteritems():
            self.versions[parse_version(version)] = resources
            for resource in resources.itervalues():
                if resource['__subject__'] == 'bundle':
                    self._parse_bundle(resource)
                elif resource['__subject__'] == 'resource':
                    self._parse_resource(resource)

    def __repr__(self):
        return 'Specification(name=%r)' % self.name

    def find(self, path):
        if isinstance(path, basestring):
            path = tuple(parse_version(v, True) for v in path.strip('/').split('/'))

        try:
            return self.cache[path]
        except KeyError:
            pass

        if path[0] != self.name:
            raise KeyError(path)

        if len(path) == 2:
            version = path[1]
            if version in self.versions:
                bundle = self.cache[path] = self.versions[version]
                return bundle
            else:
                raise KeyError(path)

        version, name = path[1], path[2]
        if version in self.versions and name in self.versions[version]:
            resource = self.versions[version][name]
        else:
            raise KeyError(path)

        if resource['__subject__'] == 'bundle':
            version = path[3]
            if len(path) == 4:
                if version in resource['versions']:
                    bundle = self.cache[path] = resource['versions'][version]
                    return bundle
                else:
                    raise KeyError(path)
            else:
                name = path[4]
                if version in resource['versions'] and name in resource['versions'][version]:
                    resource = resources['versions'][version][name]
                else:
                    raise KeyError(path)

        self.cache[path] = resource
        return resource

    def _parse_bundle(self, bundle):
        versions = {}
        for version, resources in bundle['versions'].iteritems():
            versions[parse_version(version)] = resources
            for resource in resources.itervalues():
                self._parse_resource(resource)

        bundle['versions'] = versions

    def _parse_resource(self, resource):
        schema = resource.get('schema')
        if isinstance(schema, dict):
            for name, field in schema.items():
                schema[name] = Field.reconstruct(field)

        requests = resource.get('requests')
        if isinstance(requests, dict):
            for request in requests.itervalues():
                request['schema'] = Field.reconstruct(request['schema'])
                for response in request['responses'].itervalues():
                    response['schema'] = Field.reconstruct(response['schema'])
