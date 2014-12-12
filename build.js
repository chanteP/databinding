var browserify = require('browserify');
var watchify = require('watchify');
var fs = require('fs');

var testify = require('./testify');

var b = browserify()
    .transform(testify);

b.add('./dev/init')
    .bundle()
    .pipe(fs.createWriteStream('./build/databind.js'))
    .on('finish', function(){
        'finish~~'
    })
    .on('update', function(ids){
        console.log(arguments)
    });