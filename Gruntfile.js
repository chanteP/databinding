module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      dist: {
        files: {
          'build/databind.js': ['dev/init.js'],
        }
      }
    }
  })
  grunt.loadNpmTasks('grunt-browserify');
  grunt.registerTask('default', ['browserify']);
}