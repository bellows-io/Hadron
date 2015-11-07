module.exports = function (grunt) {
   grunt.initConfig({
      browserify: {
         dist: {
            options: {
               browserifyOptions: {
                  debug:true
               },
               extensions: ['.js', '.json', '.es6'],
               transform: [
                  ["babelify", {}]
               ]
            },
            files: {
               // if the source file has an extension of es6 then
               // we change the name of the source file accordingly.
               // The result file's extension is always .js
               "./dist/module.js": ["./modules/Hadron.es6"]
            }
         }
      },
      watch: {
         scripts: {
            files: ["./modules/*.js", "./modules/*.es6"],
            tasks: ["browserify"]
         }
      }
   });

   grunt.loadNpmTasks("grunt-browserify");
   grunt.loadNpmTasks("grunt-contrib-watch");

   grunt.registerTask("default", ["watch"]);
   grunt.registerTask("build", ["browserify"]);
};
