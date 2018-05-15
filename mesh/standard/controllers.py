from mesh.constants import OK, DELETE, POST, PUT
from mesh.resource import *
from scheme.timezone import current_timestamp
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
    
    def _prepare_audit_data(self, method, status, resource_data, audit_data):
        raise NotImplementedError
    
    def send_audit_data(self, request, response, subject, data):

        import datetime
        import time
        import uuid
        
        event_detail = {}
        event_payload = {}
        resource_data = data or {}
        
        ts1 = current_timestamp().strftime('%Y-%m-%dT%H:%M:%SZ')
        ts2 = datetime.datetime.utcfromtimestamp(time.time()).strftime('%Y-%m-%dT%H:%M:%SZ')
        _debug('timestamp string using scheme.current_timestamp',ts1)
        _debug('timestamp string using date and time functions',ts2)
        
        audit_data = {
            'event_date': ts1,
            'event_detail': event_detail,
            'event_payload': event_payload,
        }
        
        # check whether the correlation id is given as part of the data
        # if so, use it for this audit call, too, if not, create a new one
        correlation_id = str(uuid.uuid4())
        if not resource_data is None:
            event_payload.update(resource_data)
            if 'correlation_id' in resource_data:
                correlation_id = resource_data.pop('correlation_id')
            
        audit_data['correlation_id']= correlation_id
        
        # extract audit relevant details
        actor_id = request.context.get('user-id', '')
        method = request.headers['REQUEST_METHOD']
        origin = request.headers['HTTP_X_SPIRE_X_FORWARDED_FOR']
        status = response.status or OK
        
        if method == DELETE:
            delsubj = self.acquire(request.subject)
            resource_data = delsubj.extract_dict()
        
        if method == POST and not subject is None:
            # a POST request passing the subject's id, should normally rather be a PUT request
            # so translate that, accordingly
            method = PUT
                
        if subject is None:
            if status == OK:
                resource_data['id'] = response.content.get('id','')
            else:
                resource_data['id'] = ''
        else:
            resource_data['id'] = subject.id
             
        audit_data['actor_id'] = actor_id
        audit_data['origin'] = origin
        if status == OK:
            audit_data['result'] = 'SUCCESS'
        else:
            audit_data['result'] = 'FAILED'


        _debug('+send_audit_data - request actor', str(actor_id))        
        _debug('+send_audit_data - request method', method)        
        _debug('+send_audit_data - response status', status)
        _debug('+send_audit_data - subject id', resource_data['id'])        
        self._prepare_audit_data(method, status, resource_data, audit_data)
        _debug('+send_audit_data - audit record', format_structure(audit_data))        
        
        # insert rest call to SIQ Audit here!
        # assume that failure to create/write the audit event will throw an exception
        # which we'll deliberately NOT catch, here!
        
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

