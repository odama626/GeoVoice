/* global sound: false */
/* exported soundUi */

var soundUi = {

  request: function() {
    showDialog({
      title: 'Record some audio',
      text: 'Start recording? <a class="clickable" onClick="soundUi.requestUpload()">upload</a>',
      positive: {
        title: 'yes',
        onClick: function() {
          sound.start();
        }
      },
      negative: {
        title: 'cancel',
        onClick: function() {
          sound.cleanup();
        }
      }
    });
  }, // requestRecording

  requestUpload: function() { // request upload instead of recording
    sound.cleanup();
    showDialog({
      title: 'Lets do some dragging then',
      text: '<div id="dropContainer"></div>',
      onLoaded: () => {
        var container = document.getElementById('dropContainer');
        var dropZone = ui.createDropZone( (file) => {
          sound.blob = file;
          ui.loading.show();
          soundUi.preview(sound.location, URL.createObjectURL(file));
          ui.loading.hide();

        }, { type: 'audio' });
        container.append(dropZone);
      },
      negative: {
        title: 'cancel'
      }
    });
  }, // requestUpload

  preview: function(location, url) {
    showDialog({ // class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect"
      title: 'Sound Good?',
      text: `
          <div id='marker-region-selection'>
          <div>Add it to a region</div>
          <select id="regions" class="mdl-button">
            <option value="none">none</option>
          <select>
          </div>
          <span>
          <audio controls id="recording-player">
            Your browser doesn't support playback
          </audio>
          <a id='recording-save' download="recording.mp3">Save</a>
          </span>
        `,
      onLoaded: function() {
        var player = $('#recording-player');
        player.attr('src', url);
        $('#recording-save').attr('href', url);
        player[0].load();

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
        onClick: function() {
          var region;
          if (ENABLE_REGIONS) {
            var selected = $('#regions option:selected').text();
            region = (selected == 'none' ? null : selected);
          } else {
            region = null;
          }
          sound.upload(region);
          sound.cleanup();
        }
      },
      negative: {
        title: 'no',
        onClick: function() {
          sound.cleanup();
        }
      }
    });
  }, // recordPreview

  timer: function() {
    // Timer logic
    var time = 0.00;
    var timerInterval = setInterval(function() {
      time += 0.01;
      $('#recording-timer').text(time.toFixed(2));
    }, 1000);

    showDialog({
      title: 'Recording',
      text: '<h4><a id="recording-timer">0.00</a></h4>',
      positive: {
        title: 'done',
        onClick: function() {
          sound.stop();
          clearInterval(timerInterval);
        }
      },
      negative: {
        title: 'cancel',
        onClick: function() {
          sound.cleanup();
          clearInterval(timerInterval);
        }
      }
    });
  } // recordTimer
};
