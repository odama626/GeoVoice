var express = require('express');
var sanitize = require('mongo-sanitize');
var Account = require('../models/account');
var router = express.Router();
var passport = require('passport');

router.get('/', function(req, res) {
	if (req.isAuthenticated()) {
		res.render('user.pug', {user: req.user });
	} else {
		res.redirect('/user/login');
	}
});

router.post('/', function(req, res) {
	if (req.isAuthenticated()) {
		req.app.locals.db.accounts.update({ _id: sanitize(req.user._id)}, { $set: {image: sanitize(req.files[0].filename)}});
		res.end('SUCCESS');
	};
});

router.get('/e/:user', function(req, res) {
	req.app.locals.db.accounts.findOne( {'username' : sanitize(req.params.user)})
	.then( user => {
		res.render('publicUser.pug', {user: user });
	});
})

router.get('/login', function(req, res) {
	res.render('login.pug', {user: req.user });
});

router.post('/login', passport.authenticate('local', {
	successRedirect: '/',
	failureRedirect: '/user/login'
}));

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

router.get('/register', function(req, res) {
	res.render('register.pug', { } );
});

router.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

module.exports = router;
