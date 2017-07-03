/* global activeRegion: false, MarkerSequence: false, regionPanelSettings: false */
/* exported regionPanel */

var regionPanel = {

  open: function(region) {
    panToPromise(geovoiceApi.parseLocation(region));
    if (location.search.indexOf('g') < 0) {
      console.log('blargh');
      history.replaceState('', region.name+' - PathGrab', getBaseUrl()+'?r='+region.name);
    }
    activeRegion.set(region);
    this.createHtml(region);
  }, // open

  close: function() {
    activeRegion.clear();
    if (location.search.indexOf('g') < 0) {
      history.replaceState('', 'PathGrab', getBaseUrl());
    }
    document.querySelector('.right-panel').classList.remove('slide-in');
    if (window.innerWidth <= 500) { // scroll down to show panel on mobile
      var el = document.querySelector('.map-container');
      if (navigator.userAgent.indexOf('Firefox')) {
        el.scrollIntoView({behavior: 'smooth'});
      } else {
        el.scrollIntoViewIfNeeded({behavior: 'smooth'})
      }
    }
  }, // close

  createHtml: function(region) {

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

    var rightPanel = document.querySelector('.right-panel');

    ui.clearContainer(rightPanel);
    rightPanel.appendChild(this.createTitle(region.name));

    if (region.group) {
      if (currently_logged_in) {
        geovoiceApi.getself()
        .then( user => {
          console.log(user, region.group);
          if (user.groups.find(group => group.name === region.group).name == region.group) {
            console.log('adding gear');
            let gear = this.createGear(() => {
              regionPanelSettings.constructor(region, rightPanel);
            });
            let insertionPoint = document.querySelector('.group-display');
            rightPanel.insertBefore(gear, insertionPoint);
          }
        });
      }
    } else if (currently_logged_in) {
      rightPanel.appendChild(this.createGear(() => {
        regionPanelSettings.constructor(region, rightPanel);
      }));
    }

    if (region.group) {
      var currentGroup = document.createElement('div');
      currentGroup.classList.add('group-display')
      var groupIcon = document.createElement('i');
      var groupText = document.createElement('span');
      groupText.textContent = region.group;
      groupIcon.classList.add('material-icons');
      groupIcon.textContent = 'autorenew';


      var wrapperLink = document.createElement('a');
      wrapperLink.setAttribute('href', `${location.origin}/?g=${encodeURIComponent(region.group)}`);
      wrapperLink.appendChild(groupIcon);

      currentGroup.appendChild(wrapperLink);
      currentGroup.appendChild(groupText);

      rightPanel.appendChild(currentGroup);
      if (!currently_logged_in) {
        groupIcon.textContent = 'public';
      } else {
        geovoiceApi.get('group', region.group)
        .then(group => {
          console.log(group);
          groupIcon.textContent = group.access == 'public' ? 'public' : 'lock';
        });
      }
    }

    var viewerOps = {
      markdown: region.description || '###### There isn\'t a description',
      button: {
        text: 'Show more',
        onclick: (content) => {
          content.viewer.classList.toggle('expand');
        }
      }
    }

    rightPanel.appendChild(ui.markdownViewer(viewerOps));

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
