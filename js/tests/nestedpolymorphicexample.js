define([
    './../request',
    './../fields',
    './../model',
    './../collection'
], function(Request, fields, model, collection) {
    var preloadedRaw, resource = model.Model.extend({
        __bundle__: "primary",
        __name__: "nestedpolymorphicexample",
        __requests__: {
            create: Request({
                bundle: "primary",
                method: "POST",
                mimetype: "application/json",
                name: "create",
                path: "/primary/1.0/nestedpolymorphicexample",
                responses: {
                    200: {
                        mimetype: "application/json",
                        status: "OK",
                        schema: fields.StructureField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            strict: true,
                            structure: {
                                id: fields.UUIDField({
                                    is_identifier: true,
                                    name: "id",
                                    nonnull: true,
                                    oncreate: true,
                                    operators: "equal",
                                    required: true
                                })
                            }
                        })
                    },
                    406: {
                        mimetype: "application/json",
                        status: "INVALID",
                        schema: fields.TupleField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            values: [
                                fields.SequenceField({
                                    nonnull: false,
                                    required: false,
                                    unique: false,
                                    item: fields.MapField({
                                        nonnull: false,
                                        required: false,
                                        value: fields.TextField({
                                            nonnull: true,
                                            required: false,
                                            strip: true
                                        })
                                    })
                                }),
                                fields.Field({
                                    nonnull: false,
                                    required: false
                                })
                            ]
                        })
                    }
                },
                schema: fields.StructureField({
                    name: "resource",
                    nonnull: false,
                    required: false,
                    strict: true,
                    structure: {
                        boolean_field: fields.BooleanField({
                            name: "boolean_field",
                            nonnull: false,
                            required: false
                        }),
                        composition: fields.StructureField({
                            name: "composition",
                            nonnull: true,
                            required: false,
                            strict: true,
                            polymorphic_on: fields.EnumerationField({
                                enumeration: ["attribute-filter", "datasource-list", "extant"],
                                name: "type",
                                nonnull: true,
                                representation: "'attribute-filter', 'datasource-list', 'extant'",
                                required: true
                            }),
                            structure: {
                                "attribute-filter": {
                                    expression: fields.TextField({
                                        min_length: 1,
                                        name: "expression",
                                        nonnull: true,
                                        required: true,
                                        strip: true
                                    }),
                                    type: fields.EnumerationField({
                                        constant: "attribute-filter",
                                        enumeration: ["attribute-filter", "datasource-list", "extant"],
                                        name: "type",
                                        nonnull: true,
                                        representation: "'attribute-filter', 'datasource-list', 'extant'",
                                        required: true
                                    })
                                },
                                "datasource-list": {
                                    datasources: fields.SequenceField({
                                        name: "datasources",
                                        nonnull: true,
                                        required: true,
                                        unique: false,
                                        item: fields.StructureField({
                                            nonnull: true,
                                            required: false,
                                            strict: true,
                                            structure: {
                                                id: fields.UUIDField({
                                                    name: "id",
                                                    nonnull: true,
                                                    required: true
                                                })
                                            }
                                        })
                                    }),
                                    type: fields.EnumerationField({
                                        constant: "datasource-list",
                                        enumeration: ["attribute-filter", "datasource-list", "extant"],
                                        name: "type",
                                        nonnull: true,
                                        representation: "'attribute-filter', 'datasource-list', 'extant'",
                                        required: true
                                    })
                                },
                                extant: {
                                    type: fields.EnumerationField({
                                        constant: "extant",
                                        enumeration: ["attribute-filter", "datasource-list", "extant"],
                                        name: "type",
                                        nonnull: true,
                                        representation: "'attribute-filter', 'datasource-list', 'extant'",
                                        required: true
                                    })
                                }
                            }
                        }),
                        constrained_field: fields.IntegerField({
                            maximum: 4,
                            minimum: 2,
                            name: "constrained_field",
                            nonnull: false,
                            required: false
                        }),
                        date_field: fields.DateField({
                            name: "date_field",
                            nonnull: false,
                            required: false
                        }),
                        datetime_field: fields.DateTimeField({
                            name: "datetime_field",
                            nonnull: false,
                            required: false,
                            utc: false
                        }),
                        default_field: fields.IntegerField({
                            "default": 1,
                            name: "default_field",
                            nonnull: false,
                            required: false
                        }),
                        deferred_field: fields.TextField({
                            deferred: true,
                            name: "deferred_field",
                            nonnull: false,
                            required: false,
                            strip: true
                        }),
                        enumeration_field: fields.EnumerationField({
                            enumeration: [1, 2, 3],
                            name: "enumeration_field",
                            nonnull: false,
                            required: false
                        }),
                        float_field: fields.FloatField({
                            name: "float_field",
                            nonnull: false,
                            required: false
                        }),
                        id: fields.UUIDField({
                            name: "id",
                            nonnull: true,
                            oncreate: true,
                            operators: "equal",
                            required: true
                        }),
                        integer_field: fields.IntegerField({
                            name: "integer_field",
                            nonnull: false,
                            operators: ["eq", "in", "gte", "lt", "lte", "gt"],
                            required: false,
                            sortable: true
                        }),
                        name: fields.TextField({
                            name: "name",
                            nonnull: true,
                            required: true,
                            sortable: true,
                            strip: true
                        }),
                        required_field: fields.TextField({
                            name: "required_field",
                            nonnull: true,
                            operators: ["eq", "ne", "pre", "suf", "cnt"],
                            required: true,
                            sortable: true,
                            strip: true
                        }),
                        structure_field: fields.StructureField({
                            name: "structure_field",
                            nonnull: false,
                            required: true,
                            strict: true,
                            structure: {
                                optional_field: fields.IntegerField({
                                    name: "optional_field",
                                    nonnull: false,
                                    required: false
                                }),
                                required_field: fields.IntegerField({
                                    name: "required_field",
                                    nonnull: false,
                                    required: true
                                }),
                                structure_field: fields.StructureField({
                                    name: "structure_field",
                                    nonnull: false,
                                    required: false,
                                    strict: true,
                                    structure: {
                                        optional_field: fields.IntegerField({
                                            name: "optional_field",
                                            nonnull: false,
                                            required: false
                                        }),
                                        required_field: fields.IntegerField({
                                            name: "required_field",
                                            nonnull: false,
                                            required: true
                                        })
                                    }
                                })
                            }
                        }),
                        text_field: fields.TextField({
                            name: "text_field",
                            nonnull: false,
                            required: false,
                            strip: true
                        }),
                        type: fields.EnumerationField({
                            enumeration: ["immutable", "mutable"],
                            name: "type",
                            nonnull: true,
                            onupdate: false,
                            required: true
                        })
                    }
                })
            }),
            "delete": Request({
                bundle: "primary",
                method: "DELETE",
                mimetype: "application/json",
                name: "delete",
                path: "/primary/1.0/nestedpolymorphicexample/id",
                schema: null,
                responses: {
                    200: {
                        mimetype: "application/json",
                        status: "OK",
                        schema: fields.StructureField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            strict: true,
                            structure: {
                                id: fields.UUIDField({
                                    is_identifier: true,
                                    name: "id",
                                    nonnull: true,
                                    oncreate: true,
                                    operators: "equal",
                                    required: true
                                })
                            }
                        })
                    },
                    406: {
                        mimetype: "application/json",
                        status: "INVALID",
                        schema: fields.TupleField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            values: [
                                fields.SequenceField({
                                    nonnull: false,
                                    required: false,
                                    unique: false,
                                    item: fields.MapField({
                                        nonnull: false,
                                        required: false,
                                        value: fields.TextField({
                                            nonnull: true,
                                            required: false,
                                            strip: true
                                        })
                                    })
                                }),
                                fields.Field({
                                    nonnull: false,
                                    required: false
                                })
                            ]
                        })
                    }
                }
            }),
            get: Request({
                bundle: "primary",
                method: "GET",
                mimetype: "application/x-www-form-urlencoded",
                name: "get",
                path: "/primary/1.0/nestedpolymorphicexample/id",
                responses: {
                    200: {
                        mimetype: "application/json",
                        status: "OK",
                        schema: fields.StructureField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            strict: true,
                            structure: {
                                boolean_field: fields.BooleanField({
                                    name: "boolean_field",
                                    nonnull: false,
                                    required: false
                                }),
                                composition: fields.StructureField({
                                    name: "composition",
                                    nonnull: true,
                                    required: false,
                                    strict: true,
                                    polymorphic_on: fields.EnumerationField({
                                        enumeration: ["attribute-filter", "datasource-list", "extant"],
                                        name: "type",
                                        nonnull: true,
                                        representation: "'attribute-filter', 'datasource-list', 'extant'",
                                        required: true
                                    }),
                                    structure: {
                                        "attribute-filter": {
                                            expression: fields.TextField({
                                                min_length: 1,
                                                name: "expression",
                                                nonnull: true,
                                                required: true,
                                                strip: true
                                            }),
                                            type: fields.EnumerationField({
                                                constant: "attribute-filter",
                                                enumeration: ["attribute-filter", "datasource-list", "extant"],
                                                name: "type",
                                                nonnull: true,
                                                representation: "'attribute-filter', 'datasource-list', 'extant'",
                                                required: true
                                            })
                                        },
                                        "datasource-list": {
                                            datasources: fields.SequenceField({
                                                name: "datasources",
                                                nonnull: true,
                                                required: true,
                                                unique: false,
                                                item: fields.StructureField({
                                                    nonnull: true,
                                                    required: false,
                                                    strict: true,
                                                    structure: {
                                                        id: fields.UUIDField({
                                                            name: "id",
                                                            nonnull: true,
                                                            required: true
                                                        }),
                                                        name: fields.TextField({
                                                            name: "name",
                                                            nonnull: false,
                                                            readonly: true,
                                                            required: false,
                                                            strip: true
                                                        })
                                                    }
                                                })
                                            }),
                                            type: fields.EnumerationField({
                                                constant: "datasource-list",
                                                enumeration: ["attribute-filter", "datasource-list", "extant"],
                                                name: "type",
                                                nonnull: true,
                                                representation: "'attribute-filter', 'datasource-list', 'extant'",
                                                required: true
                                            })
                                        },
                                        extant: {
                                            type: fields.EnumerationField({
                                                constant: "extant",
                                                enumeration: ["attribute-filter", "datasource-list", "extant"],
                                                name: "type",
                                                nonnull: true,
                                                representation: "'attribute-filter', 'datasource-list', 'extant'",
                                                required: true
                                            })
                                        }
                                    }
                                }),
                                constrained_field: fields.IntegerField({
                                    maximum: 4,
                                    minimum: 2,
                                    name: "constrained_field",
                                    nonnull: false,
                                    required: false
                                }),
                                date_field: fields.DateField({
                                    name: "date_field",
                                    nonnull: false,
                                    required: false
                                }),
                                datetime_field: fields.DateTimeField({
                                    name: "datetime_field",
                                    nonnull: false,
                                    required: false,
                                    utc: false
                                }),
                                default_field: fields.IntegerField({
                                    "default": 1,
                                    name: "default_field",
                                    nonnull: false,
                                    required: false
                                }),
                                deferred_field: fields.TextField({
                                    deferred: true,
                                    name: "deferred_field",
                                    nonnull: false,
                                    required: false,
                                    strip: true
                                }),
                                enumeration_field: fields.EnumerationField({
                                    enumeration: [1, 2, 3],
                                    name: "enumeration_field",
                                    nonnull: false,
                                    required: false
                                }),
                                float_field: fields.FloatField({
                                    name: "float_field",
                                    nonnull: false,
                                    required: false
                                }),
                                id: fields.UUIDField({
                                    is_identifier: true,
                                    name: "id",
                                    nonnull: true,
                                    oncreate: true,
                                    operators: "equal",
                                    required: true
                                }),
                                integer_field: fields.IntegerField({
                                    name: "integer_field",
                                    nonnull: false,
                                    operators: ["eq", "in", "gte", "lt", "lte", "gt"],
                                    required: false,
                                    sortable: true
                                }),
                                name: fields.TextField({
                                    name: "name",
                                    nonnull: true,
                                    required: false,
                                    sortable: true,
                                    strip: true
                                }),
                                readonly_field: fields.IntegerField({
                                    name: "readonly_field",
                                    nonnull: false,
                                    readonly: true,
                                    required: false
                                }),
                                required_field: fields.TextField({
                                    name: "required_field",
                                    nonnull: true,
                                    operators: ["eq", "ne", "pre", "suf", "cnt"],
                                    required: false,
                                    sortable: true,
                                    strip: true
                                }),
                                structure_field: fields.StructureField({
                                    name: "structure_field",
                                    nonnull: false,
                                    required: false,
                                    strict: true,
                                    structure: {
                                        optional_field: fields.IntegerField({
                                            name: "optional_field",
                                            nonnull: false,
                                            required: false
                                        }),
                                        required_field: fields.IntegerField({
                                            name: "required_field",
                                            nonnull: false,
                                            required: true
                                        }),
                                        structure_field: fields.StructureField({
                                            name: "structure_field",
                                            nonnull: false,
                                            required: false,
                                            strict: true,
                                            structure: {
                                                optional_field: fields.IntegerField({
                                                    name: "optional_field",
                                                    nonnull: false,
                                                    required: false
                                                }),
                                                required_field: fields.IntegerField({
                                                    name: "required_field",
                                                    nonnull: false,
                                                    required: true
                                                })
                                            }
                                        })
                                    }
                                }),
                                text_field: fields.TextField({
                                    name: "text_field",
                                    nonnull: false,
                                    required: false,
                                    strip: true
                                }),
                                type: fields.EnumerationField({
                                    enumeration: ["immutable", "mutable"],
                                    name: "type",
                                    nonnull: true,
                                    onupdate: false,
                                    representation: "'immutable', 'mutable'",
                                    required: false
                                })
                            }
                        })
                    },
                    406: {
                        mimetype: "application/json",
                        status: "INVALID",
                        schema: fields.TupleField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            values: [
                                fields.SequenceField({
                                    nonnull: false,
                                    required: false,
                                    unique: false,
                                    item: fields.MapField({
                                        nonnull: false,
                                        required: false,
                                        value: fields.TextField({
                                            nonnull: true,
                                            required: false,
                                            strip: true
                                        })
                                    })
                                }),
                                fields.Field({
                                    nonnull: false,
                                    required: false
                                })
                            ]
                        })
                    }
                },
                schema: fields.StructureField({
                    nonnull: false,
                    required: false,
                    strict: true,
                    structure: {
                        exclude: fields.SequenceField({
                            name: "exclude",
                            nonnull: false,
                            required: false,
                            unique: false,
                            item: fields.EnumerationField({
                                nonnull: true,
                                required: false,
                                enumeration: [
                                    "boolean_field",
                                    "composition",
                                    "constrained_field",
                                    "date_field",
                                    "datetime_field",
                                    "default_field",
                                    "enumeration_field",
                                    "float_field",
                                    "integer_field",
                                    "name",
                                    "readonly_field",
                                    "required_field",
                                    "structure_field",
                                    "text_field",
                                    "type"
                                ]
                            })
                        }),
                        fields: fields.SequenceField({
                            name: "fields",
                            nonnull: false,
                            required: false,
                            unique: true,
                            item: fields.EnumerationField({
                                nonnull: true,
                                required: false,
                                enumeration: [
                                    "boolean_field",
                                    "composition",
                                    "constrained_field",
                                    "date_field",
                                    "datetime_field",
                                    "default_field",
                                    "deferred_field",
                                    "enumeration_field",
                                    "float_field",
                                    "id",
                                    "integer_field",
                                    "name",
                                    "readonly_field",
                                    "required_field",
                                    "structure_field",
                                    "text_field",
                                    "type"
                                ]
                            })
                        }),
                        include: fields.SequenceField({
                            name: "include",
                            nonnull: false,
                            required: false,
                            unique: false,
                            item: fields.EnumerationField({
                                enumeration: ["deferred_field"],
                                nonnull: true,
                                required: false
                            })
                        })
                    }
                })
            }),
            put: Request({
                bundle: "primary",
                method: "PUT",
                mimetype: "application/json",
                name: "put",
                path: "/primary/1.0/nestedpolymorphicexample/id",
                responses: {
                    200: {
                        mimetype: "application/json",
                        status: "OK",
                        schema: fields.StructureField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            strict: true,
                            structure: {
                                id: fields.UUIDField({
                                    is_identifier: true,
                                    name: "id",
                                    nonnull: true,
                                    oncreate: true,
                                    operators: "equal",
                                    required: true
                                })
                            }
                        })
                    },
                    406: {
                        mimetype: "application/json",
                        status: "INVALID",
                        schema: fields.TupleField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            values: [
                                fields.SequenceField({
                                    nonnull: false,
                                    required: false,
                                    unique: false,
                                    item: fields.MapField({
                                        nonnull: false,
                                        required: false,
                                        value: fields.TextField({
                                            nonnull: true,
                                            required: false,
                                            strip: true
                                        })
                                    })
                                }),
                                fields.Field({
                                    nonnull: false,
                                    required: false
                                })
                            ]
                        })
                    }
                },
                schema: fields.StructureField({
                    nonnull: false,
                    required: false,
                    strict: true,
                    structure: {
                        boolean_field: fields.BooleanField({
                            name: "boolean_field",
                            nonnull: false,
                            required: false
                        }),
                        composition: fields.StructureField({
                            name: "composition",
                            nonnull: true,
                            required: false,
                            strict: true,
                            polymorphic_on: fields.EnumerationField({
                                enumeration: ["attribute-filter", "datasource-list", "extant"],
                                name: "type",
                                nonnull: true,
                                representation: "'attribute-filter', 'datasource-list', 'extant'",
                                required: true
                            }),
                            structure: {
                                "attribute-filter": {
                                    expression: fields.TextField({
                                        min_length: 1,
                                        name: "expression",
                                        nonnull: true,
                                        required: true,
                                        strip: true
                                    }),
                                    type: fields.EnumerationField({
                                        constant: "attribute-filter",
                                        enumeration: ["attribute-filter", "datasource-list", "extant"],
                                        name: "type",
                                        nonnull: true,
                                        representation: "'attribute-filter', 'datasource-list', 'extant'",
                                        required: true
                                    })
                                },
                                "datasource-list": {
                                    datasources: fields.SequenceField({
                                        name: "datasources",
                                        nonnull: true,
                                        required: true,
                                        unique: false,
                                        item: fields.StructureField({
                                            nonnull: true,
                                            required: false,
                                            strict: true,
                                            structure: {
                                                id: fields.UUIDField({
                                                    name: "id",
                                                    nonnull: true,
                                                    required: true
                                                })
                                            }
                                        })
                                    }),
                                    type: fields.EnumerationField({
                                        constant: "datasource-list",
                                        enumeration: ["attribute-filter", "datasource-list", "extant"],
                                        name: "type",
                                        nonnull: true,
                                        representation: "'attribute-filter', 'datasource-list', 'extant'",
                                        required: true
                                    })
                                },
                                extant: {
                                    type: fields.EnumerationField({
                                        constant: "extant",
                                        enumeration: ["attribute-filter", "datasource-list", "extant"],
                                        name: "type",
                                        nonnull: true,
                                        representation: "'attribute-filter', 'datasource-list', 'extant'",
                                        required: true
                                    })
                                }
                            }
                        }),
                        constrained_field: fields.IntegerField({
                            maximum: 4,
                            minimum: 2,
                            name: "constrained_field",
                            nonnull: false,
                            required: false
                        }),
                        date_field: fields.DateField({
                            name: "date_field",
                            nonnull: false,
                            required: false
                        }),
                        datetime_field: fields.DateTimeField({
                            name: "datetime_field",
                            nonnull: false,
                            required: false,
                            utc: false
                        }),
                        default_field: fields.IntegerField({
                            "default": 1,
                            name: "default_field",
                            nonnull: false,
                            required: false
                        }),
                        deferred_field: fields.TextField({
                            deferred: true,
                            name: "deferred_field",
                            nonnull: false,
                            required: false,
                            strip: true
                        }),
                        enumeration_field: fields.EnumerationField({
                            enumeration: [1, 2, 3],
                            name: "enumeration_field",
                            nonnull: false,
                            required: false
                        }),
                        float_field: fields.FloatField({
                            name: "float_field",
                            nonnull: false,
                            required: false
                        }),
                        integer_field: fields.IntegerField({
                            name: "integer_field",
                            nonnull: false,
                            operators: ["eq", "in", "gte", "lt", "lte", "gt"],
                            required: false,
                            sortable: true
                        }),
                        name: fields.TextField({
                            name: "name",
                            nonnull: true,
                            required: true,
                            sortable: true,
                            strip: true
                        }),
                        required_field: fields.TextField({
                            name: "required_field",
                            nonnull: true,
                            operators: ["eq", "ne", "pre", "suf", "cnt"],
                            required: true,
                            sortable: true,
                            strip: true
                        }),
                        structure_field: fields.StructureField({
                            name: "structure_field",
                            nonnull: false,
                            required: true,
                            strict: true,
                            structure: {
                                optional_field: fields.IntegerField({
                                    name: "optional_field",
                                    nonnull: false,
                                    required: false
                                }),
                                required_field: fields.IntegerField({
                                    name: "required_field",
                                    nonnull: false,
                                    required: true
                                }),
                                structure_field: fields.StructureField({
                                    name: "structure_field",
                                    nonnull: false,
                                    required: false,
                                    strict: true,
                                    structure: {
                                        optional_field: fields.IntegerField({
                                            name: "optional_field",
                                            nonnull: false,
                                            required: false
                                        }),
                                        required_field: fields.IntegerField({
                                            name: "required_field",
                                            nonnull: false,
                                            required: true
                                        })
                                    }
                                })
                            }
                        }),
                        text_field: fields.TextField({
                            name: "text_field",
                            nonnull: false,
                            required: false,
                            strip: true
                        }),
                        type: fields.EnumerationField({
                            enumeration: ["immutable", "mutable"],
                            name: "type",
                            nonnull: true,
                            onupdate: false,
                            required: true
                        })
                    }
                })
            }),
            query: Request({
                bundle: "primary",
                method: "GET",
                mimetype: "application/x-www-form-urlencoded",
                name: "query",
                path: "/primary/1.0/nestedpolymorphicexample",
                responses: {
                    200: {
                        mimetype: "application/json",
                        status: "OK",
                        schema: fields.StructureField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            strict: true,
                            structure: {
                                resources: fields.SequenceField({
                                    name: "resources",
                                    nonnull: true,
                                    required: false,
                                    unique: false,
                                    item: fields.StructureField({
                                        nonnull: false,
                                        required: false,
                                        strict: true,
                                        structure: {
                                            boolean_field: fields.BooleanField({
                                                name: "boolean_field",
                                                nonnull: false,
                                                required: false
                                            }),
                                            composition: fields.StructureField({
                                                name: "composition",
                                                nonnull: true,
                                                required: false,
                                                strict: true,
                                                polymorphic_on: fields.EnumerationField({
                                                    enumeration: ["attribute-filter", "datasource-list", "extant"],
                                                    name: "type",
                                                    nonnull: true,
                                                    representation: "'attribute-filter', 'datasource-list', 'extant'",
                                                    required: true
                                                }),
                                                structure: {
                                                    "attribute-filter": {
                                                        expression: fields.TextField({
                                                            min_length: 1,
                                                            name: "expression",
                                                            nonnull: true,
                                                            required: true,
                                                            strip: true
                                                        }),
                                                        type: fields.EnumerationField({
                                                            constant: "attribute-filter",
                                                            enumeration: ["attribute-filter", "datasource-list", "extant"],
                                                            name: "type",
                                                            nonnull: true,
                                                            representation: "'attribute-filter', 'datasource-list', 'extant'",
                                                            required: true
                                                        })
                                                    },
                                                    "datasource-list": {
                                                        datasources: fields.SequenceField({
                                                            name: "datasources",
                                                            nonnull: true,
                                                            required: true,
                                                            unique: false,
                                                            item: fields.StructureField({
                                                                nonnull: true,
                                                                required: false,
                                                                strict: true,
                                                                structure: {
                                                                    id: fields.UUIDField({
                                                                        name: "id",
                                                                        nonnull: true,
                                                                        required: true
                                                                    }),
                                                                    name: fields.TextField({
                                                                        name: "name",
                                                                        nonnull: false,
                                                                        readonly: true,
                                                                        required: false,
                                                                        strip: true
                                                                    })
                                                                }
                                                            })
                                                        }),
                                                        type: fields.EnumerationField({
                                                            constant: "datasource-list",
                                                            enumeration: ["attribute-filter", "datasource-list", "extant"],
                                                            name: "type",
                                                            nonnull: true,
                                                            representation: "'attribute-filter', 'datasource-list', 'extant'",
                                                            required: true
                                                        })
                                                    },
                                                    extant: {
                                                        type: fields.EnumerationField({
                                                            constant: "extant",
                                                            enumeration: ["attribute-filter", "datasource-list", "extant"],
                                                            name: "type",
                                                            nonnull: true,
                                                            representation: "'attribute-filter', 'datasource-list', 'extant'",
                                                            required: true
                                                        })
                                                    }
                                                }
                                            }),
                                            constrained_field: fields.IntegerField({
                                                maximum: 4,
                                                minimum: 2,
                                                name: "constrained_field",
                                                nonnull: false,
                                                required: false
                                            }),
                                            date_field: fields.DateField({
                                                name: "date_field",
                                                nonnull: false,
                                                required: false
                                            }),
                                            datetime_field: fields.DateTimeField({
                                                name: "datetime_field",
                                                nonnull: false,
                                                required: false,
                                                utc: false
                                            }),
                                            default_field: fields.IntegerField({
                                                "default": 1,
                                                name: "default_field",
                                                nonnull: false,
                                                required: false
                                            }),
                                            deferred_field: fields.TextField({
                                                deferred: true,
                                                name: "deferred_field",
                                                nonnull: false,
                                                required: false,
                                                strip: true
                                            }),
                                            enumeration_field: fields.EnumerationField({
                                                enumeration: [1, 2, 3],
                                                name: "enumeration_field",
                                                nonnull: false,
                                                required: false
                                            }),
                                            float_field: fields.FloatField({
                                                name: "float_field",
                                                nonnull: false,
                                                required: false
                                            }),
                                            id: fields.UUIDField({
                                                is_identifier: true,
                                                name: "id",
                                                nonnull: true,
                                                oncreate: true,
                                                operators: "equal",
                                                required: true
                                            }),
                                            integer_field: fields.IntegerField({
                                                name: "integer_field",
                                                nonnull: false,
                                                operators: ["eq", "in", "gte", "lt", "lte", "gt"],
                                                required: false,
                                                sortable: true
                                            }),
                                            name: fields.TextField({
                                                name: "name",
                                                nonnull: true,
                                                required: false,
                                                sortable: true,
                                                strip: true
                                            }),
                                            readonly_field: fields.IntegerField({
                                                name: "readonly_field",
                                                nonnull: false,
                                                readonly: true,
                                                required: false
                                            }),
                                            required_field: fields.TextField({
                                                name: "required_field",
                                                nonnull: true,
                                                operators: ["eq", "ne", "pre", "suf", "cnt"],
                                                required: false,
                                                sortable: true,
                                                strip: true
                                            }),
                                            structure_field: fields.StructureField({
                                                name: "structure_field",
                                                nonnull: false,
                                                required: false,
                                                strict: true,
                                                structure: {
                                                    optional_field: fields.IntegerField({
                                                        name: "optional_field",
                                                        nonnull: false,
                                                        required: false
                                                    }),
                                                    required_field: fields.IntegerField({
                                                        name: "required_field",
                                                        nonnull: false,
                                                        required: true
                                                    }),
                                                    structure_field: fields.StructureField({
                                                        name: "structure_field",
                                                        nonnull: false,
                                                        required: false,
                                                        strict: true,
                                                        structure: {
                                                            optional_field: fields.IntegerField({
                                                                name: "optional_field",
                                                                nonnull: false,
                                                                required: false
                                                            }),
                                                            required_field: fields.IntegerField({
                                                                name: "required_field",
                                                                nonnull: false,
                                                                required: true
                                                            })
                                                        }
                                                    })
                                                }
                                            }),
                                            text_field: fields.TextField({
                                                name: "text_field",
                                                nonnull: false,
                                                required: false,
                                                strip: true
                                            }),
                                            type: fields.EnumerationField({
                                                enumeration: ["immutable", "mutable"],
                                                name: "type",
                                                nonnull: true,
                                                onupdate: false,
                                                representation: "'immutable', 'mutable'",
                                                required: false
                                            })
                                        }
                                    })
                                }),
                                total: fields.IntegerField({
                                    minimum: 0,
                                    name: "total",
                                    nonnull: true,
                                    required: false
                                })
                            }
                        })
                    },
                    406: {
                        mimetype: "application/json",
                        status: "INVALID",
                        schema: fields.TupleField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            values: [
                                fields.SequenceField({
                                    nonnull: false,
                                    required: false,
                                    unique: false,
                                    item: fields.MapField({
                                        nonnull: false,
                                        required: false,
                                        value: fields.TextField({
                                            nonnull: true,
                                            required: false,
                                            strip: true
                                        })
                                    })
                                }),
                                fields.Field({
                                    nonnull: false,
                                    required: false
                                })
                            ]
                        })
                    }
                },
                schema: fields.StructureField({
                    nonnull: false,
                    required: false,
                    strict: true,
                    structure: {
                        exclude: fields.SequenceField({
                            name: "exclude",
                            nonnull: false,
                            required: false,
                            unique: false,
                            item: fields.EnumerationField({
                                nonnull: true,
                                required: false,
                                enumeration: [
                                    "boolean_field",
                                    "composition",
                                    "constrained_field",
                                    "date_field",
                                    "datetime_field",
                                    "default_field",
                                    "enumeration_field",
                                    "float_field",
                                    "integer_field",
                                    "name",
                                    "readonly_field",
                                    "required_field",
                                    "structure_field",
                                    "text_field",
                                    "type"
                                ]
                            })
                        }),
                        fields: fields.SequenceField({
                            name: "fields",
                            nonnull: false,
                            required: false,
                            unique: true,
                            item: fields.EnumerationField({
                                nonnull: true,
                                required: false,
                                enumeration: [
                                    "boolean_field",
                                    "composition",
                                    "constrained_field",
                                    "date_field",
                                    "datetime_field",
                                    "default_field",
                                    "deferred_field",
                                    "enumeration_field",
                                    "float_field",
                                    "id",
                                    "integer_field",
                                    "name",
                                    "readonly_field",
                                    "required_field",
                                    "structure_field",
                                    "text_field",
                                    "type"
                                ]
                            })
                        }),
                        include: fields.SequenceField({
                            name: "include",
                            nonnull: false,
                            required: false,
                            unique: false,
                            item: fields.EnumerationField({
                                enumeration: ["deferred_field"],
                                nonnull: true,
                                required: false
                            })
                        }),
                        limit: fields.IntegerField({
                            minimum: 0,
                            name: "limit",
                            nonnull: false,
                            required: false
                        }),
                        offset: fields.IntegerField({
                            "default": 0,
                            minimum: 0,
                            name: "offset",
                            nonnull: false,
                            required: false
                        }),
                        query: fields.StructureField({
                            name: "query",
                            nonnull: false,
                            required: false,
                            strict: true,
                            structure: {
                                id: fields.UUIDField({
                                    deferred: false,
                                    is_identifier: true,
                                    name: "id",
                                    nonnull: true,
                                    oncreate: true,
                                    operators: "equal",
                                    readonly: false,
                                    required: false,
                                    sortable: false
                                }),
                                integer_field__gt: fields.IntegerField({
                                    deferred: false,
                                    name: "integer_field__gt",
                                    nonnull: true,
                                    operators: ["eq", "in", "gte", "lt", "lte", "gt"],
                                    readonly: false,
                                    required: false,
                                    sortable: false
                                }),
                                integer_field__gte: fields.IntegerField({
                                    deferred: false,
                                    name: "integer_field__gte",
                                    nonnull: true,
                                    operators: ["eq", "in", "gte", "lt", "lte", "gt"],
                                    readonly: false,
                                    required: false,
                                    sortable: false
                                }),
                                integer_field__in: fields.SequenceField({
                                    name: "integer_field__in",
                                    nonnull: true,
                                    required: false,
                                    unique: false,
                                    item: fields.IntegerField({
                                        deferred: false,
                                        nonnull: true,
                                        operators: ["eq", "in", "gte", "lt", "lte", "gt"],
                                        readonly: false,
                                        required: false,
                                        sortable: false
                                    })
                                }),
                                integer_field__lt: fields.IntegerField({
                                    deferred: false,
                                    name: "integer_field__lt",
                                    nonnull: true,
                                    operators: ["eq", "in", "gte", "lt", "lte", "gt"],
                                    readonly: false,
                                    required: false,
                                    sortable: false
                                }),
                                integer_field__lte: fields.IntegerField({
                                    deferred: false,
                                    name: "integer_field__lte",
                                    nonnull: true,
                                    operators: ["eq", "in", "gte", "lt", "lte", "gt"],
                                    readonly: false,
                                    required: false,
                                    sortable: false
                                })
                            }
                        }),
                        sort: fields.SequenceField({
                            name: "sort",
                            nonnull: false,
                            required: false,
                            unique: false,
                            item: fields.EnumerationField({
                                nonnull: true,
                                required: false,
                                enumeration: [
                                    "integer_field",
                                    "integer_field+",
                                    "integer_field-",
                                    "name",
                                    "name+",
                                    "name-",
                                    "required_field",
                                    "required_field+",
                                    "required_field-"
                                ]
                            })
                        }),
                        total: fields.BooleanField({
                            "default": false,
                            name: "total",
                            nonnull: true,
                            required: false
                        })
                    }
                })
            }),
            update: Request({
                bundle: "primary",
                method: "POST",
                mimetype: "application/json",
                name: "update",
                path: "/primary/1.0/nestedpolymorphicexample/id",
                responses: {
                    200: {
                        mimetype: "application/json",
                        status: "OK",
                        schema: fields.StructureField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            strict: true,
                            structure: {
                                id: fields.UUIDField({
                                    is_identifier: true,
                                    name: "id",
                                    nonnull: true,
                                    oncreate: true,
                                    operators: "equal",
                                    required: true
                                })
                            }
                        })
                    },
                    406: {
                        mimetype: "application/json",
                        status: "INVALID",
                        schema: fields.TupleField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            values: [
                                fields.SequenceField({
                                    nonnull: false,
                                    required: false,
                                    unique: false,
                                    item: fields.MapField({
                                        nonnull: false,
                                        required: false,
                                        value: fields.TextField({
                                            nonnull: true,
                                            required: false,
                                            strip: true
                                        })
                                    })
                                }),
                                fields.Field({
                                    nonnull: false,
                                    required: false
                                })
                            ]
                        })
                    }
                },
                schema: fields.StructureField({
                    nonnull: false,
                    required: false,
                    strict: true,
                    structure: {
                        boolean_field: fields.BooleanField({
                            name: "boolean_field",
                            nonnull: false,
                            required: false
                        }),
                        composition: fields.StructureField({
                            name: "composition",
                            nonnull: true,
                            required: false,
                            strict: true,
                            polymorphic_on: fields.EnumerationField({
                                enumeration: ["attribute-filter", "datasource-list", "extant"],
                                name: "type",
                                nonnull: true,
                                representation: "'attribute-filter', 'datasource-list', 'extant'",
                                required: true
                            }),
                            structure: {
                                "attribute-filter": {
                                    expression: fields.TextField({
                                        min_length: 1,
                                        name: "expression",
                                        nonnull: true,
                                        required: true,
                                        strip: true
                                    }),
                                    type: fields.EnumerationField({
                                        constant: "attribute-filter",
                                        enumeration: ["attribute-filter", "datasource-list", "extant"],
                                        name: "type",
                                        nonnull: true,
                                        representation: "'attribute-filter', 'datasource-list', 'extant'",
                                        required: true
                                    })
                                },
                                "datasource-list": {
                                    datasources: fields.SequenceField({
                                        name: "datasources",
                                        nonnull: true,
                                        required: true,
                                        unique: false,
                                        item: fields.StructureField({
                                            nonnull: true,
                                            required: false,
                                            strict: true,
                                            structure: {
                                                id: fields.UUIDField({
                                                    name: "id",
                                                    nonnull: true,
                                                    required: true
                                                })
                                            }
                                        })
                                    }),
                                    type: fields.EnumerationField({
                                        constant: "datasource-list",
                                        enumeration: ["attribute-filter", "datasource-list", "extant"],
                                        name: "type",
                                        nonnull: true,
                                        representation: "'attribute-filter', 'datasource-list', 'extant'",
                                        required: true
                                    })
                                },
                                extant: {
                                    type: fields.EnumerationField({
                                        constant: "extant",
                                        enumeration: ["attribute-filter", "datasource-list", "extant"],
                                        name: "type",
                                        nonnull: true,
                                        representation: "'attribute-filter', 'datasource-list', 'extant'",
                                        required: true
                                    })
                                }
                            }
                        }),
                        constrained_field: fields.IntegerField({
                            maximum: 4,
                            minimum: 2,
                            name: "constrained_field",
                            nonnull: false,
                            required: false
                        }),
                        date_field: fields.DateField({
                            name: "date_field",
                            nonnull: false,
                            required: false
                        }),
                        datetime_field: fields.DateTimeField({
                            name: "datetime_field",
                            nonnull: false,
                            required: false,
                            utc: false
                        }),
                        default_field: fields.IntegerField({
                            "default": 1,
                            name: "default_field",
                            nonnull: false,
                            required: false
                        }),
                        deferred_field: fields.TextField({
                            deferred: true,
                            name: "deferred_field",
                            nonnull: false,
                            required: false,
                            strip: true
                        }),
                        enumeration_field: fields.EnumerationField({
                            enumeration: [1, 2, 3],
                            name: "enumeration_field",
                            nonnull: false,
                            required: false
                        }),
                        float_field: fields.FloatField({
                            name: "float_field",
                            nonnull: false,
                            required: false
                        }),
                        integer_field: fields.IntegerField({
                            name: "integer_field",
                            nonnull: false,
                            operators: ["eq", "in", "gte", "lt", "lte", "gt"],
                            required: false,
                            sortable: true
                        }),
                        name: fields.TextField({
                            name: "name",
                            nonnull: true,
                            required: false,
                            sortable: true,
                            strip: true
                        }),
                        required_field: fields.TextField({
                            name: "required_field",
                            nonnull: true,
                            operators: ["eq", "ne", "pre", "suf", "cnt"],
                            required: false,
                            sortable: true,
                            strip: true
                        }),
                        structure_field: fields.StructureField({
                            name: "structure_field",
                            nonnull: false,
                            required: false,
                            strict: true,
                            structure: {
                                optional_field: fields.IntegerField({
                                    name: "optional_field",
                                    nonnull: false,
                                    required: false
                                }),
                                required_field: fields.IntegerField({
                                    name: "required_field",
                                    nonnull: false,
                                    required: true
                                }),
                                structure_field: fields.StructureField({
                                    name: "structure_field",
                                    nonnull: false,
                                    required: false,
                                    strict: true,
                                    structure: {
                                        optional_field: fields.IntegerField({
                                            name: "optional_field",
                                            nonnull: false,
                                            required: false
                                        }),
                                        required_field: fields.IntegerField({
                                            name: "required_field",
                                            nonnull: false,
                                            required: true
                                        })
                                    }
                                })
                            }
                        }),
                        text_field: fields.TextField({
                            name: "text_field",
                            nonnull: false,
                            required: false,
                            strip: true
                        })
                    }
                })
            })
        },
        __schema__: {
            boolean_field: fields.BooleanField({
                name: "boolean_field",
                nonnull: false,
                required: false
            }),
            composition: fields.StructureField({
                name: "composition",
                nonnull: true,
                required: false,
                strict: true,
                polymorphic_on: fields.EnumerationField({
                    enumeration: ["attribute-filter", "datasource-list", "extant"],
                    name: "type",
                    nonnull: true,
                    required: true
                }),
                structure: {
                    "attribute-filter": {
                        expression: fields.TextField({
                            min_length: 1,
                            name: "expression",
                            nonnull: true,
                            required: true,
                            strip: true
                        }),
                        type: fields.EnumerationField({
                            constant: "attribute-filter",
                            enumeration: ["attribute-filter", "datasource-list", "extant"],
                            name: "type",
                            nonnull: true,
                            representation: "'attribute-filter', 'datasource-list', 'extant'",
                            required: true
                        })
                    },
                    "datasource-list": {
                        datasources: fields.SequenceField({
                            name: "datasources",
                            nonnull: true,
                            required: true,
                            unique: false,
                            item: fields.StructureField({
                                nonnull: true,
                                required: false,
                                strict: true,
                                structure: {
                                    id: fields.UUIDField({
                                        name: "id",
                                        nonnull: true,
                                        required: true
                                    }),
                                    name: fields.TextField({
                                        name: "name",
                                        nonnull: false,
                                        readonly: true,
                                        required: false,
                                        strip: true
                                    })
                                }
                            })
                        }),
                        type: fields.EnumerationField({
                            constant: "datasource-list",
                            enumeration: ["attribute-filter", "datasource-list", "extant"],
                            name: "type",
                            nonnull: true,
                            representation: "'attribute-filter', 'datasource-list', 'extant'",
                            required: true
                        })
                    },
                    extant: {
                        type: fields.EnumerationField({
                            constant: "extant",
                            enumeration: ["attribute-filter", "datasource-list", "extant"],
                            name: "type",
                            nonnull: true,
                            representation: "'attribute-filter', 'datasource-list', 'extant'",
                            required: true
                        })
                    }
                }
            }),
            constrained_field: fields.IntegerField({
                maximum: 4,
                minimum: 2,
                name: "constrained_field",
                nonnull: false,
                required: false
            }),
            date_field: fields.DateField({
                name: "date_field",
                nonnull: false,
                required: false
            }),
            datetime_field: fields.DateTimeField({
                name: "datetime_field",
                nonnull: false,
                required: false,
                utc: false
            }),
            default_field: fields.IntegerField({
                "default": 1,
                name: "default_field",
                nonnull: false,
                required: false
            }),
            deferred_field: fields.TextField({
                deferred: true,
                name: "deferred_field",
                nonnull: false,
                required: false,
                strip: true
            }),
            enumeration_field: fields.EnumerationField({
                enumeration: [1, 2, 3],
                name: "enumeration_field",
                nonnull: false,
                required: false
            }),
            float_field: fields.FloatField({
                name: "float_field",
                nonnull: false,
                required: false
            }),
            id: fields.UUIDField({
                name: "id",
                nonnull: true,
                oncreate: true,
                operators: "equal",
                required: true
            }),
            integer_field: fields.IntegerField({
                name: "integer_field",
                nonnull: false,
                operators: ["eq", "in", "gte", "lt", "lte", "gt"],
                required: false,
                sortable: true
            }),
            name: fields.TextField({
                name: "name",
                nonnull: true,
                required: true,
                sortable: true,
                strip: true
            }),
            readonly_field: fields.IntegerField({
                name: "readonly_field",
                nonnull: false,
                readonly: true,
                required: false
            }),
            required_field: fields.TextField({
                name: "required_field",
                nonnull: true,
                operators: ["eq", "ne", "pre", "suf", "cnt"],
                required: true,
                sortable: true,
                strip: true
            }),
            structure_field: fields.StructureField({
                name: "structure_field",
                nonnull: false,
                required: true,
                strict: true,
                structure: {
                    optional_field: fields.IntegerField({
                        name: "optional_field",
                        nonnull: false,
                        required: false
                    }),
                    required_field: fields.IntegerField({
                        name: "required_field",
                        nonnull: false,
                        required: true
                    }),
                    structure_field: fields.StructureField({
                        name: "structure_field",
                        nonnull: false,
                        required: false,
                        strict: true,
                        structure: {
                            optional_field: fields.IntegerField({
                                name: "optional_field",
                                nonnull: false,
                                required: false
                            }),
                            required_field: fields.IntegerField({
                                name: "required_field",
                                nonnull: false,
                                required: true
                            })
                        }
                    })
                }
            }),
            text_field: fields.TextField({
                name: "text_field",
                nonnull: false,
                required: false,
                strip: true
            }),
            type: fields.EnumerationField({
                enumeration: ["immutable", "mutable"],
                name: "type",
                nonnull: true,
                onupdate: false,
                required: true
            })
        }
    });

    if (model.preloaded) {
        preloadedRaw = model.preloaded[resource.prototype.__bundle__];
        if (preloadedRaw) {
            resource.preloaded = resource.collection();
            for (var i = 0; i < preloadedRaw.length; i++) {
                resource.preloaded.add(resource.models.instantiate(preloadedRaw[i]));
            }
        }
    }

    return resource;
});
