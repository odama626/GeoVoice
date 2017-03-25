/* global regionPanel: false, Sortable: false */
/* export regionPanelSettings */

var regionPanelSettings = {
  constructor: function(region, parent) {
    this.region = region;
    this.parent = parent;
    ui.clearContainer(parent);
    this.initializeElement();
  },

  initializeElement: function() {
    this.parent.appendChild(regionPanel.createTitle(this.region.regionName));
    this.parent.appendChild(
      this.createBackButton(() => {
        //regionPanel.close();
        regionPanel.open(this.region);
        this.updateMarkerOrder();
      })
    );

    var ul = document.createElement('ul');
    ul.className = 'mdl-list';
    this.region.markers.forEach((item) => { ul.appendChild(ui.createMarkerLi(item)); });
    this.parent.appendChild(ul);

    var region = this.region; // TODO see if this is needed
    var sortable = Sortable.create(ul, { // makes marker list sortable
      handle: '.drag_handle',
      onEnd: this.reorderMarkers
    });
  },

  updateMarkerOrder: function() {
    var data = new FormData();
    data.append('regionId', this.region._id);
    data.append('markers', JSON.stringify(this.region.markers));

    $.ajax({
      url : 'update_marker_order',
      type: 'POST',
      data: data,
      contentType: false,
      processData: false,
      success: function() {
        ui.createSnack('marker reorder complete');
      },
      error: function() {
        ui.createSnack('Error reordering markers');
      }
    });
  },

  reorderMarkers: function(event) {
    var movedMarker = regionPanelSettings.region.markers[event.oldIndex];
    regionPanelSettings.region.markers.splice(event.oldIndex,1);
    regionPanelSettings.region.markers.splice(event.newIndex, 0, movedMarker);
  },

  createBackButton: function(onClick) {
    var i = document.createElement('i');
    i.className = 'region-panel__settings_button material-icons';
    i.textContent = 'arrow_back';

    var a = document.createElement('a');
    a.className = 'mdl-navigation__link';
    a.addEventListener('click', onClick);
    a.appendChild(i);
    return a;
  },
}; // regionPanelSettings
