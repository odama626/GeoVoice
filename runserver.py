from flask import Flask, render_template, request, redirect, url_for, send_from_directory
from flask_login import LoginManager, UserMixin, login_required
from werkzeug.utils import secure_filename
import ssl
import sqlite3
import json
import os

UPLOAD_FOLDER = 'uploads';
ALLOWED_EXTENSIONS = set(['wav', 'mp3', 'ogg'])
DB_FILENAME = "geovoice.db";
DB_IS_NEW = not os.path.exists(DB_FILENAME)

conn = sqlite3.connect(DB_FILENAME);
c = conn.cursor();

app = Flask(__name__, static_url_path='');
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

loginManager = LoginManager()
loginManager.init_app(app)

sslContext = ssl.SSLContext(ssl.PROTOCOL_SSLv23)
sslContext.load_cert_chain('ssl.cert', 'ssl.key')

# Temp code for user database (replace dict with database table)
class User(UserMixin):
	user_database = {"JohnDoe": ("JohnDoe", "John"),
									"JaneDoe": ("JaneDoe", "Jane")}
	
	def __init__(self, username, password):
		self.id = username
		self.password = password
		
	@classmethod
	def get(cls, id):
		return cls.user_database.get(id)

	
@loginManager.user_loader
def load_user(user_id):
	return User.get(user_id)
	
@app.route('/login', methods=['GET','POST'])
def login():
	form = LoginForm()
	if form.validate_on_submit():
		login_user(user)
		flask.flash('Logged in successfully');
		
		next = flask.request.args.get('next')
		if not next_is_valid(next):
			return flask.abort(400)
		
		return flask.redirect(next or flask.url_for('index'))
	return flask.render_template('login.html', form=form)
	
@app.route('/logout')
def logout():
	logout_user()
	return redirect(somewhere)
	
	
	
#################################
### Audio Management ############
#################################

def allowed_file(filename):
	return '.' in filename and \
		filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS
		
def addSoundEntry(filename, lat, lng):
	c.execute("INSERT INTO sounds VALUES (?,?,?,?)",(None, filename, lat, lng))
	conn.commit()
	print (filename, lat, lng)

@app.route('/submit', methods=['POST'])
def upload_file():
	if request.method == 'POST':
		if 'file' not in request.files:
			flash('No file part')
			return redirect(request.url)
		file = request.files['file']
		if file.filename == '':
			flash('No selected file')
			return redirect(request.url)
		if file and allowed_file(file.filename):
			filename = secure_filename(file.filename)
			file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
			addSoundEntry(filename, request.form['lat'], request.form['lng'])
			return 'ok'
	return 'error'
	
@app.route('/get_markers', methods=['GET'])
def get_markers():
	c.execute('select * from sounds')
	array = []
	data = "["
	for row in c.fetchall():
	#row = c.fetchone();
		sound_id, sound, lat, lng = row;
		data += json.dumps({ 'sound':'uploads/'+sound, 'lat':lat, 'lng':lng})+","
	data = data[:-1]+"]"
	return data
	
    
@app.route('/uploads/<filename>')
def uploaded_file(filename):
	return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

#################################
### End Audio Management ########
#################################

@app.route('/')
def route_index():
	return render_template('index.html')
	
@app.route('/<path:path>')
def send_js(path):
	return send_static_file(path)
	
if __name__ == "__main__":
	if DB_IS_NEW:
		c.execute( """
			create table sounds (
				id integer primary key autoincrement not null,
				lat double not null,
				lng double not null,
				file text not null
			);
			""");
		conn.commit()
			
	app.run('0.0.0.0', ssl_context=sslContext)
		
