define([
    'vendor/jquery',
    'vendor/underscore',
    'bedrock/class',
    'mesh/tests/nestedpolymorphicexample',
    './nestedpolymorphicexamplefixtures',
    './mockutils'
], function($, _, Class, NestedPolymorphicExample, exampleFixtures, mockResource) {
    return mockResource('NestedPolymorphicExample', NestedPolymorphicExample, exampleFixtures);
});

