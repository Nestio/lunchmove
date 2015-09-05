var gulp = require('gulp');
var concat = require('gulp-concat');
var mainBowerFiles = require('main-bower-files');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var watchify = require('watchify');
var uglify = require('gulp-uglify');
var buffer = require('vinyl-buffer');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var cssGlobbing = require('gulp-css-globbing');
var autoprefixer = require('gulp-autoprefixer');
var minify = require('gulp-minify-css');
var shell = require('gulp-shell');
var _ = require('./bower_components/underscore/underscore.js');


// App Build Tasks

gulp.task('bower:update', function(){
    gulp.src('').pipe(shell([
        'bower prune',
        'bower update -F',
        'bower install -F'
    ]));
});

gulp.task('build:vendor', function(){
    return gulp.src(mainBowerFiles())
        .pipe(concat('vendor.js'))
        .pipe(gulp.dest('./public'));
});

gulp.task('build:vendor:production', ['build:vendor'], function(){
    gulp.src('./public/vendor.js')
        .pipe(uglify())
        .pipe(gulp.dest('./public'));
});

gulp.task('build:app', function(){
    var b = setupAppBundle();
    bundleApp(b);
});

gulp.task('build:app:production', function(){
    var b = setupAppBundle({
        debug: false
    });
    bundleApp(b, [buffer, uglify]);
})

gulp.task('watch:app', function(){
    var b = setupAppBundle(watchify.args);
    var w = watchify(b);

    w.on('update', function(){
        bundleApp(w);
    });

    bundleApp(w);
});

// Build Helpers

function setupAppBundle(browserifyArgs) {
    var b = browserify(_.extend({
        debug: true,
    }, browserifyArgs));
    b.add('./app/app.js');

    return b;
}

function bundleApp(b, transforms) {
    b = b.bundle().pipe(source('app.js'))
    _.each(transforms, function(transform){
        b = b.pipe(transform());
    });
    b.pipe(gulp.dest('./public'));
}

// SASS & CSS tasks

gulp.task('build:sass', function(){
    return gulp.src(['./assets/sass/styles.scss'])
        .pipe(cssGlobbing({ extensions: ['.scss'] }))
        .pipe(sourcemaps.init())
        .pipe(sass({
            precision: 10
        }))
        .pipe(autoprefixer())
        .pipe(sourcemaps.write('./sourcemaps'))
        .pipe(gulp.dest('./public/assets/css'));
});

gulp.task('watch:sass', function(){
    gulp.watch('./assets/sass/**/*.*', ['build:sass']);
});


// Full Build Tasks
gulp.task('watch', ['watch:app','watch:sass']);
gulp.task('build', ['build:vendor','build:app','build:sass']);
