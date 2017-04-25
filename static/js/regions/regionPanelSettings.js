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
    this.parent.appendChild(regionPanel.createTitle(this.region.name));
    var backButton = this.createBackButton(_=> {
      this.updateMarkerOrder();
      regionPanel.close();
      regionPanel.open(this.region);
    });
    this.parent.appendChild(backButton);

    this.parent.appendChild(this.createDescriptionBox());

    this.parent.appendChild(this.createGroupPickerBox());

    var ul = document.createElement('ul');
    ul.className = 'mdl-list';
    this.region.markers.forEach((item) => { ul.appendChild(ui.createMarkerLi(item, { draggable: true })); });
    this.parent.appendChild(ul);

    // makes marker list sortable
    var sortable = Sortable.create(ul, {
      handle: '.drag_handle',
      onEnd: this.reorderMarkers
    });
  },

  updateMarkerOrder: function() {
    var data = new FormData();
    data.append('regionId', this.region._id);
    data.append('markers', JSON.stringify(regions.getTransporatableList(this.region)));
    data.append('description', this.region.description);

    var e = document.getElementById('group-select');
    var selectedGroup = e.options[e.selectedIndex].value;
    if (selectedGroup != this.region.group && !(selectedGroup == 'none' && typeof this.region.group == 'undefined')) {
      data.append('group', selectedGroup);
      this.region.group = selectedGroup;
    }

    $.ajax({
      url : '/update_marker_order',
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

  createDescriptionBox: function() {
    var region = this.region;
    region.description = region.description || 'There isn\'t a description';
    var ops = {
      markdown: region.description,
      button: {
        text: 'Edit',
        onclick: content=> {
          ui.markdownInputDialog(region.description)
          .then(text => {
            region.description = text;
            content.update(text);
          }).catch(_=>_);
        }
      }
    };
    return ui.markdownViewer(ops);
  }, // createDescriptionBox

  createGroupPickerBox: function() {
    var container = document.createElement('div');
    container.classList.add('group-select-container');
    var desc = document.createElement('span');
    desc.textContent = 'In Group:';
    var select = document.createElement('select');
    select.setAttribute('id','group-select');
    select.classList.add('mdl-button');
    container.appendChild(desc);
    container.appendChild(select);
    var region = this.region;

    geovoiceApi.getself()
    .then(user => {
      user.groups.forEach( group => {
        let option = document.createElement('option');
        option.setAttribute('value', group.name);
        option.textContent = group.name;
        select.appendChild(option);
      })
      select.value = region.group || 'none';
    })

    var option = document.createElement('option');
    option.setAttribute('value', 'none');
    option.textContent = 'none';
    select.appendChild(option);
    return container;
  }, // createGroupPickerBox

  createBackButton: function(onClick) {
    var i = document.createElement('i');
    i.className = 'back-button material-icons';
    i.textContent = 'arrow_back';

    var a = document.createElement('a');
    a.className = 'mdl-navigation__link';
    a.addEventListener('click', onClick);
    a.appendChild(i);
    return a;
  },
}; // regionPanelSettings
