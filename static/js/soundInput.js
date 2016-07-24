var audioContext;
var recorder;
var _debug = true;

function soundInputInit() {
		return new Promise(function(resolve, reject) {
			try {
				window.AudioContext = window.AudioContext || window.webkitAudioContext;
				navigator.mediaDevices.getUserMedia = navigator.mediaDevices.getUserMedia || navigator.webkitGetUserMedia;
				window.URL = window.URL || window.webkitURL;
		
				audioContext = new AudioContext;
				debugLog('Audio context set up.');
				debugLog('navigator.mediaDevices.getUserMedia ' + (navigator.mediaDevices.getUserMedia ? 'available.' : 'not present!'));
			} catch (e) {
				alert('No web audio support in this browser!');
			}
	
			navigator.mediaDevices.getUserMedia({audio: true}).then(function(stream) {
																												startMediaStream(stream);
																												resolve(stream);
																												}).catch(function(e) {
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

function startRecording() {
	soundInputInit().then(function(stream) {
		recorder && recorder.record();
		$('#mic-button').addClass('hidden');
		$('#stop-button').removeClass('hidden');
	});
}

function stopRecording() {
	recorder && recorder.stop();
	$('#stop-button').addClass('hidden');
	
	recorder && recorder.exportWAV(function(blob) {
		var file = new File([blob], 'temp.wav');
		var audio = new Audio(URL.createObjectURL(file));
		audio.play()
	});
	//recorder.clear();
	showPrompt();
}

function acceptRecording() {
	hidePrompt();
	uploadToServer();
	$('#mic-button').removeClass('hidden');
}

function cancelRecording() {
	hidePrompt();
	$('#mic-button').removeClass('hidden');
}

function showPrompt() {
	$('#accept-button').removeClass('hidden');
	$('#cancel-button').removeClass('hidden');
}

function hidePrompt() {
	$('#accept-button').addClass('hidden');
	$('#cancel-button').addClass('hidden');
}

function createDownloadLink() { // TODO remove this and post it to db
	recorder && recorder.exportWAV(function(blob) {
		var filename = new Date().toISOString() + '.wav';
		var data = new FormData();
		data.append('file', new File([blob], filename));
		
		$.ajax({
			url : "submit",
			type: "POST",
			data: data,
			contentType: false,
			processData: false,
			success: function(data) {
				alert("success!");
			},
			error: function() {
				alert("failed!");
			}
		});	
	});
}

function createInputWindow() {
	return document.getElementById("sound-input-buttons").innerHTML;
}

function debugLog(text) {
	if (_debug) {
		console.log(text);
	}
}
