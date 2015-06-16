module.exports = (grunt) ->
  grunt.initConfig
    connect:
      fixtures:
        options:
          host: '*'
          port: 8081
          base: './spec/schemas'

  grunt.loadNpmTasks('grunt-parts')
  grunt.loadNpmTasks('grunt-contrib-connect')
