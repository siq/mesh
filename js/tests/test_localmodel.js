/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual, notStrictEqual, raises*/
define([
    'vendor/underscore',
    './../localmodel'
], function(_, LocalModel) {
    var localStorage = window.localStorage, // so jshint stops complaining...
        UserPreferences = LocalModel.extend({
            __name__: 'userpreferences',
            __bundle__: 'userpreferences-1.0'
        }),
        setup = function() {
            UserPreferences.models.clear();
            _.each(_.keys(localStorage), function(key) {
                if (/^userpreferences-/.test(key)) {
                    localStorage.removeItem(key);
                }
            });
        },
        getFromLocalStorage = function(id) {
            var prefix = UserPreferences.prototype.__bundle__ + '-' + id;
            return JSON.parse(localStorage.getItem(prefix));
        };

    window.UserPreferences = UserPreferences;

    test('creating a local model', function() {
        setup();
        var up = UserPreferences.models.get(0);
        ok(up);
    });

    asyncTest('saving a local model', function() {
        setup();
        var up = UserPreferences.models.get(0);
        up.set('foo', 'bar');
        up.save().then(function() {
            var saved = getFromLocalStorage(0);
            equal(saved.id, 0);
            equal(saved.foo, 'bar');
            start();
        });
    });

    asyncTest('retrieving a local model', function() {
        setup();
        var up = UserPreferences.models.get(1);
        up.set('foo', 'barz');
        up.save().then(function() {
            UserPreferences.models.clear();
            var fetched = UserPreferences.models.get(1);
            fetched.refresh().then(function() {
                equal(fetched.get('id'), 1);
                equal(fetched.get('foo'), 'barz');
                start();
            });
        });
    });

    asyncTest('retrieving a non-existent local model', function() {
        setup();
        var up = UserPreferences.models.get(1);
        up.refresh().then(function() {
            ok(false, 'calling "refresh()" on non-existent local model should fail');
            start();
        }, function() {
            ok(true);
            start();
        });
    });

    asyncTest('updating a local model', function() {
        setup();
        var up = UserPreferences.models.get(1);
        up.set('foo', 'barz');
        up.save().then(function() {
            UserPreferences.models.clear();
            var fetched = UserPreferences.models.get(1);
            fetched.refresh().then(function() {
                fetched.set('foo', 'baz');
                fetched.save().then(function() {
                    UserPreferences.models.clear();
                    var fetchedAgain = UserPreferences.models.get(1);
                    fetchedAgain.refresh().done(function() {
                        equal(fetchedAgain.get('id'), 1);
                        equal(fetchedAgain.get('foo'), 'baz');
                        start();
                    });
                });
            });
        });
    });

    asyncTest('deleting a local model', function() {
        setup();
        var up = UserPreferences.models.get(0);
        up.set('foo', 'bar');
        up.save().then(function() {
            up.destroy().then(function() {
                equal(getFromLocalStorage(0), null);
                start();
            });
        });

    });

    start();
});

