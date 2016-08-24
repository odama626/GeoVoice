var express = require('express');
var nunjucks = require('nunjucks');
var	fs = require('fs');
var	https = require('https');
var	multer = require('multer');
var	mongoClient = require('mongodb').MongoClient;
var siteData = require('./site-data').siteData;

var app = express();
var port = 5000;
var database;
var markerCollection;
var db;

// setup HTTPS

var httpsOptions = {
	key: fs.readFileSync('ssl.key'),
	cert: fs.readFileSync('ssl.cert'),
	passphrase: 'Redtop360'
};

// setup parsing of requests
app.use(multer({
	dest: './uploads/',
 }).any()
);
app.use(express.static('static'));
app.use(express.static('uploads'));
	
nunjucks.configure('templates', {
	autoescape: true,
	express: app
});

// Setup database connection
mongoClient.connect("mongodb://localhost:27017/geoVoice", function(err, database) {
	if (err) { return console.dir(err); }
	console.log("connected to DB");
	
	db = database;
	markerCollection = db.collection('markers');
//	markerCollection.drop();
});


app.get('/', function( req, res) {
	res.render('index.html');
});

app.get('/dialogs/:filename', function ( req, res) {
	res.render(req.originalUrl.substr(1), { 
		regionIcons: siteData.dialog.regionIcons,
		regionMarkers: siteData.dialog.regionMarkerShapes
		 });
});

app.get('/login', function( req, res) {
	res.render('login.html');
});

app.post('/submit', function(req, res) {
	var doc = { 
		"lat": req.body.lat,
		"lng": req.body.lng,
		"region": req.body.region,
		"date": req.body.date,
		"sound": req.files[0].filename
	};
	markerCollection.update(
	{ regionName: req.body.region},
	{
		$push: { markers: doc }
	},
	{ upsert: true }	
	);
	console.log("Added new marker");
	res.end('SUCCESS');
});

app.post('/submit_region', function(req, res) {
	var region = {
		"regionName": req.body.regionName,
		"lat": req.body.lat,
		"lng": req.body.lng,
		"color": req.body.color,
		"icon": req.body.icon,
		"shape": req.body.shape,
		"markers": [],
		"geofence": req.body.geofence
	};
	markerCollection.insert(region);
	res.end('SUCCESS');
	console.log("Added new region");
});

app.get('/get_markers', function(req, res) {
	markerCollection.find().toArray( function(err, items) {
		res.send(JSON.stringify(items, null, 2));
	});
	
	console.log("Sending markers");
});

var server = https.createServer(httpsOptions, app).listen(port, function() {
	console.log("Express server listening on port "+ port);
});
