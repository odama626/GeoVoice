var audioContext;
var recorder;
var _debug = true;

function soundInputInit() {
		return new Promise(function(resolve, reject) {
			try {
				window.AudioContext = window.AudioContext || window.webkitAudioContext;
				if (bowser.chrome) {
					userMedia = navigator.webkitGetUserMedia;
				} else if (bowser.firefox) {
					userMedia = navigator.mediaDevices.getUserMedia
				}
				//navigator.mediaDevices.getUserMedia = navigator.mediaDevices.getUserMedia || navigator.webkitGetUserMedia;
				window.URL = window.URL || window.webkitURL;
		
				audioContext = new AudioContext;
				debugLog('Audio context set up.');
				debugLog('navigator.mediaDevices.getUserMedia ' + (userMedia ? 'available.' : 'not present!'));
			} catch (e) {
				alert('No web audio support in this browser!');
				reject(e);
			}
	
			navigator.webkitGetUserMedia({audio: true},function(stream) {
					startMediaStream(stream);
					resolve(stream);
				},function(e) {
					debugLog('No live audio input: ' + e);
					reject(e);
			});
		});
}

function startMediaStream(stream) {
	var input = audioContext.createMediaStreamSource(stream);
	debugLog('Media stream created');
	recorder = new Recorder(input);
	debugLog('Recorder initialized');
}

function startRecording(domain = null) {
	showLoadingWithTimeout()
	soundInputInit().then(function(stream) {
		hideLoading();
		recorder && recorder.record();
		
		ui.createDialog.recordTimer(domain);
		
	}, function(err) {
			hideLoading();
			showDialog({
				title: 'Error',
				text: 'You need to allow microphone access to use this feature',
				positive: {
					title: 'ok'
				}
			});
	});
}

function stopRecording(domain = null) {
	recorder && recorder.stop();
	
	showLoadingWithTimeout()
	recorder && recorder.exportWAV(function(blob) {
		var file = new File([blob], 'temp.wav');
		var url = URL.createObjectURL(file);
		hideLoading();
		ui.createDialog.recordPreview(domain, url);
	});
	//recorder.clear();
}

function requestRecording(domain = null) {
	showLoadingWithTimeout()
	soundInputInit().then(function(stream) {
		hideLoading();
		ui.createDialog.requestRecording(domain);
	});
}

function uploadToServer(domain = null) {
	recorder && recorder.exportWAV(function(blob) {
		var filename = new Date().toISOString() + '.wav';
		var data = new FormData();
		data.append('file', new File([blob], filename));
		getLocation().then(function(loc) {
			data.append('lat', loc.lat());
			data.append('lng', loc.lng());
			data.append('date', new Date().toDateString());
			data.append('domain', domain);
			map.panTo(loc);
		
				$.ajax({
				url : "submit",
				type: "POST",
				data: data,
				contentType: false,
				processData: false,
				success: function(data) {
					var notification = document.querySelector('.mdl-js-snackbar');
					notification.MaterialSnackbar.showSnackbar({
						message: 'Upload Completed'
					});
				},
				error: function(e) {
					var notification = document.querySelector('.mdl-js-snackbar');
					notification.MaterialSnackbar.showSnackbar({
						message: 'Error sending sound: '+e.toString()
					});
				}
			});
		});
	
	});
}

function showLoadingWithTimeout() {
	showLoading();
	setTimeout(function () {
        hideLoading();
    }, 3000);
}

function debugLog(text) {
	if (_debug) {
		console.log(text);
	}
}
