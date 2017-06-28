/* global videoUi: false, showDialog: false */
/* exported videoUi */

var videoUi = {

  request: function(videoSource, showFlipButton = false) {
    showDialog({
      title: `<div class='OrrsTitle'><span>Record a video</span>${(showFlipButton? `<i onClick='video.buildStream()' class='flip-video material-icons'>camera_front</i>` : '')}</div>`,
      text: 'Start recording?<br>'+
              '<video width="100%" autoplay muted src="'+videoSource+'"></video>'+
              '<a class="clickable" onClick="videoUi.requestUpload()">upload</a>'
      ,
      positive: {
        title: 'yes',
        onClick: function() {
          video.start();
        }
      },
      negative: {
        title: 'cancel',
        onClick: function() {
          video.cleanup();
        }
      }
    });
  }, //request

  requestUpload: function() { // request upload instead of recording
    video.cleanup();
    showDialog({
      title: 'Lets do some dragging then',
      text: '<div id="dropContainer"></div>',
      onLoaded: () => {
        var container = document.getElementById('dropContainer');
        var dropZone = ui.createDropZone( (file) => {
          //var reader = new FileReader();
          video.blob = file;
          ui.loading.show();
          videoUi.preview(video.location, URL.createObjectURL(file));
          ui.loading.hide();

        }, { type: 'video' });
        container.append(dropZone);
      },
      negative: {
        title: 'cancel'
      }
    });
  }, // requestUpload

  timer: (videoSource) => {
    var time = 0.00;
    var timerInterval = setInterval(() => {
      time += 0.01;
      document.getElementById('recording-timer').textContent = time.toFixed(2);
    }, 1000);

    showDialog({
      title: 'Recording',
      text: '<div id="video-container" style="position:relative;">'+
              '<video width="100%" autoplay muted src="'+videoSource+'"></video>'+
              '<h4><a id="recording-timer" class="overlay-br">0.00</a></h4>'+
            '</div>',
      positive: {
        title: 'done',
        onClick: function() {
          video.stop();
          clearInterval(timerInterval);
        }
      },
      negative: {
        title: 'cancel',
        onClick: function() {
          video.cleanup();
          clearInterval(timerInterval);
        }
      }
    });
  }, // timer

  preview: function(location, url) {
    showDialog({
      title: 'Look Good?',
      text: `
      <div id='marker-region-selection'>
      <div>Add it to a region</div>
      <select id="regions" class="mdl-button">
        <option value="none">none</option>
      <select>
      </div>
      <span>
      <video style="width:100%;" controls id="recording-player">
        Your browser doesn't support playback
      </video>
      <a id='recording-save' download="recording.webm">Save</a>
      </span>
      `,
      onLoaded: function() {
        var player = document.querySelector('#recording-player');
        player.src = url;
        document.querySelector('#recording-save').href = url;

        if (!ENABLE_REGIONS) {
          document.getElementById('marker-region-selection').remove();
        } else {

          var regionsContainer = $('#regions');
          for (var place in regions.list) {
            if (regions.list[place].type == 'sequence') {
              regionsContainer.append('<option value="' + place + '">' + place + '</option>');
            } else if (regions.list[place].type == 'classic') {
              if (getBounds(regions.list[place].geofence).contains(video.location)) {
                regionsContainer.append('<option value="' + place + '">' + place + '</option>');
              }
            }
          }
        }
      },
      positive: {
        title: 'yes',
        onClick: function() {
          var region;
          if (ENABLE_REGIONS) {
            var selected = $('#regions option:selected').text();
            region = (selected == 'none' ? null : selected);
          } else {
            region = null;
          }
          video.upload(region);
          video.cleanup();
        }
      },
      negative: {
        title: 'no',
        onClick: function() {
          video.cleanup();
        }
      }
    });
  }
};
