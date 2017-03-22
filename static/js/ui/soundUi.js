/* exported soundUi */

var soundUi = {

  request: function(region) {
    showDialog({
      title: 'Record some audio',
      text: 'Start recording?',
      positive: {
        title: 'yes',
        onClick: function() {
          sound.start(region);
        }
      },
      negative: {
        title: 'cancel'
      }
    });
  }, // requestRecording

  preview: function(location, region, url) {
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
          if (ENABLE_REGIONS) {
            var selected = $('#regions option:selected').text();
            region = (selected == 'none' ? null : selected);
          } else {
            region = null;
          }
          sound.upload(region);
        }
      },
      negative: {
        title: 'no'
      }
    });
  }, // recordPreview

  timer: function(region) {
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
          sound.stop(region);
          clearInterval(timerInterval);
        }
      }
    });
  } // recordTimer
};
