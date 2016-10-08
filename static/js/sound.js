var sound = {

	recorder: null,
	file: null,
	mediaStream: undefined,
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
				this.mediaStream = stream;
				var mixer = this.audioContext.createMediaStreamSource(this.mediaStream);

				this.recorder = new WebAudioRecorder(mixer, {
					workerDir: 'js/ext/web-audio-recorder/',
					encoding: "mp3",
					options: {
						mp3: {
							bitRate: 64
						}
					}
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
		data.append('lat', sound.location.lat());
		data.append('lng', sound.location.lng());
		data.append('date', new Date().toString());
		data.append('region', region);

		//Place temporary marker on map
		var marker = {
			sound: URL.createObjectURL(sound.file),
			creator: 'you - still pending',
			date: new Date().toString(),
			lat: sound.location.lat(),
			lng: sound.location.lng(),
			tags: []
		};

		regions.injectMarker(region, marker);

		if (region == null) {
			map.panTo(sound.location);
		}

		console.time('upload sound');
			$.ajax({
			url : "submit",
			type: "POST",
			data: data,
			contentType: false,
			processData: false,
			success: function(data) {
				ui.createSnack('Upload completed');
				console.timeEnd('upload sound');
			},
			error: function(e) {
				ui.createSnack('Error sending sound: '+e.toString());
			}
		});
	}, // upload

	_setRecorderEvents: function(region = null) {
		this.recorder.onComplete = (recorder, blob) => {
			this.file = new File([blob], new Date().toISOString() + '.mp3');
			var url = URL.createObjectURL(this.file);

			// close audio input
			this.mediaStream.getTracks()[0].stop();

			ui.loading.hide();
			ui.createDialog.recordPreview(sound.location, region, url);
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
