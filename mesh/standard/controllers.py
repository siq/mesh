from mesh.resource import *
from scheme.util import format_structure

__all__ = ('StandardController',)

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

    def validate_request(self, request, response):
        return True

    def needs_audit(self, request):
        return False
    
    def _prepare_audit_data(self, method, status, data, audit_data):
        raise NotImplementedError
    
    def send_audit_data(self, request, response, data):

        import datetime
        import time
        import uuid
        
        event_detail = {}
        event_payload = {}
        
        audit_data = {
            'event_date': datetime.datetime.utcfromtimestamp(time.time()).strftime('%Y-%m-%dT%H:%M:%SZ'),
            'event_detail': event_detail,
            'event_payload': event_payload,
        }
        
        # check whether the correlation id is given as part of the data
        # if so, use it for this audit call, too, if not, create a new one
        if 'correlation_id' in data:
            correlation_id = data.pop('correlation_id')
        else:
            correlation_id = str(uuid.uuid4())
            
        audit_data['correlation_id']= correlation_id
        
        # extract actor id details
        actor_id = request.context.get('user-id', '')
        method = request.headers['REQUEST_METHOD']
        status = response.status
    
        _debug('+send_audit_data - data before preparation in controller', format_structure(data))        
        self._prepare_audit_data(method, status, data, audit_data)
        _debug('+send_audit_data - data after preparation in controller', format_structure(data))        
        
        # insert rest call to SIQ Audit here!
        
        return correlation_id
    

def _debug(msg, obj=None, includeStackTrace=False):
    import datetime
    import inspect
    import traceback
    frame = inspect.currentframe()
    fileName  =  frame.f_code.co_filename
    line = ' [%s] %s' % (fileName, msg)
    if obj != None:
        line += ': ' + str(obj)
    print 'DEBUG:' + line
    if includeStackTrace:
        print 'STACK' + ':' * 75
        for s in traceback.format_stack():
            print(s.strip())
        print ':' * 80
    with open('/tmp/_debug_','a') as fout:
        fout.write(str(datetime.datetime.now().time()) + line + '\n')
        if includeStackTrace:
            fout.write('STACK:\n')
            for s in traceback.format_stack():
                fout.write('  ' + s.strip() + '\n')
        fout.flush()

