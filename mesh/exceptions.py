from mesh.constants import *
from mesh.util import construct_all_list

class MeshError(Exception):
    """..."""

class SpecificationError(MeshError):
    """Raised when a specification error occurs."""

class StructuralError(MeshError):
    """A structural error."""

    def __init__(self, *errors, **params):
        self.errors = list(errors)
        self.structure = params.get('structure', None)
        self.value = params.get('value', None)

    @property
    def substantive(self):
        return (self.errors or self.structure)

    def append(self, error):
        self.errors.append(error)
        return self

    def attach(self, structure):
        self.structure = structure
        return self

    def merge(self, exception):
        self.errors.extend(exception.errors)
        return self

    def serialize(self, force=False):
        if not force:
            try:
                return self._serialized_errors
            except AttributeError:
                pass

        errors = (self._serialize_errors(self.errors) if self.errors else None)
        structure = (self._serialize_structure() if self.structure else None)

        self._serialized_errors = [errors, structure]
        return self._serialized_errors

    def _serialize_errors(self, errors):
        serialized = []
        for error in errors:
            if isinstance(error, dict):
                serialized.append(error)
            else:
                serialized.append({'message': error})
        return serialized

    def _serialize_structure(self):
        if isinstance(self.structure, list):
            errors = []
            for item in self.structure:
                if isinstance(item, StructuralError):
                    if item.structure is not None:
                        errors.append(item._serialize_structure())
                    else:
                        errors.append(self._serialize_errors(item.errors))
                else:
                    errors.append(None)
            return errors
        elif isinstance(self.structure, dict):
            errors = {}
            for attr, value in self.structure.iteritems():
                if isinstance(value, StructuralError):
                    if value.structure is not None:
                        errors[attr] = value._serialize_structure()
                    else:
                        errors[attr] = self._serialize_errors(value.errors)
            return errors
        else:
            raise ValueError()

class OperationalError(StructuralError):
    """Raised when an operational error occurs during execution of a controller."""

class ValidationError(StructuralError):
    """Raised when validation fails."""

    def construct(self, field, error, **params):
        message = field.get_error(error)
        if message:
            params['field'] = field.name or 'unknown-field'
            return self.append({'token': error, 'message': message % params})
        else:
            raise KeyError(error)

class RequestError(MeshError):
    """Raised when a request fails for some reason."""

    def __init__(self, content=None):
        self.content = content

    @classmethod
    def construct(cls, status, content=None):
        exception = cls.errors.get(status)
        if exception:
            return exception(content)

class BadRequestError(RequestError):
    status = BAD_REQUEST

class ForbiddenError(RequestError):
    status = FORBIDDEN

class NotFoundError(RequestError):
    status = NOT_FOUND

class InvalidError(RequestError):
    status = INVALID

class TimeoutError(RequestError):
    status = TIMEOUT

class ConflictError(RequestError):
    status = CONFLICT

class GoneError(RequestError):
    status = GONE

class ServerError(RequestError):
    status = SERVER_ERROR

class UnimplementedError(RequestError):
    status = UNIMPLEMENTED

class UnavailableError(RequestError):
    status = UNAVAILABLE

RequestError.errors = {
    BAD_REQUEST: BadRequestError,
    FORBIDDEN: ForbiddenError,
    NOT_FOUND: NotFoundError,
    INVALID: InvalidError,
    TIMEOUT: TimeoutError,
    CONFLICT: ConflictError,
    GONE: GoneError,
    SERVER_ERROR: ServerError,
    UNIMPLEMENTED: UnimplementedError,
    UNAVAILABLE: UnavailableError,
}

__all__ = construct_all_list(locals(), Exception)
