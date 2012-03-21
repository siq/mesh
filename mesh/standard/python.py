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
        parameters = self.params.copy()
        for name, value in params.iteritems():
            if value is None and name in parameters:
                del parameters[name]
            else:
                parameters[name] = value
        return type(self)(self.model, **parameters)

    def count(self):
        params = self.params.copy()
        params['total'] = True

        response = self.model._get_client().execute(self.model._name, 'query', None, params)
        return response.content.get('total')

    def exclude(self, *fields):
        fields = set(fields)
        if 'exclude' in self.params:
            fields.update(self.params['exclude'])
        return self.clone(exclude=list(fields))

    def filter(self, **params):
        if 'query' in self.params:
            query = deepcopy(self.params['query'])
        else:
            query = {}

        for name, value in params.iteritems():
            if '__' in name:
                name, operator = name.rsplit('__', 1)
                if name in query and isinstance(query[name], dict):
                    query[name]['$' + operator] = value
                else:
                    query[name] = {'$' + operator: value}
            else:
                query[name] = value

        return self.clone(query=query)

    def include(self, *fields):
        fields = set(fields)
        if 'include' in self.params:
            fields.update(self.params['include'])
        return self.clone(include=list(fields))

    def limit(self, value):
        if self.params.get('limit') == value:
            return self
        return self.clone(limit=value)

    def offset(self, value):
        if self.params.get('offset') == value:
            return self
        return self.clone(offset=value)

    def one(self):
        return self.limit(1)._execute_query()[0]

    def sort(self, *fields):
        fields = list(fields)
        if self.params.get('sort') == fields:
            return self
        return self.clone(sort=fields)

    def _execute_query(self):
        model = self.model
        response = model._get_client().execute(model._name, 'query', None, self.params or None)

        models = []
        for resource in response.content.get('resources') or []:
            models.append(model(**resource))

        return ResultSet(response.status, models, response.content.get('total'))

class Model(Model):
    query_class = Query
