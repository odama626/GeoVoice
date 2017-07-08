/* global regionPanel: false, map: true, currently_logged_in: true */
/* exported initMap drawingManager */


//Global Variables
var map;
var drawingManager;
var _debug = true;
var ENABLE_REGIONS = true;
var currently_logged_in = false;


//"use strict"

function initMap() {
  document.getElementById('google-maps').remove();
  map_icons_init()
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 39, lng: -101},
    zoom: 4,
    mapTypeControl: false,
    styles: [
			{stylers: [{ visibility: 'simplified' }]},
    ]
  });

  //Check logged in status
  currently_logged_in = !document.querySelector('a[href="/user/login"]');

  setPrototypes();
  createUserDot();

  google.maps.event.addListener(map, 'idle', regions.fetch);
  map.addListener('click', () => { regionPanel.close(); markers.closeInfoWindow(); });

  if (geovoice._util.getdevicetype() == 'pc') {
    google.maps.event.addListener(map, 'rightclick', addPrecisePoint);
  } else { // add long press functionality
    google.maps.event.addListener(map, 'mousedown', (e) => {
      global_mouseup = false;
      setTimeout(() => {
        if (global_mouseup == false) {
          global_mouseup = true;
          addPrecisePoint(e);
        }
      }, 500);
    });
    google.maps.event.addListener(map, 'mouseup', (e) => {
      global_mouseup = true;
    });
    google.maps.event.addListener(map, 'dragstart',  (e) => { global_mouseup = true; });
  }

//  geovoice._util.geolocate().then((loc) => {console.log('slow set'); map.setCenter(loc)});

  if (!ENABLE_REGIONS) {
    disableRegions();
  }



  document.getElementById('map').addEventListener('pageshow', () => {
    google.maps.event.trigger(map, "resize");
  });
} // initMap

window.addEventListener('load',() => {
  $('#search-bar').betterAutocomplete('init', searchHandler.tagList, {},
    {
      select: function(result, $input) {
      //  $input.val(result.title);
        searchHandler.addChip(result.title);
        $input.val('');
      }
    }
  );

  var onclick = () => {
    markers.closeInfoWindow();
    regionPanel.close();
    document.querySelector('.mdl-layout__drawer').classList.remove('is-visible');
    document.querySelector('.mdl-layout__obfuscator').classList.remove('is-visible');
  }

  document.querySelectorAll('a').forEach( a => a.addEventListener('click', onclick));
});


function createUserDot() {
  var liveUserLocation = new google.maps.Marker({
    clickable: false,
    icon: new google.maps.MarkerImage(
      '//maps.gstatic.com/mapfiles/mobile/mobileimgs2.png',
      new google.maps.Size(22, 22),
      new google.maps.Point(0, 18),
      new google.maps.Point(11,11)),
    shadow: null,
    zIndex: 999,
    map: map
  });
  setTimeout(function updateLiveLocation() {
    geovoice._util.geolocate().then((loc) => {
      liveUserLocation.setPosition(loc);
      debugLog('Updating user location');
      setTimeout(updateLiveLocation, 30000);
    }), 30000
  });
}


function disableRegions() {
  $('#add-region-button').remove();
} // disableRegions

function debugLog(text) {
  if (_debug) {
    console.debug(text);
	}
} // debugLog
/*
function geovoice._util.geolocate() {
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
} // getLocation
*/

function panToPromise(location) {
  return new Promise( function (resolve) {
    map.panTo(location);
    google.maps.event.addListenerOnce(map, 'idle', resolve);
  });
} // panToPromise

function getBaseUrl() {
    var re = new RegExp(/^.*\/\/[^\/]+/);
    return re.exec(window.location.href);
}

function setPrototypes() {
  google.maps.Polygon.prototype.c_getBounds = function() {
    var bounds = new google.maps.LatLngBounds();
    this.getPath().forEach(function(element) {bounds.extend( element); });
    return bounds;
  };

  google.maps.Polygon.prototype.c_getLatLngLiteralArray = function() {
    var arr = [];
    this.getPath().forEach(function(element) {
      arr.push({ lat: element.lat(), lng: element.lng() });
    });
    return arr;
  };
} // setPrototypes

function getBounds(arr) {
  var bounds = new google.maps.LatLngBounds();
  arr.forEach(function(element) { bounds.extend(element); });
  return bounds;
} // getBounds

function addPrecisePoint(event) {
  if (!currently_logged_in) {
    ui.createSnack('You need to be logged in to do that', 'Login', () => location.href='/user/login');
    return;
  }
  var showWindow = () => {
    markers.closeInfoWindow();
    let keys = Object.keys(geovoice._markers.type);
    let options = keys.reduce((accum, cur) => {
        return `${accum} <button class='mdl-button mdl-js-button mdl-button--fab mdl-button--mini-fab infowindow-button' id='${cur}-request'>
           <i class='material-icons'>${geovoice._markers.type[cur].icon}</i>
        </button>
        `
    }, '');

    markers.placeInfoWindow(event.latLng,
      `
        <h5 style="padding-bottom:8px;">Add a point here?</h5>
        sneaky
          <div class="infowindow-button-container">
            ${options}
          </div>
      `);
    google.maps.event.addListenerOnce(markers.infoWindow, 'domready', () => {
      keys.forEach( key => {
        document.getElementById(`${key}-request`).onclick = () => { markers.infoWindow.close(); geovoice._markers.create(key, event.latLng); }

      });
    });
    setTimeout(()=>markers.infoWindow.open(map), 240);
  };
  //showWindow();
  var acknowledgeHold = document.createElement('div');
  acknowledgeHold.classList.add('tap-animation');
  acknowledgeHold.style.left = event.pixel.x+'px';
  acknowledgeHold.style.top = event.pixel.y+'px';
  document.getElementById('map').appendChild(acknowledgeHold);
  if (geovoice._util.getdevicetype() == 'pc') {
    showWindow();
  } else {
    google.maps.event.addListenerOnce(map, 'mouseup',() => {showWindow()});
  }

} // addPrecisePoint

geovoice._util.geolocate().then((loc) => {
  debugLog('fast geolocate'+map);
  var params = url.getQueryParams();
  if (params.indexOf('?r=') == 0 || params.indexOf('?g=') == 0) {
  } else {
    map.setCenter(loc);
  }
  map.setZoom(12);
});
