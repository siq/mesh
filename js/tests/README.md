## mesh js test directory

these tests use the `Example` resource defined in `mesh/js/tests/example.js`.
this file is generated using the `mesh.javascript` [bake][] task:

    $ cd path/to/mesh/repository
    $ bake -m mesh.tasks mesh.javascript bundle=tests.js_fixtures.primary_bundle version=[1,0] path=js/tests/

**so here's the downside**

i also had to change the dependency list in the generated resources from
something like this:

    define([
        'mesh/request',
        'mesh/fields',
        'mesh/model',
        'mesh/collection'
    ], function(Request, fields, model, collection) {
        // ...
    });

to something like this:

    define([
        './../request',
        './../fields',
        './../model',
        './../collection'
    ], function(Request, fields, model, collection) {
        // ...
    });

i don't know why.  hopefully someday we won't need that.

[bake]: https://github.com/siq/bake
