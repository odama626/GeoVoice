/* global videoUi: false, RecordRTC: false */
/* exported video */

var video = {
  videoStream: null,
  videoRecorder: null,
  stream: null,
  blob: null,
  location: null,

  request: function(location = null, region = 'null') {
    ui.loading.show();
    this.location = location;
    if (this.location == null) {
      getLocation().then( loc => video.location = loc);
    }

    var options = {
      mimeType: 'video/webm'
    };

    navigator.mediaDevices.getUserMedia({ audio: true, video: true})
    .then(stream => {
      this.videoRecorder = RecordRTC(stream, options);
      this.stream = stream;
      this.videoStream = URL.createObjectURL(stream);
      ui.loading.hide();
      videoUi.request(this.videoStream, region);
    }).catch(e => ui.createSnack('Error initializing camera: '+e.toString()));
  }, // request

  start: function(region = null) {
    ui.loading.show();
    this.videoRecorder.startRecording();
    videoUi.timer(region, video.videoStream);
    ui.loading.hide();
  }, // start

  stop: function(region = null) {
    ui.loading.show();
    this.videoRecorder.stopRecording( (vidUrl) => {
      video.blob = video.videoRecorder.getBlob();
      videoUi.preview(location, region, vidUrl);
      ui.loading.hide();
    });

    //video.export(region);
  }, // stop

  upload: function(region) {
    regions.createTempMarker(URL.createObjectURL(this.blob), this.location, region, 'video');

    var data = new FormData();
    data.append('file', new File([this.blob], new Date().toISOString()+'.webm'));
    data.append('lat', this.location.lat());
    data.append('lng', this.location.lng());
    data.append('date', new Date().toString());
    data.append('type', 'video');
    data.append('region', region);

    $.ajax({
      url: 'submit',
      type: 'POST',
      data: data,
      contentType: false,
      processData: false,
      success: function() {
        ui.createSnack('upload completed');
      },
      error: function(e) {
        if (currently_logged_in) {
          ui.createSnack('Error sending video: '+e.toString());
        } else {
          ui.createSnack('You need to be logged in to do that', 'Login', () => location.href='login');
        }
      }
    });
  }, // upload

  cleanup: function() {
    var tracks = this.stream.getTracks();
    tracks.forEach( (track) => track.stop() );

    this.videoRecorder.clearRecordedData();
    this.blob = null;
    this.stream = null;
    this.videoStream = null;
  }
}; // videoUi
