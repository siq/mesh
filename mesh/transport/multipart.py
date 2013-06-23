import os
from cgi import parse_header
from tempfile import mkstemp

from scheme.util import set_nested_value, traverse_to_key

try:
    import uuid
    def generate_boundary():
        return str(uuid.uuid4()).replace('-', '')
except ImportError:
    pass

NEWLINE = '\r\n'

class MultipartFile(object):
    def __init__(self, name, filename):
        self.name = name
        self.filename = filename

class MultipartPayload(object):
    def __init__(self, payload=None, mimetype=None):
        self.files = {}
        self.mimetype = mimetype
        self.payload = payload

    def attach(self, name, filename):
        self.files[name] = MultipartFile(name, filename)
        return self

    def serialize(self, format):
        return format.serialize(self.payload)

    def unserialize(self, formats):
        data = formats[self.mimetype].unserialize(self.payload)
        for name, multipart_file in self.files.iteritems():
            set_nested_value(data, name, multipart_file)
        return data

def noisy(function):
    def wrapped(*a, **p):
        retval = function(*a, **p)
        print '%s: %s' % (function.__name__, retval)
        return retval
    return wrapped

class BufferedStream(object):
    def __init__(self, stream):
        self.buffer = ''
        self.stream = stream

    def chomp(self, size):
        buffer = self.buffer
        if not buffer and not self.stream:
            raise ValueError()

        length = len(buffer)
        if length < size:
            chunk = self.stream.read(size - length)
            if chunk:
                buffer += chunk
            else:
                raise ValueError()

        self.buffer = buffer[size:]

    def read(self, chunksize, boundary=None):
        buffer = self.buffer
        if not buffer and not self.stream:
            return ''

        length = len(buffer)
        if self.stream and length < chunksize:
            chunk = self.stream.read(chunksize - length)
            if chunk:
                buffer += chunk
            else:
                self.stream = None

        if boundary:
            offset = buffer.find(boundary)
            if offset >= 0:
                self.buffer = buffer[offset:]
                buffer = buffer[:offset]
            else:
                length = len(boundary)
                self.buffer = buffer[-length:]
                buffer = buffer[:-length]
        else:
            self.buffer = ''

        return buffer

    def readline(self):
        buffer = self.buffer
        if not buffer:
            if self.stream:
                return self.stream.readline()
            else:
                return ''

        offset = buffer.find(NEWLINE)
        if offset >= 0:
            offset += 2
            self.buffer = buffer[offset:]
            return buffer[:offset]

        self.buffer = ''
        return buffer + self.stream.readline()

def parse_multipart_mixed(stream, mimetype, chunksize=1024*1024):
    mimetype, params = parse_header(mimetype)
    if 'boundary' in params:
        boundary = '--' + params['boundary']
    else:
        raise ValueError()

    stream = BufferedStream(stream)
    payload = MultipartPayload()

    while True:
        delimiter = stream.readline()
        if delimiter:
            delimiter = delimiter.rstrip(NEWLINE)
            if delimiter == boundary + '--':
                break
            elif delimiter != boundary:
                raise ValueError(delimiter)
        else:
            raise ValueError(delimiter)

        headers = _parse_content_headers(stream)
        if 'Content-Disposition' in headers:
            disposition, params = headers['Content-Disposition']
            if disposition == 'inline':
                if payload.payload:
                    raise ValueError('already have payload')
                if 'Content-Type' in headers:
                    payload.mimetype, _ = headers['Content-Type']
                    payload.payload = _parse_inline_data(stream, chunksize, boundary)
                else:
                    raise ValueError('missing content-type')
            elif disposition == 'attachment':
                if 'name' in params:
                    name = params['name']
                    filename = _parse_attachment_data(stream, chunksize, boundary)
                    payload.files[name] = MultipartFile(name, filename)
                else:
                    raise ValueError('missing attachment name')
            else:
                raise ValueError(disposition)
        else:
            raise ValueError(headers)

    return payload

def _parse_attachment_data(stream, chunksize, boundary):
    boundary = NEWLINE + boundary
    handle, filename = mkstemp()

    try:
        while True:
            chunk = stream.read(chunksize, boundary)
            if chunk:
                os.write(handle, chunk)
            else:
                break
    finally:
        os.close(handle)

    stream.chomp(2)
    return filename

def _parse_content_headers(stream):
    headers = {}

    line = ''
    while True:
        line = stream.readline()
        if not line:
            raise ValueError()
        line = line.rstrip(NEWLINE)
        if line:
            break

    while True:
        chunk = stream.readline()
        if not chunk:
            raise ValueError()

        chunk = chunk.rstrip(NEWLINE)
        if chunk and chunk[0] in '\t ':
            if line:
                line = '%s %s' % (line, chunk.lstrip())
                continue
            else:
                raise ValueError()

        if line:
            key, value = line.split(':', 1)
            headers[key] = parse_header(value)

        if chunk:
            line = chunk
        else:
            break

    return headers

def _parse_inline_data(stream, chunksize, boundary):
    boundary = NEWLINE + boundary
    data = []

    while True:
        chunk = stream.read(chunksize, boundary)
        if chunk:
            data.append(chunk)
        else:
            break

    stream.chomp(2)
    return ''.join(data)

class MultipartEncoder(object):
    def __init__(self, payload, format):
        boundary = generate_boundary()
        self.boundary = '--' + boundary

        data = payload.serialize(format)
        self.segments = ['%s\r\nContent-Disposition: inline\r\n'
            'Content-Type: %s\r\n\r\n%s'
            % (self.boundary, format.mimetype, data)]

        for name, file in payload.files.iteritems():
            self.segments.append('\r\n%s\r\nContent-Disposition: attachment; name="%s"\r\n\r\n'
                % (self.boundary, name))
            self.segments.append(file)
        else:
            self.segments.append('\r\n%s--\r\n' % self.boundary)

        length = 0
        for segment in self.segments:
            if isinstance(segment, MultipartFile):
                length += os.stat(segment.filename).st_size
            else:
                length += len(segment)

        self.openfile = None
        self.headers = {
            'Content-Type': 'multipart/mixed; boundary=%s' % boundary,
            'Content-Length': str(length),
        }

    def next_chunk(self, chunksize, chunk=''):
        if self.openfile:
            data = self.openfile.read(chunksize - len(chunk))
            if data:
                chunk += data
            else:
                self.openfile.close()
                self.openfile = None

        if len(chunk) >= chunksize:
            return chunk
        if not self.segments:
            return chunk

        segment = self.segments.pop(0)
        if isinstance(segment, basestring):
            chunk += segment
            if len(chunk) >= chunksize:
                return chunk
            else:
                return self.next_chunk(chunksize, chunk)
        
        self.openfile = open(segment.filename)
        return self.next_chunk(chunksize, chunk)
