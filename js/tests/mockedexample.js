define([
    'vendor/jquery',
    'vendor/underscore',
    'bedrock/class',
    'mesh/tests/example',
    './examplefixtures',
    './mockutils'
], function($, _, Class, Example, exampleFixtures, mockResource) {
    return mockResource('Example', Example, exampleFixtures);
});
