var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var	mongoClient = require('mongodb').MongoClient;
var router = express.Router();

var siteData = require('../site-data').siteData;

// Setup marker database connection
mongoClient.connect("mongodb://localhost:27017/geoVoice", function(err, database) {
	if (err) { return console.dir(err); }
	console.log("connected to DB");

	db = database;
	markerCollection = db.collection('markers');

//	markerCollection.drop();
});

router.get('/', function (req, res) {
	res.render('index.pug', {user : req.user });
});

router.get('/about', function( req, res) {
	res.render('about.pug', {user : req.user });
});

// Retrieve dialog
router.get('/dialogs/:filename', function (req, res) {
	res.render(req.originalUrl.substr(1), {
		regionIcons: siteData.dialog.regionIcons,
		regionMarkers: siteData.dialog.regionMarkerShapes
		});
});

// Add a new sound marker
router.post('/submit', function(req, res) {
	var doc = {
		"lat": req.body.lat,
		"lng": req.body.lng,
		"region": req.body.region,
		"date": req.body.date,
		"sound": req.files[0].filename,
		"creator": req.user.username,
		"tags": []
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

router.post('/update_tags', function (req, res) {
	var tags = JSON.parse(req.body.tags);
	console.log(req.body.tags);
	markerCollection.update(
		{ 'regionName': req.body.region,
			'markers.sound': req.body.sound },
		{
			$set: { 'markers.$.tags': tags}
		}
	);
	res.end('SUCCESS');
	console.log('updated tags on '+req.body.sound);
});

router.post('/update_marker_order', function(req, res) {
	console.log(JSON.parse(req.body.markers));
	console.log(markerCollection.update(
		{ '_id': req.body.regionId },
		{
			$set: {'markers' : JSON.parse(req.body.markers)}
		}
	));
	res.end('SUCCESS');
});

// Add a new sound region
router.post('/submit_region', function(req, res) {
	var region = {
		"regionName": req.body.regionName,
		"lat": req.body.lat,
		"lng": req.body.lng,
		"color": req.body.color,
		"icon": req.body.icon,
		"shape": req.body.shape,
		"markers": [],
		"geofence": req.body.geofence,
		"type": req.body.type
	};
	markerCollection.insert(region);
	res.end('SUCCESS');
	console.log("Added new region");
});

// retrieve markers
router.get('/get_markers', function(req, res) {
	markerCollection.find().toArray( function(err, items) {
		res.send(JSON.stringify(items));
	});

	console.log("Sending markers");
});

// Wipe database (Temporary)
router.post('/self_destruct', function(req, res) {
	console.log('Self destructing');
	markerCollection.drop();
});


router.get('/register', function(req, res) {
	res.render('register.pug', { } );
});

router.post('/register', function(req, res) {
	Account.register(new Account({username: req.body.username }), req.body.password, function(err, account) {
		if (err) {
			return res.render('register.pug', {account: account});
		}

		passport.authenticate('local')(req, res, function() {
			res.redirect('/');
		});
	});
});

router.get('/login', function(req, res) {
	res.render('login.pug', {user: req.user });
});

router.post('/login', passport.authenticate('local'), function(req, res) {
	res.redirect('/');
});

router.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

module.exports = router;
