/* global drawingUi: false */
/* exported regionUi */

var regionUi = {

  add: {
    requestType: function() {
      showDialog({
        title: 'Which type of region would you like to make?',
        text: `
            We now support two different types of regions
            <div id='regionUi-container'></div>
            `,
        onLoaded: () => {
          var container = document.getElementById('regionUi-container');
          var classicDesc = 'Classic - region has a geofence, and marker to open';
          var sequenceDesc = 'Sequence - region markers are played in sequence';

          container.appendChild(ui.createRadio('classic', classicDesc, 'classic', 'type', true));
          container.appendChild(ui.createRadio('sequence', sequenceDesc, 'sequence', 'type'));
        },
        positive: {
          title: 'Ok',
          onClick: () => {
            var container = document.getElementById('regionUi-container');
            var selectionId = container.querySelector('input:checked').id;

            if (selectionId == 'classic') {
              drawingUi.init();
            } else if (selectionId == 'sequence') {
              ui.pickPoint();
              //regionUi.add.sequence();
            }
          }
        },
        negative: {
          title: 'Cancel'
        }
      });
    }, // requestType

    sequence: function(location) {
      //google.maps.event.addListenerOnce(map, 'click', resolve);

      var region = {
        lat: location.lat(),
        lng: location.lng(),
        geofence: null,
        type: 'sequence'
      };

      this.showCreateDialog(region);
    }, // sequence

    classic: function(geofence) {
      var location = geofence.c_getBounds().getCenter();

      var region = {
        lat: location.lat(),
        lng: location.lng(),
        geofence: geofence.c_getLatLngLiteralArray(),
        type: 'classic'
      };

      geofence.setMap(null);

      this.showCreateDialog(region);
    }, // classic

    nameAvailable: function() {
      var name = document.getElementById('region-name');
      var showAvailable = (available) => {
        if (available) {
          name.parentElement.classList.remove('is-invalid');
          document.getElementById('okay-button').disabled = false;
        } else {
          document.getElementById('okay-button').disabled = true;
          name.onkeyup = regionUi.add.nameAvailable;
          name.parentElement.classList.add('is-invalid');

        }
      }
      geovoiceApi.checkNameAvailability('region',name.value)
      .then(_=>showAvailable(true)).catch(_=>showAvailable(false));
    }, // nameAvailable

    showCreateDialog: function(region) {
      $.ajax({
        url: '/dialogs/addRegion.pug',
        type: 'GET',
        contentType: false,
        processData: false,
        success: function(data) {
          showDialog({
            title: 'Add Region',
            text: data,
            onLoaded: function() {
              document.getElementById('okay-button').disabled = true;
              // accordian animation
              $('.accordian-expand').click(
                () => $(event.target).next('.accordian-content').toggleClass('open'));

              // icon selection
              $('.map-marker').click((event) => {
                var icon = $(event.target).attr('id');
                var selected = $(event.target).parent().prevAll('span').first();
                var accordianContent = selected.nextAll('div').first();
                selected.
                attr('class', 'map-icon radio-map-icon ' + icon).
                attr('data-icon', icon);
                $(accordianContent).toggleClass('open');
              });

              //set initial icon
              $('.map-icon-point-of-interest').prop('checked', true);
              $('#selected-icon').
              attr('class', 'map-icon radio-map-icon map-icon-point-of-interest').
              attr('data-icon', 'map-icon-point-of-interest');

              var initialColor = '#1998F7';

              var markerShape = $('#selected-marker-shape');
              markerShape.css({
                'color': initialColor
              });
              markerShape.
              attr('class', 'map-icon radio-map-icon map-icon-map-pin').
              attr('data-icon', 'map-icon-map-pin');
              markerShape.nextAll('div').first().children().css({
                'color': initialColor
              });


              $('#region-palette').spectrum({ // Color picker
                showPaletteOnly: true,
                togglePaletteOnly: true,
                togglePaletteMoreText: 'more',
                togglePaletteLessText: 'less',
                hideAfterPaletteSelect: true,
                color: initialColor,
                palette: [
                  ['#00CCBB', '#1998F7', '#6331AE'],
                ],
                change: function(color) {
                  var hColor = color.toHexString();
                  var markerShape = $('#selected-marker-shape');
                  $('#region-color').attr('data-color', hColor);
                  markerShape.css({
                    'color': hColor
                  });
                  markerShape.nextAll('div').first().children().css({
                    'color': hColor
                  });
                },
              });

            },
            positive: {
              id: 'okay-button',
              title: 'okay',
              onClick: function() {
                var color = $('#region-color').data('color');
                var icon = $('#selected-icon').attr('data-icon');
                var shape = $('#selected-marker-shape').attr('data-icon');
                var name = $('#region-name').val();

                // Add region marker properties
                region.icon = icon;
                region.shape = shape.substring('map-icon-'.length);
                region.color = color;
                region.name = name;
                regions.create(region);
              }
            }
          });
        },
        error: function() {
          ui.createSnack('Couldn\'t fetch dialog');
        }
      });
    }, // showCreateDialog
  }
};
