define([
    'class',
    'datetime',
    'fields',
    'request',
    'collection',
    'model'
], function(Class, datetime, fields, Request, collection, model) {
    return {
        Class: Class,
        Collection: collection.Collection,
        datetime: datetime,
        fields: fields,
        Manager: model.Manager,
        Model: model.Model,
        Query: collection.Query,
        Request: Request,
        Time: datetime.Time
    };
});
