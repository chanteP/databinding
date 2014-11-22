module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      dist: {
        files: {
          'build/databind.js': ['dev/init.js'],
        }
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
      dist: {
        files: {
          'build/databind.min.js': ['build/databind.js'],
        }
      }
    }
  })
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['browserify', 'uglify']);
  grunt.registerTask('dev', ['browserify', 'watch']);
}