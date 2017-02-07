var gulp = require('gulp');
var del = require('del');
var data = require('gulp-data');
var async = require('async');
var fs = require('fs');
var Client = require('node-rest-client').Client;
var path = require('path');
var gls = require('gulp-live-server');
var shell = require('gulp-shell');
var parse = require('parse-diff');

const typescript = require('gulp-typescript');
const tscConfig = require('./tsconfig.json');
const sourcemaps = require('gulp-sourcemaps');
const tslint = require('gulp-tslint');
const browserSync = require('browser-sync');
const reload = browserSync.reload;
const tsconfig = require('tsconfig-glob');
var jsonfile = require('jsonfile');

var options_auth = {
    user: process.env.BITBUCKET_NAME,
    password: process.env.BITBUCKET_PWD
};
var client = new Client(options_auth);

next = "https://api.bitbucket.org/2.0/repositories?role=member";

var repoArray = [];
gulp.task('clean', function (done) {

    del(['dist/**/*'], done());
});

gulp.task('repos', function (done) {

    async
        .forever(function (cb) {
            client
                .get(next, function (data, response) {
                    // parsed response body as js object
                    console.log(data.values);
                    next = data.next;

                    repoArray = repoArray.concat(data.values);

                    console.log('next = ' + next);

                    if (typeof next === "undefined") {
                        console.log('next = is undefined');
                        cb('empty next!!', 'empty next');
                    } else {
                        cb();
                    }

                });
        }, function (err) {
            console.error(err);
            console.log('repoArray len = ' + repoArray.length);
            var fs = require('fs');
            fs.writeFileSync(path.join(__dirname + '/repo.txt'), JSON.stringify(repoArray));
            done();
        });

});

gulp.task('serve', function () {
    //1. run your script as a server
    var server = gls.new('app.js');
    server.start();
});

// copy static assets - i.e. non TypeScript compiled source
gulp.task('copy:assets', function () {
    return gulp.src([
        'app/**/*', 'index.html', 'styles.css', '!app/**/*.ts'
    ], {base: './'}).pipe(gulp.dest('dist'))
});

// linting
gulp.task('tslint', function () {
    return gulp
        .src('app/**/*.ts')
        .pipe(tslint())
        .pipe(tslint.report('verbose'));
});

// TypeScript compile
gulp.task('compile', function () {
    return gulp
        .src(tscConfig.files)
        .pipe(sourcemaps.init())
        .pipe(typescript(tscConfig.compilerOptions))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist/app'));
});

// update the tsconfig files based on the glob pattern
gulp.task('tsconfig-glob', function () {
    return tsconfig({configPath: '.', indent: 2});
});

function getAddedLine(fileContent) {

    var array = fileContent
        .toString()
        .split("\n");
    var count = 0;
    for (var i = 0; i < array.length; i++) {
        if (array[i].length > 1 && array[i][0] == '+' && array[i][1] != '+') {
            count++;
        }

    }
    return count;
}

var commitsAuthorInfo = {};

function getCommitsByAuthor(commitsDic) {

    for (var key in commitsDic) {
        if (commitsDic.hasOwnProperty(key)) {
            // do stuff

            var commitsObj = commitsDic[key];

            for (var prop in commitsObj) {
                // skip loop if the property is from prototype
                if (!commitsObj.hasOwnProperty(prop)) 
                    continue;
                
              

                if (typeof commitsAuthorInfo[commitsObj[prop]['author']] == "undefined") {
                    commitsAuthorInfo[commitsObj[prop]['author']] = commitsObj[prop]['AddedLines'];
                } else {
                    var lines = commitsObj[prop]['AddedLines'];
                    var exsitLines = commitsAuthorInfo[commitsObj[prop]['author']];

                    var total = lines + exsitLines;

                    commitsAuthorInfo[commitsObj[prop]['author']] = total;

                }

            }
        }
    }

    return commitsAuthorInfo;
}

gulp
    .task('parse-diff', function (done) {

        console.log("added line = " + getAddedLine('./test.txt'));

        done();

    });

var commitsInfo = {};

//console.dir(jsonfile.readFileSync('./commits.json'));

try {
    commitsInfo = jsonfile.readFileSync('./commits.json');
} catch (err) {
    console.log('no such file');
    commitsInfo = {};
}

