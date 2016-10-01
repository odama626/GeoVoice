var express = require('express');
var nunjucks = require('nunjucks');
var	fs = require('fs');
var	https = require('https');
var	multer = require('multer');
var mongoose = require('mongoose');
var passport = require('passport');
var cookieParser = require('cookie-parser');
var LocalStrategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google').Strategy;



var routes = require('./routes/index');
var users = require('./routes/users');

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

// Setup Session
app.use(cookieParser());
app.use(require('express-session')({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Setup Passport config
var Account = require('./models/account');
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

// mongoose
mongoose.connect('mongodb://localhost:27017/geoVoice_passport');


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

app.use('/', routes);

var server = https.createServer(httpsOptions, app).listen(port, function() {
	console.log("Express server listening on port "+ port);
});
