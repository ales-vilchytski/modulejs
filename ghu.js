const {resolve, join} = require('path');
const {ghu, jszip, mapfn, read, remove, run, uglify, webpack, wrap, write} = require('ghu');

const NAME = 'modulejs';

const ROOT = resolve(__dirname);
const LIB = join(ROOT, 'lib');
const BUILD = join(ROOT, 'build');
const DIST = join(ROOT, 'dist');
const COVERAGE = join(ROOT, 'coverage');

ghu.defaults('release');

ghu.before(runtime => {
    runtime.pkg = Object.assign({}, require('./package.json'));
    runtime.comment = `${NAME} v${runtime.pkg.version} - ${runtime.pkg.homepage}`;
    runtime.commentJs = `/*! ${runtime.comment} */\n`;
    console.log(runtime.comment);
});

ghu.task('clean', () => {
    return remove(`${BUILD}, ${DIST}, ${COVERAGE}`);
});

ghu.task('lint', () => {
    return run('eslint .', {stdio: 'inherit'});
});

ghu.task('build:script', runtime => {
    const webpackConfig = {
        output: {
            library: NAME,
            libraryTarget: 'umd'
        },
        module: {
            loaders: [
                {
                    include: [LIB],
                    loader: 'babel-loader',
                    query: {
                        cacheDirectory: true,
                        presets: ['es2015']
                    }
                }
            ]
        }
    };

    return read(`${LIB}/${NAME}.js`)
        .then(webpack(webpackConfig, {showStats: false}))
        .then(wrap(runtime.commentJs))
        .then(write(`${DIST}/${NAME}.js`, {overwrite: true}))
        .then(write(`${BUILD}/${NAME}-${runtime.pkg.version}.js`, {overwrite: true}))
        .then(uglify({compressor: {warnings: false}}))
        .then(wrap(runtime.commentJs))
        .then(write(`${DIST}/${NAME}.min.js`, {overwrite: true}))
        .then(write(`${BUILD}/${NAME}-${runtime.pkg.version}.min.js`, {overwrite: true}));
});

ghu.task('build:copy', () => {
    return read(`${ROOT}/*.md`)
        .then(write(mapfn.p(ROOT, BUILD), {overwrite: true}));
});

ghu.task('build', ['build:script', 'build:copy']);

ghu.task('zip', ['build'], runtime => {
    return read(`${BUILD}/*`)
        .then(jszip({dir: BUILD, level: 9}))
        .then(write(`${BUILD}/${NAME}-${runtime.pkg.version}.zip`, {overwrite: true}));
});

ghu.task('release', ['clean', 'zip']);
