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
    if (location == null) {
      getLocation().then( loc => sound.location = loc);
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
    .then( stream => {
      this.recorder = RecordRTC(stream, { type: 'audio' });
      this.stream = stream;
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

    var data = new FormData();
    data.append('file',  new File([this.blob], new Date().toISOString()+'.wav'));
    data.append('lat', this.location.lat());
    data.append('lng', this.location.lng());
    data.append('date', new Date().toString());
    data.append('type','audio');
    data.append('region', region);

    $.ajax({
      url : '/submit',
      type: 'POST',
      data: data,
      contentType: false,
      processData: false,
      success: function() {
        ui.createSnack('Upload completed');
      },
      error: function(e) {
        if (currently_logged_in) {
          ui.createSnack('Error sending sound: '+e.toString());
        }	else {
          ui.createSnack('You need to be logged in to do that', 'Login', () => location.href='login');
        }
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
