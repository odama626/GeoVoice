var audioContext;
var recorder;
var _debug = true;
var soundInputInitialized = false;

function soundInputInit() {
	if (!soundInputInitialized) {
	
		try {
			window.AudioContext = window.AudioContext || window.webkitAudioContext;
			navigator.mediaDevices.getUserMedia = navigator.mediaDevices.getUserMedia || navigator.webkitGetUserMedia;
			window.URL = window.URL || window.webkitURL;
		
			audioContext = new AudioContext;
			debugLog('Audio context set up.');
			debugLog('navigator.mediaDevices.getUserMedia ' + (navigator.mediaDevices.getUserMedia ? 'available.' : 'not present!'));
			soundInputInitialized = true;
		} catch (e) {
			alert('No web audio support in this browser!');
		}
	
		navigator.mediaDevices.getUserMedia({audio: true}, startMediaStream, function(e) {
			debugLog('No live audio input: ' + e);
		});
	}
}

function startMediaStream(stream) {
	var input = audioContext.createMediaStreamSource(stream);
	debugLog('Media stream created');
	recorder = new Recorder(input);
	debugLog('Recorder initialized');
}

function startRecording() {
	recorder && recorder.record();
	$('#mic-button').addClass('hidden');
	$('#stop-button').removeClass('hidden');
}

function stopRecording() {
	recorder && recorder.stop();
	$('#stop-button').addClass('hidden');
	showPrompt();
}

function acceptRecording() {
	hidePrompt();
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

function createInputWindow() {
	return document.getElementById("sound-input-buttons").innerHTML;
}

function debugLog(text) {
	if (_debug) {
		console.log(text);
	}
}
