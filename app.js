var express = require('express');
var path = require('path');
var app = express();
var async = require('async');
var fs = require('fs');
var Client = require('node-rest-client').Client;

var repoArray = JSON.parse(fs.readFileSync('repo.txt', 'utf8'));

// Define the port to run on
app.set('port', 4000);

app.use(express.static(path.join(__dirname, '.')));

console.log('app.js log ');
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/repo', function(req, res) {

    console.log('repo lenght = ', repoArray.length);
    res.send(repoArray);
});


// Listen for requests
var server = app.listen(app.get('port'), function() {
    var port = server.address().port;
    console.log('servering on port ' + port);
});