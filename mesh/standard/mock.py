import json as _json
import os
import sqlite3
from datetime import date, datetime, time
from operator import itemgetter
from time import mktime, strptime

from mesh.standard.controllers import StandardController
from scheme.timezone import LOCAL, UTC

class json(object):
    @classmethod
    def decode(cls, data):
        return _json.loads(data, object_hook=cls._decode_obj)

    @classmethod
    def encode(cls, data):
        return _json.dumps(data, default=cls._encode_obj)

    @classmethod
    def _decode_obj(cls, obj):
        value = obj.get('_')
        if not value:
            return cls._normalize_dict(obj)

        try:
            value = datetime(*strptime(value, '%Y-%m-%dT%H:%M:%SZ')[:6])
        except Exception:
            pass
        else:
            return value.replace(tzinfo=UTC).astimezone(LOCAL)

        try:
            return date(*strptime(value, '%Y-%m-%d')[:3])
        except Exception:
            pass

        try:
            return time(*strptime(value, '%H:%M:%S')[3:6])
        except Exception:
            return cls._normalize_dict(obj)

    @classmethod
    def _encode_obj(cls, obj):
        if isinstance(obj, datetime):
            obj = cls._normalize_datetime(obj)
            return {'_': obj.strftime('%Y-%m-%dT%H:%M:%SZ')}
        elif isinstance(obj, date):
            return {'_': obj.strftime('%Y-%m-%d')}
        elif isinstance(obj, time):
            return {'_': obj.strftime('%H:%M:%S')}
        else:
            raise ValueError()

    @classmethod
    def _normalize_datetime(cls, value):
        if value.tzinfo is not None:
            value = value.astimezone(LOCAL)
        else:
            value = value.replace(tzinfo=LOCAL)
        return value.astimezone(UTC)

    @classmethod
    def _normalize_dict(cls, value):
        return dict((str(k), v) for k, v in value.iteritems())

class MockStorage(object):
    DDL = 'create table if not exists %s (id integer primary key, data text)'
    DELETE = 'delete from %s where id = ?'
    GET = 'select id, data from %s where id = ?'
    INSERT = 'insert into %s (data) values (?)'
    QUERY = 'select id, data from %s order by id'
    UPDATE = 'update %s set data = ? where id = ?'

    def __init__(self, path, fresh=False):
        self.path = path
        self.tables = set()
        if fresh:
            self.reset()
        else:
            self.connection = sqlite3.connect(path)

    def delete(self, name, id):
        self._create_table(name)
        self.connection.execute(self.DELETE % name, (id,))
        self.connection.commit()

    def get(self, name, id):
        self._create_table(name)
        cursor = self.connection.execute(self.GET % name, (id,))
        try:
            return self._create_resource(next(cursor))
        except StopIteration:
            return None

    def query(self, name):
        self._create_table(name)
        resources = []
        for row in self.connection.execute(self.QUERY % name):
            resources.append(self._create_resource(row))
        return resources

    def reset(self):
        self.connection.close()
        self.tables = set()
        if self.path != ':memory:':
            os.unlink(self.path)
        self.connection = sqlite3.connect(self.path)

    def save(self, name, data):
        id = data.get('id', None)
        data = json.encode(data)

        self._create_table(name)
        if id:
            self.connection.execute(self.UPDATE % name, (data, id))
            self.connection.commit()
            return id
        else:
            cursor = self.connection.cursor()
            try:
                cursor.execute(self.INSERT % name, (data,))
                self.connection.commit()
                return cursor.lastrowid
            finally:
                cursor.close()

    def _create_resource(self, row):
        resource = json.decode(row[1])
        resource['id'] = row[0]
        return resource

    def _create_table(self, name):
        if name not in self.tables:
            self.connection.execute(self.DDL % name)
            self.tables.add(name)

class MockController(StandardController):
    @classmethod
    def acquire(cls, subject):
        try:
            subject = int(subject)
        except ValueError:
            return None
        else:
            return cls.storage.get(cls.resource.name, subject)

    def query(self, context, response, subject, data):
        data = data or {}
        resources = self.storage.query(self.resource.name)

        total = len(resources)
        if data.get('total'):
            return {'total': total}

        sorting = data.get('sort')
        if sorting:
            resources = self._sort_resources(resources, sorting)

        offset = data.get('offset')
        if offset is not None:
            resources = resources[offset:]

        limit = data.get('limit')
        if limit is not None:
            resources = resources[:limit]

        resources = [self._prepare_resource(item, data) for item in resources]
        return {'resources': resources, 'total': total}

    def get(self, context, response, subject, data):
        response(self._prepare_resource(subject, data or {}))

    def create(self, context, response, subject, data):
        id = self.storage.save(self.resource.name, data)
        response({'id': id})

    def update(self, context, response, subject, data):
        subject.update(data)
        self.storage.save(self.resource.name, subject)
        response({'id': subject['id']})

    def delete(self, context, response, subject, data):
        self.storage.delete(self.resource.name, subject['id'])
        response({'id': subject['id']})

    def _prepare_resource(self, subject, data):
        include = data.get('include') or []
        exclude = data.get('exclude') or []

        resource = {}
        for name, value in subject.iteritems():
            field = self.resource.schema[name]
            if field.is_identifier:
                resource[name] = value
            elif name not in exclude:
                if not (field.deferred and name not in include):
                    resource[name] = value

        return resource

    def _sort_resources(self, resources, sorting):
        comparators = []
        for field in sorting:
            delta = 1
            if field[-1] in ('+', '-'):
                if field[-1] == '-':
                    delta = -1
                field = field[:-1]
            comparators.append((itemgetter(field), delta))

        def compare(left, right):
            for getter, delta in comparators:
                result = cmp(getter(left), getter(right))
                if result:
                    return result * delta
            return 0

        return sorted(resources, cmp=compare)
