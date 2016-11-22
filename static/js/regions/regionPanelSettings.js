var regionPanelSettings = {
  constructor: function(region, parent) {
    this.region = region;
    this.parent = parent;
    this.clearContainer();
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

    this.region.markers.forEach(
      (item, index, array) => { ul.appendChild(this.generateItem(item))}
    );

    this.parent.appendChild(ul);

    var region = this.region;

    var sortable = Sortable.create(ul, {
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
			success: function(data) {
				ui.createSnack('marker reorder complete');
			},
			error: function(e) {
				ui.createSnack('Error reordering markers');
			}
		});
  },

  reorderMarkers: function(event) {
    console.log(regionPanelSettings.region.markers);
    var movedMarker = regionPanelSettings.region.markers[event.oldIndex];
    regionPanelSettings.region.markers.splice(event.oldIndex,1);
    regionPanelSettings.region.markers.splice(event.newIndex, 0, movedMarker);
    console.log(regionPanelSettings.region.markers);
  },

  createBackButton: function(onClick) {
    var i = document.createElement('i');
    i.className = 'region-panel__settings_button material-icons'
    i.textContent = 'arrow_back';

    var a = document.createElement('a');
    a.className = 'mdl-navigation__link';
    a.addEventListener('click', onClick);
    a.appendChild(i);
    return a;
  },

  clearContainer: function() {
    while (this.parent.firstChild) {
      this.parent.removeChild(this.parent.firstChild);
    }
  },

  generateItem: function(item) {
    var audioControls = document.createElement("audio");
    audioControls.controls = true;
    audioControls.src = item.sound;

    var subTitle = document.createElement("span");
    subTitle.className = "mdl-list__item-sub-title";
    subTitle.appendChild(audioControls);

    var dateContent = document.createElement("span");
    dateContent.textContent = item.date;

    var primaryContent = document.createElement("span");
    primaryContent.className = "mdl-list__item-primary-content";
    primaryContent.appendChild(dateContent);
    primaryContent.appendChild(subTitle);

    var dragHandle = document.createElement('i');
    dragHandle.className = 'drag_handle material-icons';
    dragHandle.textContent= 'drag_handle';
    dragHandle.style = 'padding-right: 10px; color:#757575;';

    var li = document.createElement("li");
    li.className = "mdl-list__item mdl-list__item--two-line";
    li.style = 'border-top: 1px solid #ddd;';

    li.appendChild(dragHandle);
    li.appendChild(primaryContent);

    return li;
  }

} // regionPanelSettings
