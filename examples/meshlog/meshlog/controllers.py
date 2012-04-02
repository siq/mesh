from collections import defaultdict
from mesh.standard import *
from resources import *
from storage import storage

class MeshlogController(Controller):

    @classmethod
    def acquire(cls, subject):
        try:
            return storage[int(subject)]
        except ValueError:
            return None
   
    def create(self, context, response, subject, data):
        data['id'] = _id = storage.put_new(data, self.resource)
        return response(dict(id=_id))

    def update(self, context, response, subject, data):
        for key in data:
            subject[key] = data[key]

    def delete(self, context, response, subject, data):
        del storage[subject]

    def get(self, context, response, subject, data):
        return response(subject)

class BlogController(MeshlogController):
    '''Controller for the :class:`Blog` resource'''

    resource = Blog
    version = (1, 0)

    def create(self, context, response, subject, data):
        data['id'] = _id = storage.put_new(data, self.resource)
        data['posts'] = list()
        return response(dict(id=_id))

    def query(self, context, response, subject, data):
        blog_lst = []
        query_val = data['query']['title__contains']
        for blog_id in storage[self.resource]:
            blog = storage[blog_id]
            if query_val in blog['title']:
                blog_lst.append(blog)
        return response({'resources':blog_lst, 'total':len(blog_lst)})

class PostController(MeshlogController):
    '''Controller for the :class:`Post` resource'''

    resource = Post
    version = (1, 0)

    def create(self, context, response, subject, data):
        data['id'] = _id = storage.put_new(data, self.resource)
        storage[data['blog']]['posts'].append(_id)

    def query(self, context, response, subject, data):
        query = data['query']
        if 'blog' in query:
            posts = [storage[_k] for _k in storage[query['blog']]['posts']]
        else:
            posts = storage[self.resource]

        if 'title' in query:
            posts = filter(lambda p:query['title__contains'] in p['title'], posts)

        if 'author' in query:
            posts = filter(lambda p:query['author'] == p['author'], posts)

        return response({'resources':posts, 'total':len(posts)})
        
        
