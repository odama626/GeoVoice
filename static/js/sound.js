var sound = {

	recorder: null,
	file: null,
	mixer: undefined,
		
	request: function(region = null) {
		ui.loading.show();
		navigator.getUserMedia({ audio: true },
			stream => {
				if (this.mixer === undefined) { // only create audioContext if it doesn't already exist
					var audioContext = new AudioContext();
					this.mixer = audioContext.createMediaStreamSource(stream);
				}
				this.recorder = new WebAudioRecorder(this.mixer, { 
					workerDir: 'js/ext/web-audio-recorder/',
					encoding: "mp3"
				});
				this._setRecorderEvents(region);
				ui.loading.hide();
				ui.createDialog.requestRecording(region);
			},
			e => ui.createSnack('Error initializing mic: '+e.toString()));
	}, // request
	
	start: function(region = null) {
		this.recorder.startRecording()
		ui.createDialog.recordTimer(region);
	}, // start
	
	stop: function(region = null) {
		ui.loading.show();
		this.recorder.finishRecording();
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
					//Place new marker on map
					markers.place({
						sound: sound.file,
						date: new Date().toDateString(),
						lat: loc.lat(),
						lng: loc.lng()
					});
					
				},
				error: function(e) {
					ui.createSnack('Error sending sound: '+e.toString());
				}
			});
		});
	}, // upload
	
	_setRecorderEvents: function(region = null) {
		this.recorder.onComplete = (recorder, blob) => {
			var file = new File([blob], new Date().toISOString() + '.mp3');
			var url = URL.createObjectURL(file);
			
			this.file = file;
			ui.loading.hide();
			ui.createDialog.recordPreview(region, url);
		};
		this.recorder.onEncoderLoading = (recorder, encoding) => {
			ui.loading.show();
		};
		this.recorder.onEncoderLoaded = (recorder, encoding) => {
			ui.loading.hide();
		};
		this.recorder.onError = (recorder, e) => {
			ui.createSnack('Error encoding audio: '+e);
		};
	} // _setRecorderEvents
	
	
	
}; // soundHandler
