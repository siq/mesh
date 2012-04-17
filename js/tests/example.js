define([
    'path!mesh:model',
    'path!mesh:request',
    'path!mesh:fields'
], function(model, Request, fields) {
    return model.Model.extend({
        __name__: "example",
        __requests__: {
            create: Request({
                bundle: "primary-1.0",
                method: "POST",
                mimetype: "application/json",
                name: "create",
                path: "/primary/1.0/example",
                responses: {
                    200: {
                        mimetype: "application/json",
                        status: "OK",
                        schema: fields.StructureField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            structure: {
                                id: fields.IntegerField({
                                    name: "id",
                                    nonnull: true,
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
                                    item: fields.MapField({
                                        nonnull: false,
                                        required: false,
                                        value: fields.TextField({
                                            nonnull: true,
                                            pattern: null,
                                            required: false
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
                    structure: {
                        boolean_field: fields.BooleanField({
                            name: "boolean_field",
                            nonnull: false,
                            required: false
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
                            required: false
                        }),
                        default_field: fields.IntegerField({
                            default: 1,
                            name: "default_field",
                            nonnull: false,
                            required: false
                        }),
                        deferred_field: fields.TextField({
                            deferred: true,
                            name: "deferred_field",
                            nonnull: false,
                            pattern: null,
                            required: false
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
                        map_field: fields.MapField({
                            name: "map_field",
                            nonnull: false,
                            required: false,
                            value: fields.IntegerField({
                                nonnull: false,
                                required: false
                            })
                        }),
                        required_field: fields.TextField({
                            name: "required_field",
                            nonnull: true,
                            operators: ["eq", "ne", "pre", "suf", "cnt"],
                            pattern: null,
                            required: true,
                            sortable: true
                        }),
                        sequence_field: fields.SequenceField({
                            name: "sequence_field",
                            nonnull: false,
                            required: false,
                            item: fields.IntegerField({
                                nonnull: false,
                                required: false
                            })
                        }),
                        structure_field: fields.StructureField({
                            name: "structure_field",
                            nonnull: false,
                            required: false,
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
                        }),
                        text_field: fields.TextField({
                            name: "text_field",
                            nonnull: false,
                            pattern: null,
                            required: false
                        }),
                        time_field: fields.TimeField({
                            name: "time_field",
                            nonnull: false,
                            required: false
                        }),
                        tuple_field: fields.TupleField({
                            name: "tuple_field",
                            nonnull: false,
                            required: false,
                            values: [
                                fields.TextField({
                                    nonnull: false,
                                    pattern: null,
                                    required: false
                                }),
                                fields.IntegerField({
                                    nonnull: false,
                                    required: false
                                })
                            ]
                        }),
                        union_field: fields.UnionField({
                            name: "union_field",
                            nonnull: false,
                            required: false,
                            fields: [
                                fields.TextField({
                                    nonnull: false,
                                    pattern: null,
                                    required: false
                                }),
                                fields.IntegerField({
                                    nonnull: false,
                                    required: false
                                })
                            ]
                        })
                    }
                })
            }),
            custom: Request({
                bundle: "primary-1.0",
                method: "POST",
                mimetype: "application/json",
                name: "custom",
                path: "/primary/1.0/example/id/custom",
                responses: {
                    200: {
                        mimetype: "application/json",
                        status: "OK",
                        schema: fields.StructureField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            structure: {
                                id: fields.IntegerField({
                                    name: "id",
                                    nonnull: true,
                                    required: true
                                })
                            }
                        })
                    }
                },
                schema: fields.StructureField({
                    name: "request",
                    nonnull: false,
                    required: false,
                    structure: {
                        optional_field: fields.TextField({
                            name: "optional_field",
                            nonnull: false,
                            pattern: null,
                            required: false
                        })
                    }
                })
            }),
            "delete": Request({
                bundle: "primary-1.0",
                method: "DELETE",
                mimetype: "application/json",
                name: "delete",
                path: "/primary/1.0/example/id",
                schema: null,
                responses: {
                    200: {
                        mimetype: "application/json",
                        status: "OK",
                        schema: fields.StructureField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            structure: {
                                id: fields.IntegerField({
                                    name: "id",
                                    nonnull: true,
                                    required: true
                                })
                            }
                        })
                    }
                }
            }),
            filtered_update: Request({
                bundle: "primary-1.0",
                method: "POST",
                mimetype: "application/json",
                name: "filtered_update",
                path: "/primary/1.0/example/id",
                responses: {
                    200: {
                        mimetype: "application/json",
                        status: "OK",
                        schema: fields.StructureField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            structure: {
                                id: fields.IntegerField({
                                    name: "id",
                                    nonnull: true,
                                    required: true
                                })
                            }
                        })
                    }
                },
                schema: fields.StructureField({
                    name: "request",
                    nonnull: false,
                    required: false,
                    structure: {
                        operation: fields.TextField({
                            constant: "filter",
                            name: "operation",
                            nonnull: false,
                            pattern: null,
                            required: true
                        })
                    }
                })
            }),
            get: Request({
                bundle: "primary-1.0",
                method: "GET",
                mimetype: "application/x-www-form-urlencoded",
                name: "get",
                path: "/primary/1.0/example/id",
                responses: {
                    200: {
                        mimetype: "application/json",
                        status: "OK",
                        schema: fields.StructureField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            structure: {
                                boolean_field: fields.BooleanField({
                                    name: "boolean_field",
                                    nonnull: false,
                                    required: false
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
                                    required: false
                                }),
                                default_field: fields.IntegerField({
                                    default: 1,
                                    name: "default_field",
                                    nonnull: false,
                                    required: false
                                }),
                                deferred_field: fields.TextField({
                                    deferred: true,
                                    name: "deferred_field",
                                    nonnull: false,
                                    pattern: null,
                                    required: false
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
                                id: fields.IntegerField({
                                    name: "id",
                                    nonnull: true,
                                    required: true
                                }),
                                integer_field: fields.IntegerField({
                                    name: "integer_field",
                                    nonnull: false,
                                    operators: ["eq", "in", "gte", "lt", "lte", "gt"],
                                    required: false,
                                    sortable: true
                                }),
                                map_field: fields.MapField({
                                    name: "map_field",
                                    nonnull: false,
                                    required: false,
                                    value: fields.IntegerField({
                                        nonnull: false,
                                        required: false
                                    })
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
                                    pattern: null,
                                    required: false,
                                    sortable: true
                                }),
                                sequence_field: fields.SequenceField({
                                    name: "sequence_field",
                                    nonnull: false,
                                    required: false,
                                    item: fields.IntegerField({
                                        nonnull: false,
                                        required: false
                                    })
                                }),
                                structure_field: fields.StructureField({
                                    name: "structure_field",
                                    nonnull: false,
                                    required: false,
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
                                }),
                                text_field: fields.TextField({
                                    name: "text_field",
                                    nonnull: false,
                                    pattern: null,
                                    required: false
                                }),
                                time_field: fields.TimeField({
                                    name: "time_field",
                                    nonnull: false,
                                    required: false
                                }),
                                tuple_field: fields.TupleField({
                                    name: "tuple_field",
                                    nonnull: false,
                                    required: false,
                                    values: [
                                        fields.TextField({
                                            nonnull: false,
                                            pattern: null,
                                            required: false
                                        }),
                                        fields.IntegerField({
                                            nonnull: false,
                                            required: false
                                        })
                                    ]
                                }),
                                union_field: fields.UnionField({
                                    name: "union_field",
                                    nonnull: false,
                                    required: false,
                                    fields: [
                                        fields.TextField({
                                            nonnull: false,
                                            pattern: null,
                                            required: false
                                        }),
                                        fields.IntegerField({
                                            nonnull: false,
                                            required: false
                                        })
                                    ]
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
                                    item: fields.MapField({
                                        nonnull: false,
                                        required: false,
                                        value: fields.TextField({
                                            nonnull: true,
                                            pattern: null,
                                            required: false
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
                    structure: {
                        exclude: fields.SequenceField({
                            name: "exclude",
                            nonnull: false,
                            required: false,
                            item: fields.EnumerationField({
                                nonnull: true,
                                required: false,
                                enumeration: [
                                    "boolean_field",
                                    "constrained_field",
                                    "date_field",
                                    "datetime_field",
                                    "default_field",
                                    "enumeration_field",
                                    "float_field",
                                    "integer_field",
                                    "map_field",
                                    "readonly_field",
                                    "required_field",
                                    "sequence_field",
                                    "structure_field",
                                    "text_field",
                                    "time_field",
                                    "tuple_field",
                                    "union_field"
                                ]
                            })
                        }),
                        include: fields.SequenceField({
                            name: "include",
                            nonnull: false,
                            required: false,
                            item: fields.EnumerationField({
                                enumeration: ["deferred_field"],
                                nonnull: true,
                                required: false
                            })
                        })
                    }
                })
            }),
            query: Request({
                bundle: "primary-1.0",
                method: "GET",
                mimetype: "application/x-www-form-urlencoded",
                name: "query",
                path: "/primary/1.0/example",
                responses: {
                    200: {
                        mimetype: "application/json",
                        status: "OK",
                        schema: fields.StructureField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            structure: {
                                resources: fields.SequenceField({
                                    name: "resources",
                                    nonnull: true,
                                    required: false,
                                    item: fields.StructureField({
                                        nonnull: false,
                                        required: false,
                                        structure: {
                                            boolean_field: fields.BooleanField({
                                                name: "boolean_field",
                                                nonnull: false,
                                                required: false
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
                                                required: false
                                            }),
                                            default_field: fields.IntegerField({
                                                default: 1,
                                                name: "default_field",
                                                nonnull: false,
                                                required: false
                                            }),
                                            deferred_field: fields.TextField({
                                                deferred: true,
                                                name: "deferred_field",
                                                nonnull: false,
                                                pattern: null,
                                                required: false
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
                                            id: fields.IntegerField({
                                                name: "id",
                                                nonnull: true,
                                                required: true
                                            }),
                                            integer_field: fields.IntegerField({
                                                name: "integer_field",
                                                nonnull: false,
                                                operators: ["eq", "in", "gte", "lt", "lte", "gt"],
                                                required: false,
                                                sortable: true
                                            }),
                                            map_field: fields.MapField({
                                                name: "map_field",
                                                nonnull: false,
                                                required: false,
                                                value: fields.IntegerField({
                                                    nonnull: false,
                                                    required: false
                                                })
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
                                                pattern: null,
                                                required: false,
                                                sortable: true
                                            }),
                                            sequence_field: fields.SequenceField({
                                                name: "sequence_field",
                                                nonnull: false,
                                                required: false,
                                                item: fields.IntegerField({
                                                    nonnull: false,
                                                    required: false
                                                })
                                            }),
                                            structure_field: fields.StructureField({
                                                name: "structure_field",
                                                nonnull: false,
                                                required: false,
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
                                            }),
                                            text_field: fields.TextField({
                                                name: "text_field",
                                                nonnull: false,
                                                pattern: null,
                                                required: false
                                            }),
                                            time_field: fields.TimeField({
                                                name: "time_field",
                                                nonnull: false,
                                                required: false
                                            }),
                                            tuple_field: fields.TupleField({
                                                name: "tuple_field",
                                                nonnull: false,
                                                required: false,
                                                values: [
                                                    fields.TextField({
                                                        nonnull: false,
                                                        pattern: null,
                                                        required: false
                                                    }),
                                                    fields.IntegerField({
                                                        nonnull: false,
                                                        required: false
                                                    })
                                                ]
                                            }),
                                            union_field: fields.UnionField({
                                                name: "union_field",
                                                nonnull: false,
                                                required: false,
                                                fields: [
                                                    fields.TextField({
                                                        nonnull: false,
                                                        pattern: null,
                                                        required: false
                                                    }),
                                                    fields.IntegerField({
                                                        nonnull: false,
                                                        required: false
                                                    })
                                                ]
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
                                    item: fields.MapField({
                                        nonnull: false,
                                        required: false,
                                        value: fields.TextField({
                                            nonnull: true,
                                            pattern: null,
                                            required: false
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
                    structure: {
                        exclude: fields.SequenceField({
                            name: "exclude",
                            nonnull: false,
                            required: false,
                            item: fields.EnumerationField({
                                nonnull: true,
                                required: false,
                                enumeration: [
                                    "boolean_field",
                                    "constrained_field",
                                    "date_field",
                                    "datetime_field",
                                    "default_field",
                                    "enumeration_field",
                                    "float_field",
                                    "integer_field",
                                    "map_field",
                                    "readonly_field",
                                    "required_field",
                                    "sequence_field",
                                    "structure_field",
                                    "text_field",
                                    "time_field",
                                    "tuple_field",
                                    "union_field"
                                ]
                            })
                        }),
                        include: fields.SequenceField({
                            name: "include",
                            nonnull: false,
                            required: false,
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
                            default: 0,
                            minimum: 0,
                            name: "offset",
                            nonnull: false,
                            required: false
                        }),
                        query: fields.StructureField({
                            name: "query",
                            nonnull: false,
                            required: false,
                            structure: {
                                integer_field__gt: fields.IntegerField({
                                    name: "integer_field__gt",
                                    nonnull: true,
                                    required: false
                                }),
                                integer_field__gte: fields.IntegerField({
                                    name: "integer_field__gte",
                                    nonnull: true,
                                    required: false
                                }),
                                integer_field__in: fields.SequenceField({
                                    name: "integer_field__in",
                                    nonnull: true,
                                    required: false,
                                    item: fields.IntegerField({
                                        nonnull: true,
                                        required: false
                                    })
                                }),
                                integer_field__lt: fields.IntegerField({
                                    name: "integer_field__lt",
                                    nonnull: true,
                                    required: false
                                }),
                                integer_field__lte: fields.IntegerField({
                                    name: "integer_field__lte",
                                    nonnull: true,
                                    required: false
                                })
                            }
                        }),
                        sort: fields.SequenceField({
                            name: "sort",
                            nonnull: false,
                            required: false,
                            item: fields.EnumerationField({
                                nonnull: true,
                                required: false,
                                enumeration: [
                                    "integer_field",
                                    "integer_field+",
                                    "integer_field-",
                                    "required_field",
                                    "required_field+",
                                    "required_field-"
                                ]
                            })
                        }),
                        total: fields.BooleanField({
                            default: false,
                            name: "total",
                            nonnull: true,
                            required: false
                        })
                    }
                })
            }),
            update: Request({
                bundle: "primary-1.0",
                method: "POST",
                mimetype: "application/json",
                name: "update",
                path: "/primary/1.0/example/id",
                responses: {
                    200: {
                        mimetype: "application/json",
                        status: "OK",
                        schema: fields.StructureField({
                            name: "response",
                            nonnull: false,
                            required: false,
                            structure: {
                                id: fields.IntegerField({
                                    name: "id",
                                    nonnull: true,
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
                                    item: fields.MapField({
                                        nonnull: false,
                                        required: false,
                                        value: fields.TextField({
                                            nonnull: true,
                                            pattern: null,
                                            required: false
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
                    structure: {
                        boolean_field: fields.BooleanField({
                            name: "boolean_field",
                            nonnull: false,
                            required: false
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
                            required: false
                        }),
                        default_field: fields.IntegerField({
                            default: 1,
                            name: "default_field",
                            nonnull: false,
                            required: false
                        }),
                        deferred_field: fields.TextField({
                            deferred: true,
                            name: "deferred_field",
                            nonnull: false,
                            pattern: null,
                            required: false
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
                        map_field: fields.MapField({
                            name: "map_field",
                            nonnull: false,
                            required: false,
                            value: fields.IntegerField({
                                nonnull: false,
                                required: false
                            })
                        }),
                        required_field: fields.TextField({
                            name: "required_field",
                            nonnull: true,
                            operators: ["eq", "ne", "pre", "suf", "cnt"],
                            pattern: null,
                            required: false,
                            sortable: true
                        }),
                        sequence_field: fields.SequenceField({
                            name: "sequence_field",
                            nonnull: false,
                            required: false,
                            item: fields.IntegerField({
                                nonnull: false,
                                required: false
                            })
                        }),
                        structure_field: fields.StructureField({
                            name: "structure_field",
                            nonnull: false,
                            required: false,
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
                        }),
                        text_field: fields.TextField({
                            name: "text_field",
                            nonnull: false,
                            pattern: null,
                            required: false
                        }),
                        time_field: fields.TimeField({
                            name: "time_field",
                            nonnull: false,
                            required: false
                        }),
                        tuple_field: fields.TupleField({
                            name: "tuple_field",
                            nonnull: false,
                            required: false,
                            values: [
                                fields.TextField({
                                    nonnull: false,
                                    pattern: null,
                                    required: false
                                }),
                                fields.IntegerField({
                                    nonnull: false,
                                    required: false
                                })
                            ]
                        }),
                        union_field: fields.UnionField({
                            name: "union_field",
                            nonnull: false,
                            required: false,
                            fields: [
                                fields.TextField({
                                    nonnull: false,
                                    pattern: null,
                                    required: false
                                }),
                                fields.IntegerField({
                                    nonnull: false,
                                    required: false
                                })
                            ]
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
                required: false
            }),
            default_field: fields.IntegerField({
                default: 1,
                name: "default_field",
                nonnull: false,
                required: false
            }),
            deferred_field: fields.TextField({
                deferred: true,
                name: "deferred_field",
                nonnull: false,
                pattern: null,
                required: false
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
            id: fields.IntegerField({
                name: "id",
                nonnull: true,
                required: false
            }),
            integer_field: fields.IntegerField({
                name: "integer_field",
                nonnull: false,
                operators: ["eq", "in", "gte", "lt", "lte", "gt"],
                required: false,
                sortable: true
            }),
            map_field: fields.MapField({
                name: "map_field",
                nonnull: false,
                required: false,
                value: fields.IntegerField({
                    nonnull: false,
                    required: false
                })
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
                pattern: null,
                required: true,
                sortable: true
            }),
            sequence_field: fields.SequenceField({
                name: "sequence_field",
                nonnull: false,
                required: false,
                item: fields.IntegerField({
                    nonnull: false,
                    required: false
                })
            }),
            structure_field: fields.StructureField({
                name: "structure_field",
                nonnull: false,
                required: false,
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
            }),
            text_field: fields.TextField({
                name: "text_field",
                nonnull: false,
                pattern: null,
                required: false
            }),
            time_field: fields.TimeField({
                name: "time_field",
                nonnull: false,
                required: false
            }),
            tuple_field: fields.TupleField({
                name: "tuple_field",
                nonnull: false,
                required: false,
                values: [
                    fields.TextField({
                        nonnull: false,
                        pattern: null,
                        required: false
                    }),
                    fields.IntegerField({
                        nonnull: false,
                        required: false
                    })
                ]
            }),
            union_field: fields.UnionField({
                name: "union_field",
                nonnull: false,
                required: false,
                fields: [
                    fields.TextField({
                        nonnull: false,
                        pattern: null,
                        required: false
                    }),
                    fields.IntegerField({
                        nonnull: false,
                        required: false
                    })
                ]
            })
        }
    });
});
