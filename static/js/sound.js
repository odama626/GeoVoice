var sound = {

	recorder: null,
	file: null,
	audioContext: undefined,
	location: undefined,

	request: function(location = null, region = 'null') {
		ui.loading.show();

		this.location = location;
		if (location == null) {
			getLocation().then( loc => sound.location = loc);
		}

		navigator.getUserMedia({ audio: true }, // TODO switch to navigator.mediaDevices.getUserMedia(
			stream => {
				if (this.audioContext === undefined) { // only create audioContext if it doesn't already exist
					this.audioContext = new AudioContext();
				}
				var mixer = this.audioContext.createMediaStreamSource(stream);

				this.recorder = new Recorder(mixer, { numChannels: 1});

				//this._setRecorderEvents(region);
				ui.loading.hide();
				soundUi.request(region);
			},
			e => ui.createSnack('Error initializing mic: '+e.toString()));
	}, // request

	start: function(region = null) {
		this.recorder && this.recorder.record();
		soundUi.timer(region);
	}, // start

	stop: function(region = null) {
		ui.loading.show();
		this.recorder && this.recorder.stop();

		this.export();
		this.recorder.clear();
		// loading is hidden in recorder.onComplete
	}, // stop

	upload: function(region) {
		regions.createTempMarker(URL.createObjectURL(sound.file), sound.location, region);

		var data = new FormData();
		data.append('file', this.file);
		data.append('lat', sound.location.lat());
		data.append('lng', sound.location.lng());
		data.append('date', new Date().toString());
		data.append('type','sound');
		data.append('region', region);

		debugTime('upload sound');
		$.ajax({
			url : 'submit',
			type: 'POST',
			data: data,
			contentType: false,
			processData: false,
			success: function(data) {
				ui.createSnack('Upload completed');
				debugTime('upload sound', true);
			},
			error: function(e) {
				if (currently_logged_in) {
					ui.createSnack('Error sending sound: '+e.toString());
				}	else {
					ui.createSnack('You need to be logged in to do that', 'Login', () => location='login');
				}
			}
		});
	}, // upload

	export: function(region = null) {
		this.recorder && this.recorder.exportWAV(function(blob) {
			var url = URL.createObjectURL(blob);
			sound.file = new File([blob], new Date().toISOString()+'.wav');
			ui.loading.hide();
			soundUi.preview(sound.location, region, url);
		});
		this.audioContext.close();
		this.audioContext = undefined
	} //export
}; // soundHandler
