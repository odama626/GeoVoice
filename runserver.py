from flask import Flask, render_template, request, redirect, url_for
from werkzeug.utils import secure_filename
import sqlite3
import os

UPLOAD_FOLDER = 'uploads';
ALLOWED_EXTENSIONS = set(['wav', 'mp3', 'ogg'])

conn = sqlite3.connect('geovoice.db');
c = conn.cursor();

app = Flask(__name__, static_url_path='');
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER




def allowed_file(filename):
	return '.' in filename and \
		filename.rsplit('.', 1)[1] in ALLOWED_EXTENSIONS

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
			return 'ok'
	return 'error'
    
@app.route('/uploads/<filename>')
def uploaded_file(filename):
	return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/')
def route_index():
	return render_template('index.html')
	
@app.route('/<path:path>')
def send_js(path):
	return send_static_file(path)
	
	
	


if __name__ == "__main__":
	app.run('10.0.0.100')
	
