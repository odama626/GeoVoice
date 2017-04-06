var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
var	mongoClient = require('mongodb').MongoClient;
var sanitize = require('mongo-sanitize');
var router = express.Router();

var siteData = require('../site-data').siteData;

// Setup marker database connection
mongoClient.connect('mongodb://localhost:27017/geoVoice', function(err, database) {
	if (err) { return console.dir(err); }
	console.log('connected to marker database');

	db = database;
	markerCollection = db.collection('markers');

//	markerCollection.drop();
});

mongoClient.connect('mongodb://localhost:27017/geoVoice_passport', function(err, database) {
	if (err) { return console.dir(err); }
	console.log('connected to account database');

	accounts = database.collection('accounts');

//	markerCollection.drop();
});

router.get('/', function (req, res) {
	res.render('index.pug', {user : req.user });
});

router.get('/about', function( req, res) {
	res.render('about.pug', {user : req.user });
});

router.get('/region/:regionid', function( req, res) {
	res.render('index.pug', {user: req.user, region: req.params.regionid});
});

// Retrieve dialog
router.get('/dialogs/:filename', function (req, res) {
	if (req.isAuthenticated()) {
		res.render(req.originalUrl.substr(1), {
			regionIcons: siteData.dialog.regionIcons,
			regionMarkers: siteData.dialog.regionMarkerShapes
			});
	}
});

// get logged in user data
router.get('/api/self', function (req, res) {
	if (req.isAuthenticated()) {
		res.json({
			name: req.user.name,
			username: req.user.username,
			img: req.user.image
		});
	}	else {
		res.json({ error: 'Unauthorized'});
	}
})

// get info about user
router.get('/api/user/:user', function (req, res) {
//	if (req.isAuthenticated()) {
		accounts.findOne( { 'username' : sanitize(req.params.user)}).then(user => {
			res.json({
				name: user.name,
				username: user.username,
				img: user.image
			});
		}).catch( e => { res.json({error: 'User not found'})});
	//} else {
	//	res.json({ error: 'Unauthorized'});
	//}

})

router.get('/user/:user', function(req, res) {
	accounts.findOne( {'username' : sanitize(req.params.user)})
	.then( user => {
		res.render('publicUser.pug', {user: user });
	});
})



// Add a new sound marker
router.post('/submit', function(req, res) {
	if (req.isAuthenticated()) {
		var doc = {
			'lat': req.body.lat,
			'lng': req.body.lng,
			'region': req.body.region,
			'date': req.body.date,
			'type': req.body.type,
			'media': req.files[0].filename,
			'creator': req.user.username,
			'tags': []
		};
		markerCollection.update(
			{ regionName: sanitize(req.body.region)},
			{
				$push: { markers: doc }
			},
			{ upsert: true }
		);
		console.log('Added new marker');
		res.end('SUCCESS');
	}
});

router.post('/user', function(req, res) {
	if (req.isAuthenticated()) {
		accounts.update({ _id: sanitize(req.user._id)}, { $set: {image: sanitize(req.files[0].filename)}});
		res.end('SUCCESS');
	};
});

router.post('/update_tags', function (req, res) {
	if (req.isAuthenticated()) {
		var tags = JSON.parse(req.body.tags);
		markerCollection.update(
			{ 'regionName': sanitize(req.body.region),
				'markers.media': sanitize(req.body.media) },
			{
				$set: { 'markers.$.tags': tags}
			}
		);
		res.end('SUCCESS');
		console.log('updated tags on '+req.body.media);
	}
});

router.post('/delete_marker', function (req, res) {
	if (req.isAuthenticated()) {
		markerCollection.update(
			{ 'regionName': sanitize(req.body.region),
				'markers.media': sanitize(req.body.media),
			 	'markers.creator': sanitize(req.user.username) },
			{
				$pull: { 'markers': { media: sanitize(req.body.media)}}
			}
		);
		res.end('SUCCESS');
		console.log('deleted marker'+req.body.media);
	} else {
		res.end(403);
		console.log('refused to delete marker'+req.body.media);
	}
});

router.post('/update_marker_order', function(req, res) {
	if (req.isAuthenticated()) {
		console.log(markerCollection.update(
			{ '_id': sanitize(req.body.regionId) },
			{
				$set: {'markers' : JSON.parse(sanitize(req.body.markers))}
			}
		));
		res.end('SUCCESS');
	}
});

// Add a new sound region
router.post('/submit_region', function(req, res) {
	if (req.isAuthenticated()) {
		var region = {
			'regionName': sanitize(req.body.regionName),
			'lat': sanitize(req.body.lat),
			'lng': sanitize(req.body.lng),
			'color': sanitize(req.body.color),
			'icon': sanitize(req.body.icon),
			'shape': sanitize(req.body.shape),
			'markers': [],
			'geofence': sanitize(req.body.geofence),
			'type': sanitize(req.body.type)
		};
		markerCollection.insert(region);
		res.end('SUCCESS');
		console.log('Added new region');
	}
});

// retrieve markers
router.get('/get_markers', function(req, res) {
	markerCollection.find().toArray( function(err, items) {
		res.send(JSON.stringify(items));
	});
	console.log('Sending markers');
});

// Wipe database (Temporary)
router.post('/self_destruct', function(req, res) {
	if (req.isAuthenticated() && req.user.lvl == 'admin') {
		console.log('Self destructing');
		markerCollection.drop();
		//accounts.drop();
	}
});

router.get('/admin', function (req, res) {
	if (req.isAuthenticated() && req.user.lvl == 'admin') {
		res.render('admin.pug', { user: req.user});
	}
})

router.get('/register', function(req, res) {
	res.render('register.pug', { } );
});

router.post('/username_available', function(req, res) {
	accounts.findOne( { 'username': sanitize(req.body.query) }).then((e) => {
		if (e != null) {
			res.status(401).end('ERROR');
		} else {
			res.status(200).end('SUCCESS');
		}
	});
});

router.post('/register', function(req, res) {
	var userLvl = 'user';
	if (req.body.username == 'admin') {
		userLvl = 'admin';
	}
	Account.register(new Account({
		email: sanitize(req.body.email),
		username: sanitize(req.body.username),
		name: sanitize(req.body.name),
		lvl: userLvl
	}), req.body.password, function(err, account) {
		if (err) {
			console.log(err);
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

router.post('/login', passport.authenticate('local', {
	successRedirect: '/',
	failureRedirect: '/login'
}));

router.get('/user', function(req, res) {
	if (req.isAuthenticated()) {
		res.render('user.pug', {user: req.user });
	} else {
		res.redirect('/login');
	}
});

router.get('/get_user_markers', function(req, res) {
	if (req.isAuthenticated()) {
		markerCollection.aggregate([
				{
					$project: {
						markers: {
							$filter: {
								input: "$markers",
								as: "marker",
								cond: { $eq: ["$$marker.creator", sanitize(req.user.username)]}
							}
						}
					}
				}
		]).toArray( function(err, items) {
				res.send(JSON.stringify(items));
		});
	} else {
		res.redirect('/login');
	}
});

router.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

module.exports = router;
