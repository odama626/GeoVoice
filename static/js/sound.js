/* global soundUi: false, RecordRTC: false */
/* exported sound */

var sound = {

  recorder: null,
  stream: null,
  blob: null,
  location: null,

  request: function(location = null) {
    ui.loading.show();
    this.location = location;

    navigator.mediaDevices.getUserMedia({ audio: true })
    .then( stream => {
      sound.recorder = RecordRTC(stream, { type: 'audio', mimeType: 'audio/wav' });
      sound.stream = stream;
      ui.loading.hide();
      soundUi.request();
    }).catch(e => ui.createSnack('Error initializing mic: '+e.toString()));
  }, // request

  start: function() {
    ui.loading.show();
    this.recorder.startRecording();
    soundUi.timer();
    ui.loading.hide();
  }, // start

  stop: function() {
    ui.loading.show();
    this.recorder.stopRecording( audioUrl => {
      sound.blob = sound.recorder.getBlob();
      soundUi.preview(location, audioUrl);
      ui.loading.hide();
    });
  }, // stop

  upload: function(region) {
    regions.createTempMarker(URL.createObjectURL(this.blob), this.location, region, 'audio');

    let marker = {
      file: new File([this.blob], new Date().toISOString()+'.wav'),
      lat: this.location.lat(),
      lng: this.location.lng(),
      type: 'audio',
      region: region
    }

    geovoiceApi.createMarker(marker)
    .then( e => ui.createSnack('Upload completed'))
    .catch( e => {
      if (currently_logged_in) {
        ui.createSnack('Error sending sound ');
      }	else {
        ui.createSnack('You need to be logged in to do that', 'Login', () => location.href='/user/login');
      }
    });
  }, // upload

  cleanup: function() {
    if (this.stream != null) {
      var tracks = this.stream.getTracks();
      tracks.forEach( (track) => track.stop() );

      this.recorder.clearRecordedData();
    }
    this.recorder = null;
    this.blob = null;
    this.stream = null;
  }
}; // soundHandler
