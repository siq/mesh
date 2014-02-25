/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual, notStrictEqual, raises*/
define([
    'vendor/underscore',
    'vendor/jquery',
    './../request',
    './example'
], function(_, $, Request, Example) {
    var data, ajax = $.ajax,
        swapAjax = function(request) {
            request.ajax = function(params) {
                var dfd = $.Deferred();
                setTimeout(function() {
                    var ret = {total: 0, resources: []};
                    dfd.resolve(ret, {status: 200});
                    params.success(ret, 200, {status: 200});
                }, 0);
                return dfd;
            };
        },
        unswapAjax = function(request) {
            request.ajax = ajax;
        },
        ajax_failed = function() {
            throw Error('ajax request failed');
            // ok(false, 'ajax request failed');
            // start();
        };

    test('construction', function() {
        var query = Example.query(), retval;
        strictEqual(query.manager, Example.models);
        deepEqual(query.params, {});
        strictEqual(query.request.name, 'query');

        retval = query.exclude('alpha', 'beta');
        strictEqual(retval, query);
        deepEqual(query.params.exclude.sort(), ['alpha', 'beta']);

        var filters = {alpha: 'test', beta__in: [1, 2]};
        retval = query.filter(filters);
        strictEqual(retval, query);
        deepEqual(query.params.query, filters);

        retval = query.include('alpha', 'beta');
        strictEqual(retval, query);
        deepEqual(query.params.include.sort(), ['alpha', 'beta']);

        retval = query.limit(2);
        strictEqual(retval, query);
        strictEqual(query.params.limit, 2);

        retval = query.offset(2);
        strictEqual(retval, query);
        strictEqual(query.params.offset, 2);

        retval = query.sort('alpha', '-beta');
        strictEqual(retval, query);
        deepEqual(query.params.sort, ['alpha', '-beta']);

        retval = query.reset();
        strictEqual(retval, query);
        deepEqual(query.params, {});
    });

    asyncTest('count-only request', function() {
        var query = Example.query();
        swapAjax(query.request);
        query.count().then(function(total) {
            strictEqual(total, 0);
            unswapAjax(query.request);
            start();
        }, ajax_failed);
    });

    asyncTest('empty result', function() {
        var query = Example.query();
        swapAjax(query.request);
        query.execute().then(function(data) {
            ok(data.complete);
            strictEqual(data.status, 'ok');
            strictEqual(data.total, 0);
            deepEqual(data.resources, []);
            unswapAjax(query.request);
            start();
        }, ajax_failed);
    });

    module('collection change events');
    data = {
        total: 10,
        resources: _(10).range().map(function(i) {
            return {id: i+1, required_value: 'foo '+i, name: 'bar '+i};
        })
    };

    asyncTest('model change triggers collection change event', function() {
        var donezo = false, collection = Example.collection(), done = false;

        collection.query.request.ajax = function(params) {
            params.success(data, 200, {});
        };

        collection.on('change', function(eventName, coll, model, changed) {
            if (!donezo) {
                ok(donezo = true); // assert that this worked
                equal(model, collection.models[0]);
                ok(coll === collection);
                deepEqual(changed, {name: true});
                start();
            }
        }).load().done(function() {
            setTimeout(function() {
                if (!donezo) {
                    ok(false, 'no change event was triggered on the collection');
                    start();
                }
            }, 100);
            collection.models[0].set('name', 'boom');
        });
    });

    asyncTest('model change triggers multiple collection change events', function() {
        var donezo = false,
            collection1 = Example.collection(),
            collection2 = Example.collection();

        collection1.query.request.ajax = collection2.query.request.ajax =
            function(params) {
                params.success(data, 200, {});
            };

        collection2.on('change', function() {
            if (!donezo) {
                ok(donezo = true);
                start();
            }
        });

        $.when(collection1.load(), collection2.load()).done(function() {
            setTimeout(function() {
                if (!donezo) {
                    donezo = true;
                    ok(false, 'no change event was triggered on the collection');
                    start();
                }
            }, 100);
            collection1.models[0].set('name', 'pow');
        });
    });

    asyncTest('added model still triggers collection change events', function() {
        var donezo = false,
            collection = Example.collection(),
            count = 0,
            addUpdateEventFired = false;

        collection.query.request.ajax = function(params) {
            params.success(data, 200, {});
        };

        collection.on('change', function(eventName, collection, model) {
            ok(donezo = true);
            ok(addUpdateEventFired);
            equal(model.name, 'pop');
            start();
        }).on('update', function(eventName, collection, models) {
            if (++count === 2) {
                equal(models[0].type, 'extra');
                addUpdateEventFired = true;
            }
        }).load().done(function() {
            setTimeout(function() {
                if (!donezo) {
                    ok(false, 'no change event was triggered on the collection');
                    start();
                }
            }, 100);
            collection.add(Example({type: 'extra'}));
            collection.models[0].set('name', 'pop');
        });
    });

    asyncTest('model destroy triggers collection update event', function() {
        var donezo = false,
            collection = Example.collection(),
            count = 0,
            origAjax;

        collection.query.request.ajax = function(params) {
            params.success(data, 200, {});
        };

        collection.on('change', function(eventName, collection, model) {
            ok(false, 'should not have triggered a change event');
            start();
        }).on('update', function(eventName, collection, models) {
            count++;
        }).load().done(function() {
            equal(count, 1);
            origAjax = collection.first().__requests__['delete'].ajax;
            collection.first().__requests__['delete'].ajax = function(params) {
                var dfd = $.Deferred();
                setTimeout(function() {
                    params.success('', 200, {});
                    dfd.resolve();
                }, 0);
                return dfd;
            };
            collection.first().destroy().then(function() {
                equal(count, 2);
                collection.first().__requests__['delete'].ajax = origAjax;
                start();
            });
        });

    });

    module('load behavior');

    var dummyAjax = function(params) {
        var num = params.data.limit? params.data.limit : 10;

        setTimeout(function() {
            var split, ret = _.reduce(_.range(num), function(memo, i) {
                memo.resources.push({name: 'item ' + i});
                if (num < 10) {
                    _.last(memo.resources).foo = 'bar';
                }
                return memo;
            }, {total: num, resources: []});
            params.success(ret, 200, {});
        }, 50);
    };

    // siq/mesh issue #10 corner case 1
    asyncTest('calling load twice w/o query change returns the same deferred', function() {
        var collection = Example.collection(), dfd1, dfd2;

        collection.query.request.ajax = dummyAjax;

        dfd1 = collection.load();
        dfd2 = collection.load();

        ok(dfd1 === dfd2, 'two consecutive calls should return the same deferred');
        $.when(dfd1, dfd2).done(start);
    });

    // siq/mesh issue #10 corner case 2
    asyncTest('calling load again after first load w/o query changes returns the same deferred', function() {
        var collection = Example.collection(), dfd1;

        collection.query.request.ajax = dummyAjax;
        dfd1 = collection.load();

        dfd1.done(function() {
            var dfd2 = collection.load();
            ok(dfd1 === dfd2, 'two calls of same query should return the same deferred');
            dfd2.done(start); // just to be safe...
        });
    });

    // siq/mesh issue #10 corner case 3 test 1
    asyncTest('call load then change query via "reset" before load finishes', function() {
        var collection = Example.collection(), cancelledDfd, newDfd, donezo = false;
        collection.query.request.ajax = dummyAjax;
        (cancelledDfd = collection.load()).then(function() {
            ok(false, 'cancelledDfd should never resolve');
            if (!donezo) {
                donezo = true;
                start();
            }
        }, function() {
            ok(false, 'cancelledDfd should never fail');
            if (!donezo) {
                donezo = true;
                start();
            }
        });

        collection.reset({limit: 5});
        newDfd = collection.load();

        ok(newDfd !== cancelledDfd, 'second load call should return a differentd dfd');

        newDfd.then(function(results) {
            ok(true, 'successfully loaded after cancelled');
            equal(results.length, 5);
            _.each(results, function(model) {equal(model.foo, 'bar');});
            if (!donezo) {
                donezo = true;
                start();
            }
        }, function() {
            ok(false, 'second deferred should not be cancelled');
            if (!donezo) {
                donezo = true;
                start();
            }
        });
    });

    // siq/mesh issue #10 corner case 3 test 2
    asyncTest('call load then change query before load finishes', function() {
        var cancelledDfd, newDfd,
            collection = Example.collection({limit: 5}),
            donezo = false;
        collection.query.request.ajax = dummyAjax;
        (cancelledDfd = collection.load()).then(function() {
            ok(false, 'cancelledDfd should never resolve');
            if (!donezo) {
                donezo = true;
                start();
            }
        }, function() {
            ok(false, 'cancelledDfd should never fail');
            if (!donezo) {
                donezo = true;
                start();
            }
        });

        newDfd = collection.load({limit: null});

        ok(newDfd !== cancelledDfd, 'second load call should return a differentd dfd');

        newDfd.then(function(results) {
            ok(true, 'successfully loaded after cancelled');
            equal(results.length, 10);
            _.each(results, function(model) {ok(model.foo == null);});
            if (!donezo) {
                donezo = true;
                start();
            }
        }, function() {
            ok(false, 'second deferred should not be cancelled');
            if (!donezo) {
                donezo = true;
                start();
            }
        });
    });

    var secondCallHasResolved = false,
        outOfOrderAjaxCount = 0,
        outOfOrderDfds = [$.Deferred(), $.Deferred()],
        outOfOrderAjax = function(params) {
            var num = params.data.limit? params.data.limit : 10,
                localCount = outOfOrderAjaxCount;

            setTimeout(function() {
                var split, ret = _.reduce(_.range(num), function(memo, i) {
                    memo.resources.push({name: 'item ' + i});
                    if (num < 10) {
                        _.last(memo.resources).foo = 'bar';
                    }
                    return memo;
                }, {total: num, resources: []});

                if (localCount === 0) {
                    equal(secondCallHasResolved, true, 'first call occurred after second');
                } else {
                    equal(secondCallHasResolved, false, 'second call occurred before first');
                    secondCallHasResolved = true;
                }

                params.success(ret, 200, {});
                if (outOfOrderDfds[localCount]) {
                    console.log('resolving dfd',localCount);
                    outOfOrderDfds[localCount].resolve();
                }
            }, outOfOrderAjaxCount > 0? 0 : 100);

            outOfOrderAjaxCount++;
        };

    // siq/mesh issue #10 corner case 3 test 3
    asyncTest('first load call returns AFTER second', function() {
        var collection = Example.collection(), cancelledDfd, newDfd, donezo = false;
        collection.query.request.ajax = outOfOrderAjax;
        (cancelledDfd = collection.load()).then(function() {
            ok(false, 'cancelledDfd should never resolve');
            if (!donezo) {
                donezo = true;
                start();
            }
        }, function() {
            ok(false, 'cancelledDfd should never fail');
            if (!donezo) {
                donezo = true;
                start();
            }
        });

        collection.reset({limit: 5});
        newDfd = collection.load();

        ok(newDfd !== cancelledDfd, 'second load call should return a differentd dfd');

        newDfd.then(function(results) {
            ok(true, 'successfully loaded after cancelled');
            equal(results.length, 5);
            _.each(results, function(model) {equal(model.foo, 'bar');});
            if (!donezo) {
                donezo = true;
                $.when.apply($, outOfOrderDfds).done(start);
            }
        }, function() {
            ok(false, 'second deferred should not be cancelled');
            if (!donezo) {
                donezo = true;
                start();
            }
        });
    });

    // siq/mesh issue #10 corner case 4 (actually more of a common case)
    asyncTest('calling load twice w/o query change returns the same deferred', function() {
        var collection = Example.collection(), dfd1, dfd2;

        collection.query.request.ajax = dummyAjax;

        dfd1 = collection.load();

        dfd1.done(function() {
            ok(true, 'first load call succeeded and resolved');
            equal(collection.models.length, 10);

            collection.reset({limit: 5});
            dfd2 = collection.load();

            ok(dfd1 !== dfd2, 'a new deferred was returned');

            dfd2.done(function() {
                ok(true, 'second load call succeeded and resolved');
                equal(collection.models.length, 5);
                start();
            });
        });
    });

    asyncTest('reload', function() {
        Example.models.clear();
        var ajaxCount = 0, collection = Example.collection();

        collection.query.request.ajax = function(params) {
            var num = params.data.limit? params.data.limit : 10;

            ajaxCount++;

            setTimeout(function() {
                var split, ret = _.reduce(_.range(num), function(memo, i) {
                    memo.resources.push({name: 'item ' + i, id: i+1234});
                    return memo;
                }, {total: num, resources: []});
                params.success(ret, 200, {});
            }, 50);
        };

        collection.load().done(function() {
            equal(ajaxCount, 1);
            collection.load().done(function() {
                equal(ajaxCount, 1);
                collection.load({reload: true}).done(function() {
                    equal(ajaxCount, 2);
                    collection.load().done(function() {
                        equal(ajaxCount, 2);
                        start();
                    }).fail(function() {
                        ok(false, '4th colleciton load failed');
                        start();
                    });
                }).fail(function() {
                    ok(false, '3rd colleciton load failed');
                    start();
                });
            }).fail(function() {
                ok(false, '2nd colleciton load failed');
                start();
            });
        }).fail(function() {
            ok(false, '1st colleciton load failed');
            start();
        });
    });

    asyncTest('refresh', function() {
        Example.models.clear();
        var ajaxCount = 0, collection = Example.collection();

        collection.query.request.ajax = function(params) {
            var num = params.data.limit? params.data.limit : 10;

            ajaxCount++;

            setTimeout(function() {
                var split, ret = _.reduce(_.range(num), function(memo, i) {
                    memo.resources.push({name: 'item ' + i, id: i+1234});
                    return memo;
                }, {total: num, resources: []});
                if (ajaxCount === 2) {
                    ret.resources[0].name = 'new name';
                }
                params.success(ret, 200, {});
            }, 50);
        };

        collection.load().done(function() {
            equal(ajaxCount, 1);
            collection.load().done(function(models) {
                var model = models[0];
                equal(ajaxCount, 1);
                equal(model.name, 'item 0');
                collection.refresh().done(function(models) {
                    var model = models[0];
                    equal(model.name, 'new name');
                    equal(ajaxCount, 2);
                    collection.refresh().done(function() {
                        equal(model.name, 'item 0');
                        equal(ajaxCount, 3);
                        start();
                    }).fail(function() {
                        ok(false, '4th colleciton load failed');
                        start();
                    });
                }).fail(function() {
                    ok(false, '3rd colleciton load failed');
                    start();
                });
            }).fail(function() {
                ok(false, '2nd colleciton load failed');
                start();
            });
        }).fail(function() {
            ok(false, '1st colleciton load failed');
            start();
        });
    });

    module('pageing');

    var pageingAjaxCount = 0;
    var pageingAjax = function(params) {
        var limit = params.data.limit,
            offset = params.data.offset,
            newData = $.extend(true, {}, data);

        pageingAjaxCount++;
        if(limit) {
            newData.resources = data.resources.slice(offset, offset + limit);
        }
        params.success(newData, 200, {});
    };

    asyncTest("paging w/ reload doesn't change paging values (limit/offset)", function() {
        Example.models.clear();
        var ajaxCount = 0, collection = Example.collection();

        collection.query.request.ajax = function(params) {
            var num = params.data.limit? params.data.limit : 10;

            ajaxCount++;

            setTimeout(function() {
                var split, ret = _.reduce(_.range(num), function(memo, i) {
                    memo.resources.push({name: 'item ' + i, id: i+1234});
                    return memo;
                }, {total: num, resources: []});
                params.success(ret, 200, {});
            }, 50);
        };

        collection.load({limit: 5}).done(function(data) {
            equal(ajaxCount, 1);
            equal(data.length, 5);
            collection.load().done(function(data) {
                equal(ajaxCount, 1);
                equal(data.length, 5);
                collection.load({reload: true}).done(function(data) {
                    equal(ajaxCount, 2);
                    equal(data.length, 5);
                    collection.load().done(function(data) {
                        equal(ajaxCount, 2);
                        equal(data.length, 5);
                        start();
                    }).fail(function() {
                        ok(false, '4th colleciton load failed');
                        start();
                    });
                }).fail(function() {
                    ok(false, '3rd colleciton load failed');
                    start();
                });
            }).fail(function() {
                ok(false, '2nd colleciton load failed');
                start();
            });
        }).fail(function() {
            ok(false, '1st colleciton load failed');
            start();
        });
    });

    asyncTest('pageing w/ cache and no limit', function() {
        var collection = Example.collection(),
            dfd1, dfd2, dfd3;

        pageingAjaxCount = 0;
        collection.query.request.ajax = pageingAjax;

        dfd1 = collection.load(); // load everything
        dfd1.done(function(data) {
            equal(data.length, collection.total);
            equal(pageingAjaxCount, 1); // no cache
            dfd2 = collection.load();
            dfd2.done(function(data) {
                equal(data.length, collection.total);
                equal(pageingAjaxCount, 1); // load from cache
                start();
                // offset with no limit load cache from offset to end
                dfd3 = collection.load({offset: 5});
                dfd3.done(function(data) {
                    equal(data.length, 5);
                    equal(pageingAjaxCount, 1); // load from cache
                    start();
                }).fail(function() {
                    ok(false, '3rd colleciton load failed');
                    start();
                });
            }).fail(function() {
                ok(false, '2nd colleciton load failed');
                start();
            });
        }).fail(function() {
            ok(false, '1st colleciton load failed');
            start();
        });
    });

    asyncTest('paging w/ caching', function() {
        var collection = Example.collection(),
            dfd1, dfd2, dfd3, dfd4;

        pageingAjaxCount = 0;
        collection.query.request.ajax = pageingAjax;

        dfd1 = collection.load({offset: 0, limit: 5});
        dfd1.done(function(data) {
            equal(data.length, 5);
            equal(pageingAjaxCount, 1);
            dfd2 = collection.load();
            dfd2.done(function(data) {
                ok(dfd1 === dfd2, 'the same deferred was returned');
                equal(data.length, 5);
                equal(pageingAjaxCount, 1);
                dfd3 = collection.load({offset: 5, limit: 5});
                dfd3.done(function(data) {
                    ok(dfd2 !== dfd3, 'a new deferred was returned');
                    equal(data.length, 5);
                    equal(pageingAjaxCount, 2);
                    var cacheData = data;
                    dfd4 = collection.load({offset: 0, limit: 5});
                    dfd4.done(function(data) {
                        // a new deferred was returned but it was a cached page.
                        ok(dfd3 !== dfd4, 'a new deferred was returned');
                        equal(pageingAjaxCount, 2, 'a cached page was returned (no ajax call)');
                        ok(!_.isEqual(cacheData, data), 'different pages (data)');
                        equal(data.length, 5);
                        start();
                    }).fail(function() {
                        ok(false, '4th colleciton load failed');
                        start();
                    });
                }).fail(function() {
                    ok(false, '3rd colleciton load failed');
                    start();
                });
            }).fail(function() {
                ok(false, '2nd colleciton load failed');
                start();
            });
        }).fail(function() {
            ok(false, '1st colleciton load failed');
            start();
        });
    });

    asyncTest('paging w/ cache containing null values', function() {
        var collection = Example.collection(),
            dfd1, dfd2;

        pageingAjaxCount = 0;
        collection.query.request.ajax = pageingAjax;

        dfd1 = collection.load({offset: 5, limit: 5});
        dfd1.done(function(data) {
            equal(data.length, 5);
            equal(pageingAjaxCount, 1);
            dfd2 = collection.load({offset: 0, limit: 10});
            dfd2.done(function(data) {
                ok(dfd1 !== dfd2, 'a new deferred was returned');
                equal(data.length, 10);
                //ajax call was made because some of the values where not cached
                equal(pageingAjaxCount, 2);
                start();
            }).fail(function() {
                ok(false, '2nd colleciton load failed');
                start();
            });
        }).fail(function() {
            ok(false, '1st colleciton load failed');
            start();
        });
    });

    asyncTest('paging w/ underflow cache', function() {
        var collection = Example.collection(),
            dfd1, dfd2;

        collection.query.request.ajax = pageingAjax;

        dfd1 = collection.load({offset: 0, limit: 5});
        dfd1.done(function(data) {
            equal(data.length, 5);
            dfd2 = collection.load({offset: 0, limit: 7});
            dfd2.done(function(data) {
                equal(data.length, 7);
                start();
            }).fail(function() {
                ok(false, '2nd colleciton load failed');
                start();
            });
        }).fail(function() {
            ok(false, '1st colleciton load failed');
            start();
        });
    });

    asyncTest("calling load w/ limit out of range doesn't break further queries", function() {
        var collection = Example.collection(),
            query1 = {limit: 4, offset: 8},
            query2 = {limit: 4, offset: 5},
            dfd1, dfd2, dfd3;

        collection.query.request.ajax = pageingAjax;


        dfd1 = collection.load();
        dfd1.done(function(models) {
            equal(collection.total, 10);
            equal(models.length, 10);

            dfd2 = collection.load(query1);
            ok(dfd1 !== dfd2, 'new deferred');

            dfd2.done(function(models) {
                // length = (total - offset) = 2 because (total - offset) < limit
                equal(models.length, 2);

                dfd3 = collection.load(query2);
                ok(dfd2 !== dfd3, 'new deferred');

                dfd3.done(function(models) {
                    // length = 4
                    equal(models.length, 4);

                    start();
                });
            });
        });
    });

    // siq/mesh issue #11 corner case 1
    asyncTest("calling load w/ changed query params in place doesn't break further queries", function() {
        var collection = Example.collection(),
            query1, query2,
            dfd1, dfd2, dfd3;

        query1 = query2 = {limit: 4, offset: 8};
        equal(query1, query2, 'query1 is equal to query2');

        collection.query.request.ajax = pageingAjax;

        dfd1 = collection.load();
        dfd1.done(function(models) {
            equal(collection.total, 10);
            equal(models.length, 10);

            dfd2 = collection.load(query1);
            ok(dfd1 !== dfd2, 'new deferred');

            dfd2.done(function(models) {
                // length = (total - offset) = 2 because (total - offset) < limit
                equal(models.length, 2);

                query2.limit = 4;
                query2.offset = 5;
                equal(query1, query2, 'query1 is equal to query2');

                dfd3 = collection.load(query2);
                ok(dfd2 !== dfd3, 'new deferred');

                dfd3.done(function(models) {
                    // length = 4
                    equal(models.length, 4);

                    start();
                });
            });
        });
    });

    asyncTest("getting the current page", function() {
        var collection = Example.collection(),
            query1 = {limit: 5, offset: 5},
            query2 = {limit: 4, offset: 0},
            dfd1, dfd2, dfd3;

        collection.query.request.ajax = pageingAjax;

        dfd1 = collection.load();
        dfd1.done(function() {
            equal(collection.total, 10);
            equal(collection.currentPage().length, 10);

            dfd2 = collection.load(query1);
            dfd2.done(function() {
                equal(collection.total, 10);
                equal(collection.currentPage().length, query1.limit);

                dfd3 = collection.load(query2);
                dfd3.done(function() {
                    equal(collection.total, 10);
                    equal(collection.currentPage().length, query2.limit);

                    start();
                });
            });
        });
    });

    asyncTest("getting the current page with limit out of range ", function() {
        var collection = Example.collection(),
            query1 = {limit: 8, offset: 5},
            pageLength = 5,
            dfd1, dfd2;

        collection.query.request.ajax = pageingAjax;

        dfd1 = collection.load();
        dfd1.done(function() {
            equal(collection.total, 10);
            equal(collection.currentPage().length, 10);

            dfd2 = collection.load(query1);
            dfd2.done(function() {
                equal(collection.total, 10);
                equal(collection.currentPage().length, pageLength);

                start();
            });
        });
    });

    asyncTest("reference to query.params.limit/offset doesn't get lost", function() {
        var collection = Example.collection(),
            query1 = {limit: 3, offset: 8},
            query2 = {limit: 3, offset: 5},
            dfd1, dfd2;

        collection.query.request.ajax = pageingAjax;

        dfd1 = collection.load(query1);
        dfd1.done(function() {
            equal(collection.total, 10);
            equal(collection.currentPage().length, 2);

            dfd2 = collection.load(query2);
            dfd2.done(function() {
                equal(collection.total, 10);
                equal(collection.currentPage().length, query2.limit);

                dfd1 = collection.load(query1);
                dfd1.done(function() {
                    equal(collection.total, 10);
                    equal(collection.currentPage().length, 2);

                    start();
                });
            });
        });
    });
    
    module("windowing");
    
    var windowingAjaxCount = 0,
        windowingAjax = function(params) {
        var limit = params.data.limit,
            offset = params.data.offset,
            newData = $.extend(true, {}, data);

        windowingAjaxCount++;
        if(limit) {
            newData.resources = data.resources.slice(offset, offset + limit);
        }

        params.success(newData, 200, {});

    };
    
    asyncTest("load does not break when only a portion of data is in cache and remaining is on server (or fixture)", function() {
        var collection = Example.collection(),
            query1 = {limit: 3, offset: 8},
            query2 = {limit: 3, offset: 5},
            dfd1, dfd2;
            
        windowingAjaxCount = 0;
        collection.query.request.ajax = windowingAjax;
        window.c = collection;
        collection.load({offset:0,limit:3})
            .done(function(data){
                equal(data.length,3,"data length equals limit");
                equal(windowingAjaxCount,1,"first call made");
                collection.load({offset:3,limit:5})
                    .done(function(models){
                        equal(models.length,5,"data length equals limit");
                        equal(windowingAjaxCount,2,"second call made");
                        collection.load({offset:5,limit:5})
                            .done(function(_models){
                                equal(_models.length,5,"data length equals limit");
                                equal(windowingAjaxCount,3,"third call made");
                            })
                            .fail(function() {
                                ok(false, '3rd colleciton load failed');
                                start();
                            });
                    })
                    .fail(function() {
                        ok(false, '2nd colleciton load failed');
                        start();
                    });
            })
            .fail(function() {
                ok(false, '1st colleciton load failed');
                start();
            });
        ok(true);
        start();
    });
    
    asyncTest("Deferred object from the last (previous) load always resolves", function() {
        var collection = Example.collection(),
            query1 = {limit: 3, offset: 8},
            query2 = {limit: 3, offset: 5},
            dfd1, dfd2;
            
        windowingAjaxCount = 0;
        collection.query.request.ajax = windowingAjax;
        window.c = collection;
        collection.load({offset:0,limit:3})
            .done(function(data){
                equal(data.length,3,"data length equals limit");
                equal(windowingAjaxCount,1,"first call made");
                collection.load({offset:3,limit:3})
                    .done(function(models){
                        equal(models.length,3,"data length equals limit");
                        equal(windowingAjaxCount,2,"second call made");
                        collection.load({offset:0,limit:3})
                            .done(function(_models){
                                equal(_models.length,3,"data length equals limit");
                                equal(windowingAjaxCount,2,"third call queried from cache,no XHR");
                                collection.load({offset:3,limit:3})
                                    .done(function(_models){
                                        equal(_models.length,3,"data length equals limit");
                                        equal(windowingAjaxCount,2,"four    th call queried from cache,no XHR");
                                    })
                                    .fail(function() {
                                        ok(false, '4th colleciton load failed');
                                        start();
                                    });
                            })
                            .fail(function() {
                                ok(false, '3rd colleciton load failed');
                                start();
                            });
                    })
                    .fail(function() {
                        ok(false, '2nd colleciton load failed');
                        start();
                    });
            })
            .fail(function() {
                ok(false, '1st colleciton load failed');
                start();
            });
        ok(true);
        start();
    });

    start();
});
