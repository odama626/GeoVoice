var express = require('express');
var compression = require('compression');
// var minify = require('express-minify');
var	fs = require('fs');
var mongoose = require('mongoose');
var passport = require('passport');
var mongoClient = require('mongodb').MongoClient;
var LocalStrategy = require('passport-local').Strategy;
const passportJwt = require('passport-jwt');
const { storage } = require('./middleware');


// routes
var routes = require('./routes/index');
var apiRoute = require('./routes/api');
var userRoute = require('./routes/user')
var adminRoute = require('./routes/admin');
var aboutRoute = require('./routes/about');

const apiv2 = require('./routes/v2/api');

// models

mongoose.Promise = global.Promise;


var app = express();

app.use(compression());
// app.use(minify()); // enable minify on production

var port = 5000;

app.use(passport.initialize());

// Setup Passport config
var Account = require('./models/account');
passport.use(new LocalStrategy({ usernameField: 'email'}, Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

const jwtOpts = {
	jwtFromRequest: passportJwt.ExtractJwt.fromAuthHeaderAsBearerToken(),
	secretOrKey: 'keyboard cat',
	// issuer: 'pathgrab.com',
	// audience: 'pathgrab.com'
}

passport.use(new passportJwt.Strategy(jwtOpts, (payload, done) => {
	// console.log(payload);
	Account.findOne({ _id: payload._id }, (err, account) => {
		if (err) {
			return done(err);
		} else if (account) {
			return done(null, account);
		} else {
			return done(null, false);
		}
	})
}))

const mongoUrl = 'mongodb://geoUser:geoUser@10.0.0.100:27017/geoVoice'

// mongoose
mongoose.connect(mongoUrl);

mongoClient.connect(mongoUrl, function(err, database) {
	if (err) { return console.dir(err); }
	console.log('connected to database');

	var db = database;
  app.locals.db = {
    markers: db.collection('markers'),
    accounts: db.collection('accounts'),
  	groups: db.collection('groups')
	}
	app.locals.jwtOptions = jwtOpts;
});




app.use(storage);
// app.use(express.static('static'));
app.use(express.static('uploads'));

// 2.0
// app.use(express.static('static-2.0'));

// app.set('view engine', 'pug');

app.use('/', routes);
app.use('/api', apiRoute);
app.use('/user', userRoute);
app.use('/admin', adminRoute);
app.use('/about', aboutRoute);
app.use('/api/v2', apiv2);

app.listen(port, () => console.log(`Listening on port ${port}`))
