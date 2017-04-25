var express = require('express');
var router = express.Router();
var sanitize = require('mongo-sanitize');


// get info about user
router.get('/user/:user', function (req, res) {
//	if (req.isAuthenticated()) {
		req.app.locals.db.accounts.findOne( { 'username' : sanitize(req.params.user)})
    .then(user => {
			res.json({
				name: user.name,
				username: user.username,
				img: user.image
			});
		}).catch( e => { res.json({error: 'User not found'})});
});

// get logged in user data
router.get('/self', function (req, res) {
	if (req.isAuthenticated()) {
		res.json({
			name: req.user.name,
			username: req.user.username,
			img: req.user.image,
			groups: req.user.groups
		});
	}	else {
		res.json({ error: 'Unauthorized'});
	}
});

module.exports = router;
