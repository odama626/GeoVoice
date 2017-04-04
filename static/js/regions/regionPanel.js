/* global activeRegion: false, MarkerSequence: false, regionPanelSettings: false */
/* exported regionPanel */

var regionPanel = {

  open: function(region, animate = true) {
    //console.log(region);
    panToPromise(getLoc(region));
    history.replaceState('', region.regionName+' - Geovoice', getBaseUrl()+'/region/'+region._id);
    activeRegion.set(region);
    if (animate) {
      $('#region-panel-container').html('');
    }
    this.createHtml(region, animate);
  }, // open

  close: function() {
    activeRegion.clear();
    history.replaceState('', 'Geovoice', getBaseUrl());
    $('.right-panel').removeClass('slide-in');
    $('body, html').animate({
      scrollTop: 0
    }, 500);
    setTimeout(function() {
      $('#region-panel-container').html('');
    }, 1000);
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

    var containerClasses = 'right-panel';
    if (!animate) {
      containerClasses += ' slide-in';
    }

    // Create the main container
    var sheetContainer = document.createElement('div');
    sheetContainer.className = containerClasses;

    sheetContainer.appendChild(this.createTitle(region.regionName));
    sheetContainer.appendChild(this.createGear(() => {
        regionPanelSettings.constructor(region, sheetContainer);
      }));
    sheetContainer.appendChild(listContainer);

    document.getElementById('region-panel-container').appendChild(sheetContainer);

    if (animate) {
      setTimeout(function() {
        $('.right-panel').addClass('slide-in');
      }, 100);
    }
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

  generateItem: function(item) {
    var audioControls = document.createElement('audio');
    audioControls.controls = true;
    audioControls.src = '/'+item.media;

    var subTitle = document.createElement('span');
    subTitle.className = 'mdl-list__item-sub-title';
    subTitle.appendChild(audioControls);

    var dateContent = document.createElement('span');
    dateContent.textContent = item.date;

    var primaryContent = document.createElement('span');
    primaryContent.className = 'mdl-list__item-primary-content';
    primaryContent.appendChild(dateContent);
    primaryContent.appendChild(subTitle);

    var li = document.createElement('li');
    li.className = 'mdl-list__item mdl-list__item--two-line';
    li.append(primaryContent);

    return li;
  } // generateItem
}; // regionPanel
