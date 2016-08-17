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
		
		// Timer logic
		var time = 0.00
		var timerInterval = setInterval(function() {
			time+= 0.01
			$('#recording-timer').text(time.toFixed(2));
		}, 1000)
		
		showDialog({
			title: 'Recording',
			text: '<h4><a id="recording-timer">0.00</a></h4>',
			positive: {
				title: 'done',
				onClick: function(e) {
					stopRecording(domain);
					clearInterval(timerInterval);
				}
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
		showDialog({
			title: 'Sound Good?',
			text: `
					<div>Do you want to make it public?</div>
					<span>
					<audio controls id="recording-player">
						<source id="audio-source" type="audio/mpeg">
						Your browser doesn't support playback
					</audio>
					</span>
				`,
			onLoaded: function(e) {
				var player = $('#recording-player')
				$('#audio-source').attr('src', url);
				player[0].pause();
				player[0].load();
			},
			positive: {
				title: 'yes',
				onClick: function(e) {
					uploadToServer(domain);
				}
			},
			negative: {
				title: 'no'
			}
		
		});
	});
	//recorder.clear();
}

function requestRecording(domain = null) {
	showLoadingWithTimeout()
	soundInputInit().then(function(stream) {
		hideLoading();
		showDialog({
			title: 'Record some audio',
			text: 'Start recording?',
			positive: {
				title: 'yes',
				onClick: function (e) {
						startRecording(domain)
					}
				},
			negative: {
				title: 'cancel',
				}
			});
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
						message: 'Error: '+e.toString()
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
