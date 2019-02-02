var express = require('express');
var	ObjectId = require('mongodb').ObjectID;
var sanitize = require('mongo-sanitize');
var router = express.Router();

var siteData = require('../site-data').siteData;

router.get('/', function (req, res) {
	res.render('index.pug', {user : req.user });
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

// Add a new sound marker
router.post('/submit', function(req, res) {
	if (req.isAuthenticated()) {
    var doc = {};
    var keys = Object.keys(req.body);
    keys.forEach( key => {
      doc[key] = sanitize(req.body[key]);
    })

    doc.creator = sanitize(req.user.username);
    doc.tags = [];
    if (req.files && req.files.length > 0) {
      doc.media = sanitize(req.files[0].filename);
    }
		req.app.locals.db.markers.update(
			{ name: sanitize(req.body.region)},
			{
				$push: { markers: doc }
			},
			{ upsert: true }
		);
		console.log('Added new marker');
		res.json({ error: false, message: `Added new marker to ${req.body.region}`});
	} else {
		res.json({ error: false, message: 'You need to be logged in to do that'});
	}
});

router.post('/update_tags', function (req, res) {
	if (req.isAuthenticated()) {
		var tags = JSON.parse(req.body.tags);
		req.app.locals.db.markers.update(
			{ 'name': sanitize(req.body.region),
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
		req.app.locals.db.markers.update(
			{ 'name': sanitize(req.body.region),
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
		req.app.locals.db.markers.update(
			{ '_id': ObjectId(sanitize(req.body.regionId)) },
			{
				$set: {
					description: sanitize(req.body.description),
					markers : JSON.parse(sanitize(req.body.markers))
				}
			}//, { multi: true }
		)
		if (req.body.group) {
			req.app.locals.db.markers.update(
				{ '_id': ObjectId(sanitize(req.body.regionId)) },
				{
					$set: {
						group: sanitize(req.body.group)
					}
				}//, { multi: true }
			);
			new Promise( (resolve, reject) => {
				req.apps.local.db.groups.update(
					{ regions: { $elemMatch: sanitize(req.body.regionId) } },
					{
						$pull: { regions: sanitize(req.body.regionId)}
					}, { multi: true}, (err, r) => resolve(err, r))
			}).then( _ => {
				req.app.locals.db.groups.update(
					{ 'name': sanitize(req.body.group) },
					{
						$addToSet: { regions: sanitize(req.body.regionId)}
					}
				)
			});
		}
		res.end('SUCCESS');
	}
});

// Add a new sound region
router.post('/submit_region', function(req, res) {
	if (req.isAuthenticated()) {
		var region = {
			'name': sanitize(req.body.name),
			'lat': sanitize(req.body.lat),
			'lng': sanitize(req.body.lng),
			'color': sanitize(req.body.color),
			'icon': sanitize(req.body.icon),
			'shape': sanitize(req.body.shape),
			'markers': [],
			'geofence': sanitize(req.body.geofence),
			'type': sanitize(req.body.type)
		};
		req.app.locals.db.markers.insert(region);
		res.end('SUCCESS');
		console.log('Added new region');
	}
});

router.post('/group/add_user', function(req, res) {
	console.log('adding user to group');
	var groupName = sanitize(req.body.group);
	var username = sanitize(req.body.user);
	var access = sanitize(req.body.access);
	if (req.isAuthenticated()) {
		req.app.locals.db.groups.findOne( { owner: sanitize(req.user.username), name: groupName})
		.then( group => {
			req.app.locals.db.accounts.update(
				{ username: username},
				{
					$addToSet: { groups: { name: groupName, access: access} }
				},
				(err, info, status) => {res.json({error: err, message: status }) }
			);
		}).catch( err => res.json({error: true, message: 'failed to find group with name, and owner'}))
	} else {
		res.json({ error: true, message: 'You need to be logged in to do that'});
	}
});

router.post('/group/create', function(req, res) {
	if (req.isAuthenticated()) {
		var group = {
			'owner': sanitize(req.user.username),
			'name': sanitize(req.body.name),
			'regions': [],
			'access': sanitize(req.body.access)
		};
		var nullRegion = {// create a 'null' region for this new group
			'group': sanitize(req.body.name),
			 'name': `:${sanitize(req.body.name)}-root`,
			 markers: []
		}
		req.app.locals.db.groups.insert(group);
		req.app.locals.db.markers.insert(nullRegion);
		req.app.locals.db.accounts.update(
			{ username: sanitize(req.user.username)},
			{
				$addToSet: { groups: group}
			},
			{ upsert: true }
		);
		res.json({error: false, message: `Created group ${req.body.name}`});
		console.log(`Added new Group ${req.body.name}, ${req.body.access}`);
	} else {
		res.json({error: true, message: 'You need to be logged in to do that'});
	}
});

router.post('/group/update_access', function(req, res) {
	if (req.isAuthenticated()) {
		//console.log(username, groupName, access);
		req.app.locals.db.groups.update(
			{ owner: sanitize(req.user.username), name: sanitize(req.body.name)},
			{
				$set: { access: sanitize(req.body.access) }
			}, { upsert : true, mult: true}
		);
		res.json({error: false, message: 'done'});
	} else {
		res.json({error: true, message: 'You need to be logged in to do that'});
	}
});

router.post('/group/delete', function(req, res) {
	if (req.isAuthenticated()) {
		var groupName = sanitize(req.body.name);
		req.app.locals.db.groups.findOne({ name: groupName})
		.then(group => {
			console.log(group)
			console.log(group.owner == req.user.username);
			if (group.owner == req.user.username) {
				req.app.locals.db.groups.deleteOne({ name: groupName});
				req.app.locals.db.accounts.update({ groups: {$elemMatch: { name: group.name }}},
				{
					$pull: { groups: { name: group.name}}
				}, { multi: true})
				res.json({ error: false, message: `Deleted ${group.name}`});
				console.log(`Deleted ${group.name}`);
			} else { res.json({error: true, message: `Only group owner can delete`})}

		}).catch ({ error: true,  message: `Couldn't find group with that name`})
	} else {
		req.json({error: true, message: 'you need to be logged in to do that'});
	}
});

function userInGroup(user, groupName) {
	var inGroup = false;
	for (var i = 0; i < user.groups.length; i++) {
		if (user.groups[i].name == groupName) {
			return true;
		}
	}
	return false;
}

function fetchVisible(req, res) {
	var userGroups = [];
	if (req.user) {
		userGroups = req.user.groups.map( group => { return group.name});
	}
	// console.log(req.app.locals.db);
	new Promise( (resolve, reject) => {
		req.app.locals.db.groups.find({ access: 'public'})
	.toArray((err, items = []) => resolve(userGroups.concat(items.map(item => item.name))))
	})
	.then( groups => {
		req.app.locals.db.markers.find({$or: [{ group: {$in: groups}}, {group: null}]})
		.toArray((err, items = []) => res.json(items));
	});
}

router.get('/fetch', function(req, res) {
	if (req.query.g) { // send group
		req.app.locals.db.markers.find({ group: sanitize(req.query.g)})
		.toArray( (err, items) => res.json(items));
	} else if (req.query.r) { // send region
		req.app.locals.db.markers.findOne( {'name': sanitize(req.query.r) })
		.then(region => {res.json([region])});
	} else { // send all
		fetchVisible(req, res);
	}
});

router.post('/check_name_availability', (req, res) => {
	var available = (e) => res.json({available: (e == null)});
	var query = sanitize(req.body.query)
	if (req.query.t == 'user') {
		req.app.locals.db.accounts.findOne({ 'username': query}).then(available);
	} else if (req.query.t == 'region') {
		req.app.locals.db.markers.findOne({ 'name': query}).then(available);
	} else if (req.query.t == 'group') {
		req.app.locals.db.groups.findOne({ 'name': query}).then(available);
	}
});

function fetchGroup(group, req, res) {
	new Promise( (resolve, reject) => {
		req.app.locals.db.accounts.find({ groups: { $elemMatch: { name: group }}})
		.toArray((err, items) => resolve(items.map(account => account.username)));
	}).then( usernames => {
		req.app.locals.db.groups.findOne({ 'name': group})
		.then( group => {
			group.users = usernames;
			res.json(group);
		});
	});
}

router.post('/get', (req, res) => {
	var query = sanitize(req.body.query);
	var error = { error: true, message: 'not found'};
	if (req.isAuthenticated()) {
		if (req.query.t == 'region') {
			req.app.locals.db.markers.findOne({ 'name': query})
			.then( region => {
				if (region.group) {
					req.app.locals.db.groups.findOne({ 'name': region.group})
					.then( group => {
						if ((group.access == 'private' && userInGroup(req.user, group.name))
							|| group.access == 'public') {
							res.json(region);
						} else {
							res.json(error);
						}
					})
				} else {
					res.json(region);
				}
			})
		} else if (req.query.t == 'group') {
			fetchGroup(query, req, res);
		}
	} else {
		res.json({error: true, message: 'User not authenticated'});
	}
})

router.get('/get_user_markers', function(req, res) {
	if (req.isAuthenticated()) {
		req.app.locals.db.markers.aggregate([
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
		res.redirect('/');
	}
});

module.exports = router;
