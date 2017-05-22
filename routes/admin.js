var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
	if (req.isAuthenticated() && req.user.lvl == 'admin') {
		res.render('admin.pug', { user: req.user});
	}
});

// Wipe database (admin only)
router.post('/self_destruct', function(req, res) {
	if (req.isAuthenticated() && req.user.lvl == 'admin') {
		console.log('Self destructing');
		req.app.locals.db.markers.drop();
		req.app.locals.db.groups.drop();
		//req.app.locals.db.accounts.drop();
		res.json({status: 'SUCCESS'});
	} else {
		res.status(500);
		res.json({status: 'error'});
	}
});

module.exports = router;
