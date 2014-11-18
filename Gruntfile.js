module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      '/public/databind.js': ['/dev/init.js']
    }
  })
  grunt.loadNpmTasks('grunt-browserify');
}