var sound = {

	recorder: null,
	file: null,
		
	request: function(region = null) {
		ui.loading.show();
		var audioContext = new AudioContext(); // TODO only use 1 audio context for entire site
		navigator.getUserMedia({ audio: true },
			stream => {
				var source = audioContext.createMediaStreamSource(stream);
				sound.recorder = new WebAudioRecorder(source, { 
					workerDir: 'js/ext/web-audio-recorder/',
					encoding: "mp3"
				});
				sound._setRecorderEvents(region);
				ui.loading.hide();
				ui.createDialog.requestRecording(region);
			},
			e => ui.createSnack('Error initializing mic: '+e.toString()));
	}, // request
	
	start: function(region = null) {
		sound.recorder.startRecording()
		ui.createDialog.recordTimer(region);
	}, // start
	
	stop: function(region = null) {
		ui.loading.show();
		sound.recorder.finishRecording();
		// loading is hidden in recorder.onComplete
	}, // stop
	
	upload: function(region) {
		//var filename = new Date().toISOString() + '.mp3';
		var data = new FormData();
		data.append('file', this.file);
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
	}, // upload
	
	_setRecorderEvents: function(region = null) {
		sound.recorder.onComplete = (recorder, blob) => {
			var file = new File([blob], new Date().toISOString() + '.mp3');
			var url = URL.createObjectURL(file);
			
			this.file = file;
			ui.loading.hide();
			ui.createDialog.recordPreview(region, url);
		};
	}
	
	
	
}; // soundHandler
