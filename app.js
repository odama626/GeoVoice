var express = require('express'),
	nunjucks = require('nunjucks'),
	fs = require('fs'),
	https = require('https'),
	multer = require('multer'),
	mongoClient = require('mongodb').MongoClient;

var app = express();
var port = 5000;
var database;
var markerCollection;
var db;

// setup HTTPS

var httpsOptions = {
	key: fs.readFileSync('ssl.key'),
	cert: fs.readFileSync('ssl.cert'),
	passphrase: 'PASSPHRASE_GOES_HERE'
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
});


app.get('/', function( req, res) {
	res.render('index.html');
});

app.get('/login', function( req, res) {
	res.render('login.html');
});

app.post('/submit', function(req, res) {
	var doc = { 
		"lat": req.body.lat,
		"lng": req.body.lng,
		"domain": req.body.domain,
		"date": req.body.date,
		"sound": req.files[0].filename
	};
	markerCollection.update(
	{ domainName: req.body.domain },
	{
		$push: { markers: doc }
	},
	{ upsert: true }	
	);
	console.log("Added new sound marker");
});

app.post('/submit_domain', function(req, res) {
	var domain = {
		"domainName": req.body.domainName,
		"lat": req.body.lat,
		"lng": req.body.lng,
		"color": req.body.color,
		"iconCss": req.body.iconCss,
		"markers": []
	};
	markerCollection.insert(domain);
	console.log("Added new marker domain");
});

app.get('/get_markers', function(req, res) {
	/*markerCollection.findOne({ "domainName" : 'null' }, function(err, items) {
		res.send(JSON.stringify(items.markers, null, 2));
	});*/
	
	markerCollection.find().toArray( function(err, items) {
		res.send(JSON.stringify(items, null, 2));
	});
	
	
	console.log("Sending markers");
});


var server = https.createServer(httpsOptions, app).listen(port, function() {
	console.log("Express server listening on port "+ port);
});
