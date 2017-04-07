/* global regionPanel: false, map: true, currently_logged_in: true */
/* exported initMap drawingManager */


//Global Variables
var map;
var drawingManager;
var _debug = false;
var ENABLE_REGIONS = true;
var currently_logged_in = false;


//"use strict"

function initMap() {
  document.getElementById('google-maps').remove();
  map_icons_init()
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -34.397, lng: 150.644},
    zoom: 15,
    mapTypeControl: false,
    styles: [
			{stylers: [{ visibility: 'simplified' }]},
    ]
  });

  //Check logged in status
  currently_logged_in = !document.querySelector('a[href="login"]');

  setPrototypes();
  createUserDot();

  google.maps.event.addListener(map, 'idle', regions.fetch);
  map.addListener('click', () => { regionPanel.close(); markers.closeInfoWindow(); });

  google.maps.event.addListener(map, 'rightclick', addPrecisePoint);


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

  getLocation().then((loc) => map.setCenter(loc));

  if (ENABLE_REGIONS == false) {
    disableRegions();
  }

  document.querySelectorAll('a').forEach( a => {
    var onclick = () => {
      markers.closeInfoWindow();
      regionPanel.close();
      document.querySelector('.mdl-layout__drawer').classList.remove('is-visible');
      document.querySelector('.mdl-layout__obfuscator').classList.remove('is-visible');
    }
    a.addEventListener('click', onclick);
  })


} // initMap

window.onload = () => {
  $('#search-bar').betterAutocomplete('init', searchHandler.tagList, {},
    {
      select: function(result, $input) {
      //  $input.val(result.title);
        searchHandler.addChip(result.title);
        $input.val('');
      }

    }
  );
}


function createUserDot() {
  var liveUserLocation = new google.maps.Marker({
    clickable: false,
    icon: new google.maps.MarkerImage('//maps.gstatic.com/mapfiles/mobile/mobileimgs2.png',
                                      new google.maps.Size(22, 22),
                                      new google.maps.Point(0, 18),
                                      new google.maps.Point(11,11)),
    shadow: null,
    zIndex: 999,
    map: map
  });
  setTimeout(function updateLiveLocation() {
    getLocation().then((loc) => {
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
    console.log(text);
	}
} // debugLog

function getLocation() {
  return new Promise( function(resolve) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        resolve(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
      }, function(e) {
        ui.createSnack('The geolocation service failed');
      });
    } else {
      // Browser doesn't support Geolocation
      ui.createSnack('You browser doesn\'t support geolocation.');
    }
  });
} // getLocation

function panToPromise(location) {
  return new Promise( function (resolve) {
    map.panTo(location);
    google.maps.event.addListenerOnce(map, 'idle', resolve);
  });
} // panToPromise

function getLoc(m) {
  return { lat: parseFloat(m.lat), lng: parseFloat(m.lng)};
}

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
    ui.createSnack('You need to be logged in to do that', 'Login', () => location.href='login');
    return;
  }
  markers.closeInfoWindow();
  markers.placeInfoWindow(event.latLng,
    `
      <h5 style="padding-bottom:8px;">Add a point here?</h5>
      sneaky
        <div class="infowindow-button-container">
          <button class="mdl-button mdl-js-button mdl-button--fab mdl-button--mini-fab infowindow-button" id="sound-request">
            <i class="material-icons">mic</i>
          </button>
          <button class="mdl-button mdl-js-button mdl-button--fab mdl-button--mini-fab infowindow-button" id="video-request">
            <i class="material-icons">videocam</i>
          </button>
        </div>
    `);

  google.maps.event.addListenerOnce(markers.infoWindow, 'domready', () => {
    var soundRequest = document.getElementById('sound-request');
    var videoRequest = document.getElementById('video-request');
    soundRequest.onclick = () => { markers.infoWindow.close(); sound.request(event.latLng);};
    videoRequest.onclick = () => { markers.infoWindow.close(); video.request(event.latLng);};
  });
  markers.infoWindow.open(map);
} // addPrecisePoint

function getResource(res) {
  if (!res.startsWith('blob:')) {
    res = '/'+res;
  }
  return res;
}
