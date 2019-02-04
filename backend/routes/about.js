var express = require('express');
var sanitize = require('mongo-sanitize');
var router = express.Router();

router.get('/uses', function (req, res) {
	res.render('about_uses.pug', {user: req.user});
});

router.get('/', function( req, res) {
	res.render('about.pug', {user : req.user });
});


module.exports = router;
