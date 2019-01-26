/* global videoUi: false, RecordRTC: false */
/* exported video */

var video = {
  // videoStream: null,
  videoRecorder: null,
  stream: null,
  blob: null,
  location: null,
  devices: null,
  currentDevice: 0,

  get videoStream() {
    console.trace ('videoStream requested');
    return this.stream;
  },

  set videoStream(value) {
    console.trace('tried setting videoStream');

  },

  request: function(location = null) {
    ui.loading.show();
    this.location = location;
    if (this.location == null) {
      geovoice._util.geolocate().then( loc => video.location = loc);
    }

    var options = {
      mimeType: 'video/webm'
    };

    navigator.mediaDevices.enumerateDevices()
    .then(devices => {
      this.devices = devices.filter( device => device.kind === 'videoinput')
      this.buildStream();
    });

  }, // request

  buildStream: function() {
    ui.loading.show();
    console.log(this);
    let constraints = {
      audio: true,
      video: {
        deviceId: { exact: this.devices[this.currentDevice].deviceId}
      }

    }
    this.currentDevice = ++video.currentDevice % video.devices.length;

    // release resources from last camera before switching
    if (this.stream != null) {
      var tracks = this.stream.getTracks();
      for (let i=0; i < tracks.length; i++) {
        tracks[i].stop();
      }
    }

    navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
      this.videoRecorder = RecordRTC(stream, { mimeType: 'video/webm'});
      this.stream = stream;
      ui.loading.hide();
      this.requestOrInject('.flip-video');
    }).catch( e => ui.createSnack('Error initializing camera: '+e.toString()));
  },

  requestOrInject(className = null) {
    let injected = false;
    if (className) {
      let domEl = document.querySelector(`${className} > video`)
        || document.querySelector(`${className} + video`);
      if (domEl) {
        let newEl = document.createElement('video');
        newEl.setAttribute('width', '100%');
        newEl.setAttribute('autoplay', true);
        newEl.setAttribute('muted', true);
        newEl.setAttribute('srcObject', this.stream);
        domEl.replaceWith(newEl);
        injected = true;
      }
    }
    if (!injected) {
      videoUi.request(this.stream, this.devices.length > 0);
    }
  },

  start: function() {
    ui.loading.show();
    this.videoRecorder.startRecording();
    videoUi.timer(video.stream);
    ui.loading.hide();
  }, // start

  stop: function() {
    ui.loading.show();
    this.videoRecorder.stopRecording( (vidUrl) => {
      video.blob = video.videoRecorder.getBlob();
      videoUi.preview(this.location, vidUrl);
      ui.loading.hide();
    });
  }, // stop

  upload: function(region) {
    regions.createTempMarker(URL.createObjectURL(this.blob), this.location, region, 'video');
    //
    // var data = new FormData();
    // data.append('file', new File([this.blob], new Date().toISOString()+'.webm'));
    // data.append('lat', this.location.lat());
    // data.append('lng', this.location.lng());
    // data.append('date', new Date().toString());
    // data.append('type', 'video');
    // data.append('region', region);

    let marker = {
      file: new File([this.blob], new Date().toISOString()+'.webm'),
      lat: this.location.lat(),
      lng: this.location.lng(),
      type: 'video',
      region: region
    }

    geovoiceApi.createMarker(marker)
    .then(e => ui.createSnack('Upload Complete'))
    .catch(e => {
      if (currently_logged_in) {
        ui.createSnack('Error sending video: '+e.toString());
      } else {
        ui.createSnack('You need to be logged in to do that', 'Login', () => location.href='/user/login');
      }
    });
    //
    //
    //
    // $.ajax({
    //   url: '/submit',
    //   type: 'POST',
    //   data: data,
    //   contentType: false,
    //   processData: false,
    //   success: function() {
    //     ui.createSnack('upload completed');
    //   },
    //   error: function(e) {
    //
    //   }
    // });
  }, // upload

  cleanup: function() {
    if (this.stream != null) {
      var tracks = this.stream.getTracks();
      tracks.forEach( (track) => track.stop() );

      this.videoRecorder.clearRecordedData();
    }

    this.blob = null;
    this.stream = null;
    this.videoStream = null;
    this.videoRecorder = null;
  }
}; // videoUi
