var sound = {

	recorder: null,
	file: null,
	audioContext: undefined,
	location: undefined,

	request: function(location = null, region = null) {
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

				this.recorder = new Recorder(mixer)

				//this._setRecorderEvents(region);
				ui.loading.hide();
				ui.createDialog.requestRecording(region);
			},
			e => ui.createSnack('Error initializing mic: '+e.toString()));
	}, // request

	start: function(region = null) {
		this.recorder && this.recorder.record();
		ui.createDialog.recordTimer(region);
	}, // start

	stop: function(region = null) {
		ui.loading.show();
		this.recorder && this.recorder.stop();

		this.export();
		// loading is hidden in recorder.onComplete
	}, // stop

	upload: function(region) {

		regions.createTempMarker(URL.createObjectURL(sound.file), sound.location, region);

		var data = new FormData();
		data.append('file', this.file);
		data.append('lat', sound.location.lat());
		data.append('lng', sound.location.lng());
		data.append('date', new Date().toString());
		data.append('region', region);

		console.time('upload sound');
		$.ajax({
			url : 'submit',
			type: 'POST',
			data: data,
			contentType: false,
			processData: false,
			success: function(data) {
				ui.createSnack('Upload completed');
				console.timeEnd('upload sound');
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
			sound.blob = blob;
			var url = URL.createObjectURL(blob);
			sound.file = new File([blob], new Date().toISOString()+'.wav');
			ui.loading.hide();
			ui.createDialog.recordPreview(sound.location, region, url);
		});
	} //export
}; // soundHandler
