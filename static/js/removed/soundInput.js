var audioContext;
var recorder;

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
				ui.alert('Error', 'No web audio support in this browser!');
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

function startRecording(region = null) {
	ui.loading.show();
	soundInputInit().then(function(stream) {
		ui.loading.hide();
		recorder && recorder.record();
		
		ui.createDialog.recordTimer(region);
		
	}, function(err) {
			ui.loading.hide();
			ui.alert('Error', 'You need to allow micrphone access to use this feature');
	});
}

function stopRecording(region = null) {
	recorder && recorder.stop();
	
	ui.loading.show();
	recorder && recorder.exportWAV(function(blob) {
		var file = new File([blob], 'temp.wav');
		var url = URL.createObjectURL(file);
		ui.loading.hide();
		ui.createDialog.recordPreview(region, url);
	});
	//recorder.clear();
}

function requestRecording(region = null) {
	ui.loading.show();
	soundInputInit().then(function(stream) {
		ui.loading.hide();
		ui.createDialog.requestRecording(region);
	});
}

function uploadToServer(region = null) {
	recorder && recorder.exportWAV(function(blob) {
		var filename = new Date().toISOString() + '.wav';
		var data = new FormData();
		data.append('file', new File([blob], filename));
		getLocation().then(function(loc) {
			data.append('lat', loc.lat());
			data.append('lng', loc.lng());
			data.append('date', new Date().toDateString());
			data.append('region', region);
			if (region == null) {
				map.panTo(loc);
			}
		
				$.ajax({
				url : "submit",
				type: "POST",
				data: data,
				contentType: false,
				processData: false,
				success: function(data) {
					ui.createSnack('Upload completed');
				},
				error: function(e) {
					ui.createSnack('Error sending sound: '+e.toString());
				}
			});
		});
	
	});
}
