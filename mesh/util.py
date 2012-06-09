import logging
import os
import re
import sys
from datetime import datetime
from inspect import getargspec
from types import ClassType
from uuid import uuid4

def call_with_supported_params(callable, *args, **params):
    arguments = getargspec(callable)[0]
    for key in params.keys():
        if key not in arguments:
            del params[key]
    return callable(*args, **params)

def construct_all_list(namespace, cls):
    all = []
    for name, value in namespace.items():
        if isinstance(value, (ClassType, type)) and issubclass(value, cls):
            all.append(name)
    return all

def format_url_path(*segments):
    return '/' + '/'.join(segment.strip('/') for segment in segments)

def get_package_data(module, path):
    openfile = open(get_package_path(module, path))
    try:
        return openfile.read()
    finally:
        openfile.close()

def get_package_path(module, path):
    if isinstance(module, basestring):
        module = __import__(module, None, None, [module.split('.')[-1]])
    if not isinstance(module, list):
        module = module.__path__

    modulepath = module[0]
    for prefix in sys.path:
        if prefix in ('', '..'):
            prefix = os.getcwd()
        fullpath = os.path.abspath(os.path.join(prefix, modulepath))
        if os.path.exists(fullpath):
            break
    else:
        return None

    return os.path.join(fullpath, path)

def identify_class(cls):
    return '%s.%s' % (cls.__module__, cls.__name__)

def import_object(path, ignore_errors=False, report_errors=False):
    try:
        module, attr = path.rsplit('.', 1)
        return getattr(__import__(module, None, None, (attr,)), attr)
    except Exception:
        if not ignore_errors:
            raise

class LogFormatter(logging.Formatter):
    def __init__(self, format='%(timestamp)s %(name)s %(levelname)s %(message)s'):
        logging.Formatter.__init__(self, format)

    def format(self, record):
        record.timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        return logging.Formatter.format(self, record)

class LogHelper(object):
    LEVELS = {
        'debug': logging.DEBUG,
        'info': logging.INFO,
        'warning': logging.WARNING,
        'error': logging.ERROR,
        'critical': logging.CRITICAL,
    }

    def __init__(self, logger):
        if isinstance(logger, basestring):
            logger = logging.getLogger(logger)
        self.logger = logger

    def __call__(self, level, message, *args):
        self.logger.log(self.LEVELS[level], message, *args)

def minimize_string(value):
    return re.sub(r'\s+', ' ', value).strip(' ')

def pull_class_dict(cls, attrs=None, superclasses=False):
    subjects = [cls]
    if superclasses:
        queue = list(cls.__bases__)
        while queue:
            candidate = queue.pop(0)
            subjects.insert(0, candidate)
            queue.extend(candidate.__bases__)

    result = {}
    for subject in subjects:
        for key, value in subject.__dict__.iteritems():
            if (not attrs or key in attrs) and not key.startswith('__'):
                result[key] = value

    return result

PLURALIZATION_RULES = (
    (re.compile(r'ife$'), re.compile(r'ife$'), 'ives'),
    (re.compile(r'eau$'), re.compile(r'eau$'), 'eaux'),
    (re.compile(r'lf$'), re.compile(r'lf$'), 'lves'),
    (re.compile(r'[sxz]$'), re.compile(r'$'), 'es'),
    (re.compile(r'[^aeioudgkprt]h$'), re.compile(r'$'), 'es'),
    (re.compile(r'(qu|[^aeiou])y$'), re.compile(r'y$'), 'ies'),
)

def pluralize(word, quantity=None, rules=PLURALIZATION_RULES):
    if quantity == 1: 
        return word

    for pattern, target, replacement in rules:
        if pattern.search(word):
            return target.sub(replacement, word)
    else:
        return word + 's'

def set_function_attr(function, attr, value):
    try:
        function = function.im_func
    except AttributeError:
        pass
    setattr(function, attr, value)

class StructureFormatter(object):
    def __init__(self, indent=4):
        self.indent = ' ' * indent
        self.indent_count = indent

    def format(self, structure, level=0):
        description = self._format_value(structure, level)
        if isinstance(description, list):
            description = '\n'.join(description)
        return description

    def _format_dict(self, value, level):
        inner_indent = self.indent * (level + 1)
        singles, multiples = [], []

        for k, v in sorted(value.iteritems()):
            description = self._format_value(v, level + 1)
            if isinstance(description, list):
                multiples.append('%s%r: %s' % (inner_indent, k, description[0]))
                multiples.extend(description[1:-1])
                multiples.append('%s%s,' % (inner_indent, description[-1]))
            else:
                singles.append('%s%r: %s,' % (inner_indent, k, description))

        return ['{'] + singles + multiples + ['}']

    def _format_list(self, value, level, tokens='[]'):
        inner_indent = self.indent * (level + 1)
        single_line = True

        lines = []
        for v in value:
            description = self._format_value(v, level + 1)
            if isinstance(description, list):
                single_line = False
                lines.append('%s%s' % (inner_indent, description[0]))
                lines.extend(description[1:-1])
                lines.append('%s%s,' % (inner_indent, description[-1]))
            else:
                lines.append('%s%s,' % (inner_indent, description))

        if single_line:
            single_line = tokens[0] + ', '.join(l.strip().rstrip(',') for l in lines) + tokens[1]
            if len(single_line) <= 60:
                return single_line

        return [tokens[0]] + lines + [tokens[1]]

    def _format_long_string(self, value, level):
        return repr(value)

    def _format_value(self, value, level):
        if isinstance(value, dict):
            return self._format_dict(value, level)
        elif isinstance(value, list):
            return self._format_list(value, level)
        elif isinstance(value, tuple):
            return self._format_list(value, level, '()')
        elif isinstance(value, basestring) and len(value) + (self.indent_count * level) > 70:
            return self._format_long_string(value, level)
        else:
            return repr(value)

def subclass_registry(collection, *attrs):
    """Metaclass constructor which maintains a registry of subclasses."""

    class registry(type):
        def __new__(metatype, name, bases, namespace):
            implementation = type.__new__(metatype, name, bases, namespace)
            subclasses = getattr(implementation, collection)

            identifier = None
            if attrs:
                for attr in attrs:
                    identifier = getattr(implementation, attr, None)
                    if identifier:
                        subclasses[identifier] = implementation
            else:
                module = namespace.get('__module__')
                if module and module != '__main__':
                    identifier = '%s.%s' % (module, name)
                if identifier:
                    subclasses[identifier] = implementation

            return implementation
    return registry

def uniqid():
    return str(uuid4())

def write_file(path, content):
    openfile = open(path, 'w+')
    try:
        openfile.write(content)
    finally:
        openfile.close()
