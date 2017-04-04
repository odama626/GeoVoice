/* global activeRegion: false, MarkerSequence: false, regionPanelSettings: false */
/* exported regionPanel */

var regionPanel = {

  open: function(region, animate = true) {
    panToPromise(getLoc(region));
    history.replaceState('', region.regionName+' - Geovoice', getBaseUrl()+'/region/'+region._id);
    activeRegion.set(region);
    this.createHtml(region, animate);
  }, // open

  close: function() {
    activeRegion.clear();
    history.replaceState('', 'Geovoice', getBaseUrl());
    document.querySelector('.right-panel').classList.remove('slide-in');
  }, // close

  createHtml: function(region, animate) {

    var listContainer = document.createElement('ul');
    listContainer.className = 'mdl-list';

    if (region.type == 'sequence' && region.markers.length > 0) {
      var sequence = new MarkerSequence(region);
      listContainer.appendChild(sequence.getElement());
    } else if (region.type == 'classic') {
      region.markers.forEach( (marker) => {
        listContainer.appendChild(ui.createMarkerLi(marker));
      });
    }

    // Show no recording message if no markers exist
    if (listContainer.childElementCount == 0) {
      var p = document.createElement('P');
      p.textContent = 'There aren\'t any recordings yet, why don\'t you add one?';

      var divNo = document.createElement('div');
      divNo.id = 'no-recordings';
      divNo.appendChild(p);

      listContainer.appendChild(divNo);
    }

    // Create a close panel button
    var button = document.createElement('button');
    button.className = 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect right-panel__button';
    button.onclick = regionPanel.close;
    button.textContent = 'Close';

    var div = document.createElement('div');
    div.style['padding-left'] = '15px';
    div.appendChild(button);

    listContainer.appendChild(div);

    var rightPanel = document.querySelector('.right-panel');

    ui.clearContainer(rightPanel);
    rightPanel.appendChild(this.createTitle(region.regionName));
    rightPanel.appendChild(this.createGear(() => {
        regionPanelSettings.constructor(region, sheetContainer);
      }));
    rightPanel.appendChild(listContainer);

    rightPanel.classList.add('slide-in');
  }, // createHtml

  createTitle: function(title) {
    var span = document.createElement('span');
    span.className = 'right-panel__title';
    span.textContent = title;
    return span;
  }, // createTitle

  createGear: function(onClick) {
    var i = document.createElement('i');
    i.className = 'region-panel__settings_button material-icons';
    i.textContent = 'settings';

    var a = document.createElement('a');
    a.className = 'mdl-navigation__link';
    a.addEventListener('click', onClick);
    a.appendChild(i);
    return a;
  }, // createGear
}; // regionPanel
