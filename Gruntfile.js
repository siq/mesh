module.exports = function(grunt) {

    // Init our modular gruntfile and return the tasks it uses
    // var tasks = require('grunting')(grunt);
    var grunting = require('grunting'),
        tasks;

    grunt.initConfig({
        app_config: {},
        pkg: grunt.file.readJSON('package.json'),
        component: '<%= pkg.csi.name %>'
    });

    // Init our modular gruntfile and return the tasks it uses
    tasks = grunting(grunt);

    grunt.registerTask('tasks', function() {
        console.log('----All Tasks----');
        console.log(tasks.join('\n'));
    });
};
