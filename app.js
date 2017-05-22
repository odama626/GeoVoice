var express = require('express');
var compression = require('compression');
var minify = require('express-minify');
var	fs = require('fs');
var	https = require('https');
var	multer = require('multer');
var mongoose = require('mongoose');
var mongoClient = require('mongodb').MongoClient;
var passport = require('passport');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var LocalStrategy = require('passport-local').Strategy;
var GoogleStrategy = require('passport-google').Strategy;
var pug = require('pug');

var routes = require('./routes/index');
var apiRoute = require('./routes/api');
var userRoute = require('./routes/user')
var adminRoute = require('./routes/admin');
var aboutRoute = require('./routes/about');

var app = express();

app.use(compression());
app.use(minify()); // enable minify on production

var port = 5000;

// setup HTTPS
var httpsOptions = {
        key: fs.readFileSync('ssl.key'),
        cert: fs.readFileSync('ssl.crt'),
};


// Setup Session
app.use(bodyParser.urlencoded({ extended: false }));
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
passport.use(new LocalStrategy({ usernameField: 'email'}, Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

// mongoose
mongoose.connect('mongodb://localhost:27017/geoVoice');

mongoClient.connect('mongodb://localhost:27017/geoVoice', function(err, database) {
	if (err) { return console.dir(err); }
	console.log('connected to database');

	var db = database;
  app.locals.db = {
    markers: db.collection('markers'),
    accounts: db.collection('accounts'),
  	groups: db.collection('groups')
  }
});

// setup parsing of file uploads
var storage = multer.diskStorage({
	destination: function(req, file, cb) {
		if (file.originalname.endsWith('.png')) {
			cb(null, './uploads/img/');
		} else {
			cb(null, './uploads/');
		}

	},
	filename: function (req, file, cb) {
		if (file.originalname.endsWith('.webm')) {
				cb(null,Date.now()+'.webm');
		} else if (file.originalname.endsWith('.wav')) {
			cb(null,Date.now()+'.wav');
		} else if (file.originalname.endsWith('.png')) {
			var filename = req.user.username+'.png';
			if (fs.existsSync('./uploads/img/'+filename)) {
				fs.unlinkSync('./uploads/img/'+filename);
			}
			cb(null, filename);
		}
	}
});


app.use(multer({ storage: storage }).any());


app.use(express.static('static'));
app.use(express.static('uploads'));

// 2.0
app.use(express.static('static-2.0'));

app.set('view engine', 'pug');

app.use('/', routes);
app.use('/api', apiRoute);
app.use('/user', userRoute);
app.use('/admin', adminRoute);
app.use('/about', aboutRoute);

var server = https.createServer(httpsOptions, app).listen(port, function() {
	console.log("Express server listening on port "+ port);
});
