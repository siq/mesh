from spire.core import Unit
from mesh.exceptions import GoneError
from mesh.resource import Controller

__all__ = ('StandardController', 'ProxyController', 'parse_attr_mapping',)


class StandardController(Controller):
    """The standard controller."""

    def _prune_resource(self, resource, data, _empty=[]):
        if not data:
            return resource

        include = data.get('include') or _empty
        exclude = data.get('exclude') or _empty

        if not (include or exclude):
            return resource

        pruned = {}
        for name, value in resource.iteritems():
            field = self.resource.schema[name]
            if field.is_identifier:
                pruned[name] = value
            elif name not in exclude:
                if not (field.deferred and name not in include):
                    pruned[name] = value

        return pruned


def parse_attr_mapping(mapping):
    if isinstance(mapping, basestring):
        mapping = mapping.split(' ')
    if isinstance(mapping, (list, tuple)):
        pairs = {}
        for pair in mapping:
            if isinstance(pair, (list, tuple)):
                pairs[pair[0]] = pair[1]
            else:
                pairs[pair] = pair
        mapping = pairs
    return mapping


class ProxyController(Unit, StandardController):
    """A mesh controller for mesh proxy models."""
    proxy_model = None
    mapping = None

    @classmethod
    def __construct__(cls):
        StandardController.__construct__()
        if cls.resource:
            mapping = cls.mapping
            if mapping is None:
                mapping = cls.resource.filter_schema.keys()
            cls.mapping = parse_attr_mapping(mapping)

            cls.id_field = cls.resource.id_field

    def acquire(self, subject):
        try:
            return self.proxy_model.get(subject)
        except GoneError:
            return None

    def create(self, request, response, subject, data):
        proxy_model = self._construct_proxy_model(data)
        self._annotate_proxy_model(request, proxy_model, data)
        subject = self.proxy_model.create(proxy_model)
        id_field = self.id_field
        response({id_field: self._get_proxy_model_value(subject, id_field)})

    def delete(self, request, response, subject, data):
        subject.destroy()
        id_field = self.id_field
        response({id_field: self._get_proxy_model_value(subject, id_field)})

    def get(self, request, response, subject, data):
        resource = self._construct_resource(request, subject, data)
        self._annotate_resource(request, resource, subject, data)
        response(self._prune_resource(resource, data))

    def put(self, request, response, subject, data):
        if subject:
            self.update(request, response, subject, data)
        else:
            data[self.id_field] = request.subject
            self.create(request, response, subject, data)

    def query(self, request, response, subject, data):
        data = data or {}
        if 'query' in data:
            data['query'] = self._construct_filter(data['query'])

        try:
            query_results = self.proxy_model.query(**data).all()
        except GoneError:
            query_results = []

        resources = []
        for result in query_results:
            resource = self._construct_resource(request, result, data)
            self._annotate_resource(request, resource, result, data)
            if resource is False:
                continue
            resources.append(self._prune_resource(resource, data))

        response({'resources': resources, 'total': len(resources)})

    def update(self, request, response, subject, data):
        if data:
            proxy_data = self._construct_proxy_model(data)
            self._annotate_proxy_model(request, proxy_data, data)
            subject.update(proxy_data)
        id_field = self.id_field
        response({id_field: self._get_proxy_model_value(subject, id_field)})

    def _construct_filter(self, filters):
        mapping = self.mapping
        subject_filters = {}
        for filter_operand, value in filters.iteritems():
            filter_operands = filter_operand.rsplit('__', 1)
            filter_operands[0] = mapping[filter_operands[0]]
            subject_filters['__'.join(filter_operands)] = value

        return subject_filters

    def _construct_resource(self, request, subject, data):
        resource = {}
        for res_field, proxy_field in self.mapping.iteritems():
            try:
                resource[res_field] = getattr(subject, proxy_field)
            except AttributeError:
                continue
        return resource

    def _construct_proxy_model(self, data):
        subject = {}
        mapping = self.mapping
        for field, value in data.iteritems():
            subject_field = mapping[field]
            subject[subject_field] = value
        return subject

    def _get_proxy_model_value(self, subject, field):
        model_field = self.mapping[field]
        return getattr(subject, model_field)

    def _annotate_resource(self, request, resource, proxy_model, data):
        pass

    def _annotate_proxy_model(self, request, proxy_data, data):
        pass
