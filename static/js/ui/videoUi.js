var videoUi = {

  request: function(videoSource, region) {
    showDialog({
      title: 'Record a video',
      text: 'Start recording?<br>'+
              '<video width="100%" autoplay muted src="'+videoSource+'"></video>'
      ,
      positive: {
        title: 'yes',
        onClick: function() {
          video.start(region);
        }
      },
      negative: {
        title: 'cancel',
        onClick: function(e) {
          video.cleanup();
        }
      }
    });
  }, //request

  timer: (region, videoSource) => {
    var time = 0.00;
    var timerInterval = setInterval(() => {
      time += 0.01;
      document.getElementById('recording-timer').innerHTML = time.toFixed(2);
    }, 1000);

    showDialog({
      title: 'Recording',
      text: '<div id="video-container" style="position:relative;">'+
              '<video width="100%" autoplay muted src="'+videoSource+'"></video>'+
              '<h4><a id="recording-timer" class="overlay-br">0.00</a></h4>'+
            '</div>',
      positive: {
        title: 'done',
        onClick: e => {
          video.stop(region);
          clearInterval(timerInterval);
        }
      },
      negative: {
        title: 'cancel',
        onClick: function(e) {
          video.cleanup();
          clearInterval(timerInterval);
        }
      }
    })
  }, // timer

  preview: function(location, region, url) {
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
      onLoaded: function(e) {
        var player = document.querySelector('#recording-player');
        player.src = url;
        document.querySelector('#recording-save').href = url;

        if (!ENABLE_REGIONS) {
          document.querySelector('#marker-region-selection').remove();
        }

        if (!ENABLE_REGIONS) {
          $('#marker-region-selection').remove();
        }

        var regionsContainer = $('#regions');

        for (var place in regions.list) {
          if (regions.list[place].type == 'sequence') {
            regionsContainer.append('<option value="' + place + '">' + place + '</option>');
          } else if (typeof regions.list[place].geofence !== 'undefined') {
            if (getBounds(regions.list[place].geofence).contains(location)) {
              regionsContainer.append('<option value="' + place + '">' + place + '</option>');
            }
          }
        }
      },
      positive: {
        title: 'yes',
        onClick: function(e) {
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
        onClick: function(e) {
          video.cleanup();
        }
      }
    });
  }
};
