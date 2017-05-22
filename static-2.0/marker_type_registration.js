// initialization code
geovoice = {}

geovoice._markers = {};
geovoice._markers.type = {}
//geovoice._markers.arr = [];

geovoice._regions = {};
geovoice._regions.type = {};

{ // limit helper functions to this scope

  let createLi = (type, list) => {
    var li = document.createElement('li');
    li.classList.add('mdl-menu__item', 'mdl-list__item');
    li.addEventListener('click',_ => list.create(type));
    li.innerHTML = `<span class="mdl-list__item-primary-content">
      <i class='material-icons mdl-list__item-icon'>
      ${list.type[type].icon}</i>${type}</span>`;
    return li;
  }

  let onclick = () => {
    markers.closeInfoWindow();
    regionPanel.close();
    document.querySelector('.mdl-layout__drawer').classList.remove('is-visible');
    document.querySelector('.mdl-layout__obfuscator').classList.remove('is-visible');
  }

  window.addEventListener('load', () => {
    var ul = document.querySelector('ul[for="marker-menu"]');
    if (ul) {
      Object.keys(geovoice._markers.type).forEach(e => ul.appendChild(createLi(e, geovoice._markers)));
      var ul = document.querySelector('ul[for="marker-nav-menu"]');
      Object.keys(geovoice._markers.type).forEach(e => ul.appendChild(createLi(e, geovoice._markers)));
      ul.childNodes.forEach( a => a.addEventListener('click', onclick));
      var ul = document.querySelector('ul[for="region-menu"]');
      Object.keys(geovoice._regions.type).forEach(e => ul.appendChild(createLi(e, geovoice._regions)));
      ul.childNodes.forEach( a => a.addEventListener('click', onclick));
      var ul = document.querySelector('ul[for="region-nav-menu"]');
      Object.keys(geovoice._regions.type).forEach(e => ul.appendChild(createLi(e, geovoice._regions)));
      ul.childNodes.forEach( a => a.addEventListener('click', onclick));
    }
  });

}

geovoice._util = {}

// utilities

geovoice._util.getdevicetype = () => {
  if (window.innerWidth <= 500) {
    return 'mobile';
  } else {
    return 'pc';
  }
  // TODO return 'mobile', 'tablet', or 'pc' based on checks
  return 'pc';
}

geovoice._util.geolocate = () => {
  return new Promise(function(resolve) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        resolve(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
      }, function(e) {
        ui.createSnack('The geolocation service failed');
        reject(e);
      });
    } else {
      reject('no support');
      ui.createSnack('You browser doesn\'t support geolocation.');
    }
  });
}

function assertThrow(e) {
  try {
    e();
    console.error(`Throw expected, not received: ${e}`)
  } catch(e) { }
}

function error(msg) {
  return { type: 'error', msg: msg};
}


// markers
geovoice.registerMarkerType = (t) => {
  if (geovoice._markers.type[t.type]) {
    throw error(`marker type already registered: ${t}`);
  } else {
    geovoice._markers.type[t.type] = t;
  }
}

geovoice.registerRegionType = (t) => {
  if (geovoice._regions.type[t.type]) {
    throw error(`region type already registered: ${t}`)
  } else {
    geovoice._regions.type[t.type] = t;
  }
}

geovoice._markers.click = (e) => {
  let m = e.info;
  m.viewCount++;
  if (!geovoice._markers.type[m.type]) {throw error(`unknown type clicked ${m}, ${e}`)}
  // TODO update marker on server
  markers.pauseFetch();
  geovoice._markers.type[m.type].on.click({
    target: m,
    pin: e,
    device: geovoice._util.getdevicetype()
  }, _ => markers.resumeFetch());
}

geovoice._regions.click = (e) => {
  let m = e.info;
  m.viewCount++;
  if (!geovoice._regions.type[m.type]) {throw error(`unknown type clicked ${m}, ${e}`)}
  markers.pauseFetch();
  geovoice._regions.type[m.type].on.click({
    target: m,
    pin: e,
    device: geovoice._util.getdevicetype()
  }, _ => markers.resumeFetch());
}

geovoice._markers.create = (type, latLng = null) => {
  if (!geovoice._markers.type[type]) {throw error(`trying to create unknown marker type '${type}'`)}
  if (latLng) {
    geovoice._markers.type[type].on.create(latLng);
  } else {
    geovoice._util.geolocate().then( loc => geovoice._markers.type[type].on.create(loc));
  }
}

geovoice._regions.create = (type) => {
  if (!geovoice._regions.type[type]) {throw error(`trying to create unknown region type '${type}'`)}
  geovoice._regions.type[type].on.create();
}

geovoice._markers.getIcon = (type) => {
  if (!geovoice._markers.type[type]) {throw error(`getIcon of unknown type '${type}'`)}
  return geovoice._markers.type[type].icon;
}

geovoice._markers.getItemView = (marker) => {
  if (!geovoice._markers.type[marker.type]) {throw error(`getItemView of unknown type '${marker}'`)}
  return geovoice._markers.type[marker.type].itemView(marker);
}

geovoice._markers.getPanelView = (marker) => {
  if (!geovoice._markers.type[marker.type]) {throw error(`getPanelView of unknown type '${marker}'`)}
  return geovoice._markers.type[marker.type].panelView(marker);
}

/*
geovoice._markers.tests =  () => {
  geovoice.registerMarkerType({type: 'a'});
  geovoice.registerMarkerType({type: 'b'});
  assertThrow(_=> geovoice.registerMarkerType({type: 'a'}))

  assertThrow(_=> geovoice._markers.click({info: { type: 'd'}})) // TODO test not working
};
*/
//geovoice._markers.tests();

// Regions
