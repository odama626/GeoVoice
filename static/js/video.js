var video = {
  videoStream: null,
  videoRecorder: undefined,
  stream: null,
  file: null,
  blob: null,
  location: undefined,

  interval: 3000, // recording interval

  request: function(location = null, region = 'null') {
    ui.loading.show();
    console.log(location);
    video.location = location;
    if (this.location == null) {
      getLocation().then( loc => video.location = loc);
    }

    navigator.getUserMedia({ audio: true, video: true},
      stream => {
        if (this.videoRecorder === undefined) {
          this.videoRecorder = new MediaStreamRecorder(stream);
          console.log(this.videoRecorder);
          this.videoRecorder.mimeType = "video/webm";
          this.videoRecorder.ondataavailable = (blob) => {
        //    console.log(blob);
            this.blob = blob;

          }
          this.stream = stream;
          this.videoStream = URL.createObjectURL(stream);
        }

        ui.loading.hide();
        videoUi.request(this.videoStream, region);
      },
      e => ui.createSnack('Error initializing camera: '+e.toString()));
  }, // request

  start: function(region = null) {
    //this.videoRecorder.clearOldRecordedFrames();
    this.videoRecorder.start(this.interval);
    videoUi.timer(region, this.videoStream);
  }, // start

  stop: function(region = null) {
    ui.loading.show();
  //  this.videoRecorder.stop();
    //this.upload(region);
    this.videoRecorder.stop();
    ui.loading.hide();
    this.export(region);
  }, // stop

  export: function(region = null) {
    var url = URL.createObjectURL(this.blob);
    this.file = new File([this.blob], new Date().toISOString()+'.webm');
    videoUi.preview(location, region, url);
  }, // export

  upload: function(region) {
    //this.videoRecorder.save(this.blob, "");
    regions.createTempMarker(URL.createObjectURL(this.blob), video.location, region, 'video');

    var data = new FormData();
    data.append('file', this.file);
    data.append('lat', video.location.lat());
    data.append('lng', video.location.lng());
    data.append('date', new Date().toString());
    data.append('type', 'video');
    data.append('region', region);

    debugTime('upload video');
    $.ajax({
      url: 'submit',
      type: 'POST',
      data: data,
      contentType: false,
      processData: false,
      success: function(data) {
        ui.createSnack('upload completed');
        debugTime('upload video', true);
      },
      error: function(e) {
        if (currently_logged_in) {
          ui.createSnack('Error sending video: '+e.toString());
        } else {
          ui.createSnack('You need to be logged in to do that', 'Login', () => location='login');
        }
      }
    });
  }, // upload

  cleanup: function() {
    var tracks = this.stream.getTracks();
    this.videoRecorder.stop();
    for (var i = 0; i<tracks.length; i++) {
      tracks[i].stop();
    }
    //this.blob = null;
    //this.file = null;
    this.stream = null;
    this.videoStream = null;
    this.videoRecorder = undefined;
  }

} // videoUi
