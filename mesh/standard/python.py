from copy import deepcopy

from mesh.binding.python import Model, Query

class ResultSet(list):
    def __init__(self, status, models, total=None):
        super(ResultSet, self).__init__(models)
        self.status = status
        self.total = total

class Query(Query):
    """A standard resource query."""

    def clone(self, **params):
        """Constructs and returns a clone of this query, applying all of the specified
        keyword parameters to the clone. As a special case, if any of the specified
        parameters have a value of ``None``, that parameter is removed from this query,
        instead of being left in place with a ``None`` value."""

        parameters = self.params.copy()
        for name, value in params.iteritems():
            if value is None and name in parameters:
                del parameters[name]
            else:
                parameters[name] = value
        return type(self)(self.model, **parameters)

    def count(self):
        """Executes this query with ``total`` set to ``True``, so that only the total
        number of resource instances matching this query is returned, and not the full
        result set."""

        params = self.params.copy()
        params['total'] = True

        response = self.model._get_client().execute(self.model._resource, 'query', None, params)
        return response.content.get('total')

    def exclude(self, *fields):
        """Constructs and returns a clone of this query set to exclude one or more
        fields from each resulting resource instance, specified as positional arguments."""

        fields = set(fields)
        if 'exclude' in self.params:
            fields.update(self.params['exclude'])
        return self.clone(exclude=list(fields))

    def fields(self, *fields):
        """Constructs and returns a clone of this query set to return exactly the
        specified fields for each resulting model instance."""

        params = self.params.copy()
        if 'exclude' in params:
            del params['exclude']
        if 'include' in params:
            del params['include']

        params['fields'] = list(fields)
        return type(self)(self.model, **params)

    def filter(self, **params):
        """Constructs and returns a clone of this query set to filter on one or more
        field/value pairs, specified as keyword parameters."""

        if 'query' in self.params:
            query = deepcopy(self.params['query'])
            query.update(params)
        else:
            query = params
        return self.clone(query=query)

    def include(self, *fields):
        """Constructs and returns a clone of this query set to include one or more fields
        on each resulting model instance, specified as positional arguments. Typically
        used to request deferred fields."""

        fields = set(fields)
        if 'include' in self.params:
            fields.update(self.params['include'])
        return self.clone(include=list(fields))

    def limit(self, value):
        """Constructs and returns a clone of this query set to limit the number of
        resulting model instances to no more then ``value``."""

        if self.params.get('limit') == value:
            return self
        return self.clone(limit=value)

    def offset(self, value):
        """Constructs and returns a clone of this query set to return resulting model
        instances at an offset specified by ``value``."""

        if self.params.get('offset') == value:
            return self
        return self.clone(offset=value)

    def one(self):
        return self.limit(1)._execute_query()[0]

    def set(self, **params):
        return self.clone(**params)

    def sort(self, *fields):
        """Constructs and returns a clone of this query set to sort on one or more
        fields, specified as positional arguments. Any sorting already specified on
        this query is replaced."""

        fields = list(fields)
        if self.params.get('sort') == fields:
            return self
        return self.clone(sort=fields)

    def _execute_query(self):
        model = self.model
        response = model._get_client().execute(model._resource, 'query', None, self.params or None)

        models = []
        for resource in response.content.get('resources') or []:
            models.append(model(**resource))

        return ResultSet(response.status, models, response.content.get('total'))

class Model(Model):
    query_class = Query

    @classmethod
    def load(cls, identifiers, attrs=None):
        data = {'identifiers': identifiers}
        if attrs:
            data['attrs'] = attrs

        response = cls._get_client().execute(cls._resource, 'load', None, data)
        return [cls(**resource) for resource in response.content]
