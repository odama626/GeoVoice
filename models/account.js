var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var permissions = {
	'user': 0,
	'dbAdmin': 10
};

var Account = new Schema({
	username: String,
	name: String,
	userHandle: String,
	password: String,
	image: {type: String, default: 'default_profile_image.png'},
	dateJoined: {type: Date, default: Date.now},
	lastOnline: {type: Date, default: Date.now},
	active: {type: Boolean, default: true}, // set false after lastOnline > 30 days
	enabled: {type: Boolean, default: true}, // ability to deactivate account
	permissionLevel: {type: Number, default: permissions['user']}
	// Possibly credit card info for paid features
});

Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account);
