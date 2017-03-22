/* exported drawingUi */

var drawingUi = {

  manager: null,

  init: function() {
    this.manager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.MARKER,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: ['polygon']
      },
      polygonOptions: {
        fillOpacity: 0.3,
        fillColor: '#1998F7',
        editable: true,
        zIndex: 1
      }
    });
    this.manager.setMap(map);
    this.manager.setDrawingMode(null);
    setTimeout(function() {
      drawingUi.fixIcons();
      var drawingComplete = function(event) {
        var doneButton = $('#done-drawing');
        doneButton.css({
          'background-color': 'lightgreen'
        });

        doneButton.off('click').on('click', function() {
          drawingUi.destroy();
          regionUi.add.classic(event.overlay);
        });
      };

      google.maps.event.addListener(drawingUi.manager, 'overlaycomplete', drawingComplete);
    }, 1000);
  }, // init

  destroy: function() {
    this.manager.setMap(null);
    this.manager.setOptions({
      drawingControls: false
    });
    this.manager = null;
  }, // destroy

  fixIcons: function() {
    $('.gmnoprint').each(function() {

      var setIcon = function(obj, icon) {
        obj.children().children().remove();
        obj.css('padding', '4px');
        obj.children().html(`<div class='drawing-manager-button'>
                                <i class="material-icons">` + icon + `</i>
                              </div>`);

      };

      var panButton = $(this).find('[title="Stop drawing"]');
      var polyButton = $(this).find('[title=[Draw a shape"]');
      var container = panButton.parent().parent();

      // Change DrawingManager button icons
      setIcon(panButton, 'pan_tool');
      setIcon(polyButton, 'linear_scale');

      //Add finished editing button
      var doneButton = drawingUi.createButton('done-drawing', 'Finished drawing', 'check');
      container.append(doneButton);
    });

  }, // fixIcons

  createButton(id, title, icon, action = null) {
    var i = document.createElement('i');
    i.className = 'material-icons';
    i.textContent = icon;

    var innerDiv = document.createElement('div');
    innerDiv.className = 'drawing-manager-button';
    innerDiv.appendChild(i);

    var span = document.createElement('span');
    span.style = 'display: inlink-block;';
    span.appendChild(innerDiv);

    var div = document.createElement('div');
    div.id = id;
    div.draggable = false;
    div.title = title;
    div.className = 'drawing-manager-button-container';
    div.appendChild(span);

    var outerDiv = document.createElement('div');
    outerDiv.style = 'float: left; line-height: 0;';
    outerDiv.appendChild(div);

    if (action != null) {
      div.onClick = action;
    }

    return outerDiv;
  }, // createButton

  requestDrawing: function() {
    this.manager.activate(true);
  } // requestDrawing

}; // drawingUi
