const gulp = require('gulp');
const plumber = require('gulp-plumber');
const sourcemap = require('gulp-sourcemaps');
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const server = require('browser-sync').create();
const csso = require('gulp-csso');
const rename = require('gulp-rename');
const imagemin = require('gulp-imagemin');
const webp = require('gulp-webp');
const svgstore = require('gulp-svgstore');
const del = require('del');
const webpackStream = require('webpack-stream');
const webpackConfig = require('./webpack.config.js');
const pug = require('gulp-pug');
const cached = require('gulp-cached');
const gcmq = require('gulp-group-css-media-queries');
const concat = require('gulp-concat');

const pugToHtml = () => {
  return gulp.src('source/pages/*.pug')
      .pipe(plumber())
      .pipe(pug({ pretty: true }))
      .pipe(cached('pug'))
      .pipe(gulp.dest('build'));
};

const css = () => {
  return gulp.src('source/common/sass/style.scss')
      .pipe(plumber())
      .pipe(sourcemap.init())
      .pipe(sass())
      .pipe(postcss([autoprefixer({
        grid: true,
      })]))
      .pipe(gcmq()) // выключите, если в проект импортятся шрифты через ссылку на внешний источник
      .pipe(gulp.dest('build/css'))
      .pipe(csso())
      .pipe(rename('style.min.css'))
      .pipe(sourcemap.write('.'))
      .pipe(gulp.dest('build/css'))
      .pipe(server.stream());
};

const js = () => {
  return gulp.src(['source/common/js/main.js'])
      .pipe(webpackStream(webpackConfig))
      .pipe(gulp.dest('build/js'))
};

const svgo = () => {
  return gulp.src('assets/img/**/*.{svg}')
      .pipe(imagemin([
        imagemin.svgo({
            plugins: [
              {removeViewBox: false},
              {removeRasterImages: true},
              {removeUselessStrokeAndFill: false},
            ]
          }),
      ]))
      .pipe(gulp.dest('assets/img'));
};

const sprite = () => {
  return gulp.src('assets/img/sprite/*.svg')
      .pipe(svgstore({inlineSvg: true}))
      .pipe(rename('sprite_auto.svg'))
      .pipe(gulp.dest('build/img'));
};

const syncserver = () => {
  server.init({
    server: 'build/',
    notify: false,
    open: true,
    cors: true,
    ui: false,
  });

  gulp.watch('source/**/*.pug', gulp.series(pugToHtml, refresh));
  gulp.watch('source/**/*.{scss,sass}', gulp.series(css));
  gulp.watch('source/**/*.{js,json}', gulp.series(js, refresh));
  gulp.watch('source/data/**/*.{js,json}', gulp.series(copy, refresh));
  gulp.watch('assets/img/**/*.svg', gulp.series(copysvg, sprite, pugToHtml, refresh));
  gulp.watch('assets/img/**/*.{png,jpg}', gulp.series(copypngjpg, pugToHtml, refresh));

  gulp.watch('assets/favicon/**', gulp.series(copy, refresh));
  gulp.watch('assets/video/**', gulp.series(copy, refresh));
  gulp.watch('assets/downloads/**', gulp.series(copy, refresh));
  gulp.watch('assets/*.php', gulp.series(copy, refresh));
};

const refresh = (done) => {
  server.reload();
  done();
};

const copysvg = () => {
  return gulp.src('assets/img/**/*.svg', {base: 'assets'})
      .pipe(gulp.dest('build'));
};

const copypngjpg = () => {
  return gulp.src('assets/img/**/*.{png,jpg}', {base: 'assets'})
      .pipe(gulp.dest('build'));
};

const copy = () => {
  return gulp.src([
    'assets/fonts/**',
    'assets/img/**',
    'assets/data/**',
    'assets/favicon/**',
    'assets/video/**', // git искажает видеофайлы, некоторые шрифты, pdf и gif - проверяйте и если обнаруживаете баги - скидывайте тестировщику такие файлы напрямую
    'assets/downloads/**',
    'assets/*.php',
    'assets/json/*.json',
  ], {
    base: 'assets',
  })
      .pipe(gulp.dest('build'));
};

const clean = () => {
  return del('build');
};

const build = gulp.series(clean, svgo, copy, css, sprite, js, pugToHtml);

const start = gulp.series(build, syncserver);

// Optional tasks
//---------------------------------

// Используйте отличное от дефолтного значение root, если нужно обработать отдельную папку в img,
// а не все изображения в img во всех папках.

// root = '' - по дефолту webp добавляются и обналяются во всех папках в assets/img/
// root = 'content/' - webp добавляются и обновляются только в assets/img/content/

const createWebp = () => {
  const root = '';
  return gulp.src(`assets/img/${root}**/*.{png,jpg}`)
    .pipe(webp({quality: 90}))
    .pipe(gulp.dest(`assets/img/${root}`));
};

const optimizeImages = () => {
  return gulp.src('build/img/**/*.{png,jpg}')
      .pipe(imagemin([
        imagemin.optipng({optimizationLevel: 3}),
        imagemin.mozjpeg({quality: 75, progressive: true}),
      ]))
      .pipe(gulp.dest('build/img'));
};

exports.build = build;
exports.start = start;
exports.webp = createWebp;
exports.imagemin = optimizeImages;
