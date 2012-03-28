'''Simple mock storage enging for a Mesh blog prototype'''

from collections import defaultdict

class Storage:
    _store = defaultdict(set)
    _id = 0
    _table_map = dict()

    def next_id(self):
        return self._id

    def put_new(self, obj, table):
        obj['id'] = _id = self.next_id()
        self._store[_id] = obj
        self._id += 1
        self._store[table].add(_id)
        self._table_map[_id] = self._store[table]
        return _id

    def __getitem__(self, obj):
        _id = obj['id'] if isinstance(obj, dict) else obj
        return self._store[_id]

    def __delitem__(self, obj):
        _id = obj['id']
        del self._store[_id]
        self._table_map[_id].remove(_id)
        del self._table_map[_id]

    def __len__(self):
        return len(self._store)

    def clear(self):
        self._store.clear()
        self._table_cache.clear()
        self._table_map.clear()

storage = Storage()
