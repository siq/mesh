========
Resource
========

.. default-domain:: py
.. highlight:: python

.. module:: mesh.resource

Classes
-------

.. autoclass:: mesh.resource.Configuration

.. autoclass:: mesh.resource.Resource

    .. attribute:: name

        The name of this resource; should either be ``None`` for abstract resources or
        a ``string`` of lowercase letters for concrete resources.

    .. attribute:: version

        The version of this resource definition; should either be ``None`` for abstract
        resources or an ``integer`` >= 1 for concrete resources.

    .. attribute:: schema

        A ``dict`` mapping field names to :class:`mesh.schema.Field` instances which
        together comprise the schema of this resource.

    .. attribute:: requests

        A ``dict`` mapping request names to :class:`mesh.request.Request` instances
        declaring the possible requests for this resource.

    .. attribute:: validators

        A ``dict`` mapping validator names to the custom validators declared for this
        resource. Not intended for public use.

    .. attribute:: description

        An optional description of this resource, pulled from the docstring of the class
        if present. Used primarily for documentation.

    .. attribute:: maximum_version

        A class property which indicates the version number of the newest definition
        of this resource.

    .. attribute:: minimum_version

        A class property which indicates the version number of the oldest definition
        of this resource.

    .. classmethod:: describe(controller, path_prefix=None)

        Constructs a serializable description of this resource as a dictionary, which
        will include specifications for both its schema and its requests.

        :param controller: The controller for this resource.

    .. classmethod:: filter_schema(exclusive=False, \*\*params)
        
        Constructs.

.. autoclass:: mesh.resource.Controller

    .. attribute:: resource

        The resource this controller implements; should either be ``None`` for abstract
        controllers or a :class:`Resource` definition for concrete controllers.

    .. attribute:: version

        The version of this controller; should either be ``None`` for abstract controllers
        or a ``tuple`` containing two ``integers`` for concrete controllers: the version
        of the resource being implemented followed by the minor version within that version
        for this controller.

    .. attribute:: maximum_version

        A class property which indicates the version ``tuple`` of the newest definition
        of this controller.

    .. attribute:: minimum_version

        A class property which indicates the version ``tuple`` of the oldest definition
        of this controller.