blackRepoList = {};
blackRepoList['test'] = 'yes';


function filterBigRepo(repoData) {

    var i = 0;

    var filterArray = [];
    for (i = 0; i < repoData.length; i++) {
        if( repoData[i]['size'] < 1000000000 && typeof blackRepoList[repoData[i]['name'] ] == 'undefined'){
            filterArray.push(repoData[i]);
           // console.log('normal repo ' + repoData[i]['name'] +':' + repoData[i]['size']);
        }
        else {
            console.log('big repo ' + repoData[i]['name'] +':' + repoData[i]['size']);
        }

    }

    return filterArray;
}


gulp.task('rank-by-commit', function (done) {
    
    var commitsByAuthor = getCommitsByAuthor(commitsInfo);


    keysSorted = Object.keys(commitsByAuthor).sort(function(a,b){return commitsByAuthor[b]-commitsByAuthor[a]})
   

    var i = 0;
    for (i = 0; i < keysSorted.length; i++) {
        console.log(keysSorted[i]+ ':' + commitsByAuthor[keysSorted[i]]);
    }

    done();


});



gulp.task('parse-commits', function (done) {
    // do more stuff
    var repoArray = JSON.parse(fs.readFileSync('repo.txt', 'utf8'));

    var repo1 = filterBigRepo(repoArray);

    
    var repoIndex = 0;

    async.whilst(
    function() { return repoIndex < repo1.length; },
    function(OuterCallback) {

//////

 var commitsUrl = repo1[repoIndex]['links']['commits']['href'];

    projectName = repo1[repoIndex]['name'];

    console.log('project name ' + projectName);

    if (typeof commitsInfo[projectName] == "undefined") {
        commitsInfo[projectName] = {};
    }

    var counts = 0;

    next = commitsUrl;
    async.forever(function (cb) {
        client
            .get(next, function (data, response) {
                // parsed response body as js object console.log(data.values);
                next = data.next;

                //get the commits files
                var commitIndex = 0;

                async.whilst(function () {
                    return commitIndex < data['values'].length;
                }, function (callback) {

                    hash = data['values'][commitIndex]['hash'];

                    infoHash = commitsInfo[projectName][hash];

                    // console.log('hash ' + hash);

                    if (typeof infoHash == 'undefined') {

                        client
                            .get(data['values'][commitIndex]['links']['diff']['href'], function (diffdata, response) {
                                // parsed response body as js object  console.log(data.toString('utf8'));

                                if (typeof data['values'][commitIndex]['author']['user'] == 'undefined') {
                                    author = data['values'][commitIndex]['author']['raw'];

                                     //console.log('no username ' + JSON.stringify(data['values'][commitIndex]));

                                }
                                else {
                                author = data['values'][commitIndex]['author']['user']['username'];
                                }
                               
                               console.log('commit hash ' + data['values'][commitIndex]['hash'] + 'author ' + author);

                                commitsInfo[projectName][hash] = {};
                                commitsInfo[projectName][hash]['author'] = author;
                                commitsInfo[projectName][hash]['AddedLines'] = getAddedLine(diffdata.toString('utf8'));

                                //  console.log('diff = ' + diffdata.toString('utf8') + '\r\n');
                                commitIndex++;

                                callback();

                            });
                    } else {

                        commitIndex++;

                        callback();

                    }

                }, function (err, n) {

                    if (typeof next === "undefined") {
                        console.log('next = is undefined');
                        //save dic to file

                        var file = 'commits.json'

                        jsonfile.writeFile(file, commitsInfo, function (err) {
                            console.error(err)
                        })
                        cb('empty next!!', 'empty next');
                    } else {
                        console.log('every time');
                        cb();
                    }

                });

                counts += data.values.length;

            });
    }, function (err) {
        console.error('project done');
       
        repoIndex++;
        OuterCallback();
    });



///////////////////


       
       
    },
    function (err, n) {
        // 5 seconds have passed, n = 5

        console.error('all done  finally');
        console.error('all done  ' + JSON.stringify(getCommitsByAuthor(commitsInfo)));
        done();
    }
);

   

   

    

    done();
});

gulp.task('default', gulp.series('clean', 'repos', 'serve', function (done) {
    // do more stuff
    done();
}));

gulp.task('test', gulp.series('parse-diff', function (done) {
    // do more stuff
    done();
}));