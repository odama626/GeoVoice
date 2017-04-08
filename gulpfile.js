var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');
var pump = require('pump');

gulp.task('compress', (cb) => {
pump([
  	gulp.src('./static/js/**/*.js')
	,(concat('production.js'))
	,(gulp.dest('out'))
	,(uglify().on('error', (err) => { gutil.log(gutil.colors.red('[Error]'), err.toString())}))
	,(gulp.dest('out'))
]);

});
