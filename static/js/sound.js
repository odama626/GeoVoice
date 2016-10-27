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
				//this.mediaStream = stream;
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



		if (region == null) { // Only pan to insert if not in a region and if point not in center
			var mapLoc = map.getCenter();
			if (mapLoc.equals(sound.location)) {
				regions.injectMarker(region, marker);
				console.log("no pan required");
			} else { // Only wait to inject point if panning
				console.log("panning idle listener");
				map.panTo(sound.location);
				google.maps.event.addListenerOnce(map, 'idle', () => regions.injectMarker(region, marker));
			}
		} else {
			regions.injectMarker(region, marker);
		}

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
			var url = URL.createObjectURL(blob);
			sound.file = new File([blob], new Date().toISOString()+'.wav');
			ui.loading.hide();
			ui.createDialog.recordPreview(sound.location, region, url);
		});
	} //export
/*
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
*/
}; // soundHandler
