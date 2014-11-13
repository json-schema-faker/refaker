module.exports = function(grunt) {
  grunt.initConfig({
    connect: {
      fixtures: {
        options: {
          host: '*',
          port: 8081,
          base: './spec/fixtures'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-parts');
  grunt.loadNpmTasks('grunt-contrib-connect');
};
