module.exports = function(grunt) {
    var fileName = 'mug';

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        browserify: {
            main: {
                src : ['dev/init.js'],
                dest : 'build/'+fileName+'.js',
            },
            base: {
                src : ['dev/base.js'],
                dest : 'build/'+fileName+'.base.js'
            }
        },
        watch: {
            scripts: {
                files: ['dev/**/*.js'],
                tasks: ['browserify'],
                options: {
                    spawn: false,
                },
            },
        },
        uglify: {
            main: {
                options: {
                    compress: {
                        dead_code: true,
                        drop_debugger : false
                    }
                },
                src : ['build/'+fileName+'.js'],
                dest : 'build/'+fileName+'.min.js'
            },
            base: {
                options : {
                    // sourceMap : true,
                },
                src : ['build/'+fileName+'.base.js'],
                dest : 'build/'+fileName+'.base.min.js'
            }
        }
    });
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', ['browserify', 'uglify']);
    grunt.registerTask('dev', ['browserify', 'watch']);
}