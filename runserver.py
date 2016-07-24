from flask import Flask, render_template, request


app = Flask(__name__, static_url_path='');

@app.route('/')
def route_index():
	return render_template('index.html')
	
@app.route('/<path:path>')
def send_js(path):
	return send_static_file(path)

if __name__ == "__main__":
	app.run('10.0.0.100')
