//Global Variables
var map;
var drawingManager;
var _debug = false;
var ENABLE_REGIONS = true;
var currently_logged_in = false;


//"use strict"

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -34.397, lng: 150.644},
    zoom: 15,
    mapTypeControl: false,
    styles: [
			{stylers: [{ visibility: 'simplified' }]},
		]
  });

  //Check logged in status
  currently_logged_in = $('a[href="login"]').length ==0;

	setPrototypes();
  createUserDot();

	google.maps.event.addListener(map, 'idle', regions.fetch);
	map.addListener('click', () => { regionPanel.close(); markers.closeInfoWindow() });

	google.maps.event.addListener(map, 'rightclick', addPrecisePoint);

	getLocation().then((loc) => map.setCenter(loc));

	// Close navigation drawer on <a> click
	$('a').click( () => {
		markers.closeInfoWindow();
		regionPanel.close();
		$( '.mdl-layout__drawer, .mdl-layout__obfuscator' ).removeClass( 'is-visible' );
	});

	if (ENABLE_REGIONS == false) {
		disableRegions();
	}

  $(document).ready(() => {
    $('#search-bar').betterAutocomplete('init', searchHandler.tagList, {},
      {
        select: function(result, $input) {
        //  $input.val(result.title);
          searchHandler.addChip(result.title);
          $input.val('');
        }

      }
    );
  });
} // initMap

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
      setTimeout(updateLiveLocation, 30000)
    }),
    30000
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

function debugTime(text, end = false) {
  if (_debug) {
    if (end) {
      console.timeEnd(text);
    } else {
      console.time(text);
    }
  }
} // debugTime

function getLocation() {
	return new Promise( function(resolve, reject) {
		if (navigator.geolocation) {
		  navigator.geolocation.getCurrentPosition(function(position) {
		  	resolve(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
		  }, function() {
		    ui.createSnack('The geolocation service failed');
		  });
		} else {
		  // Browser doesn't support Geolocation
		  ui.createSnack('You browser doesn\'t support geolocation.');
		}
  });
} // getLocation

function panToPromise(location) {
  return new Promise( function (resolve, reject) {
    map.panTo(location);
    google.maps.event.addListenerOnce(map, 'idle', resolve);
  });
} // panToPromise

function getLoc(m) {
  return { lat: parseFloat(m.lat), lng: parseFloat(m.lng)};
}

function setPrototypes() {
	google.maps.Polygon.prototype.c_getBounds = function() {
		var bounds = new google.maps.LatLngBounds();
		this.getPath().forEach(function(element, index) {bounds.extend( element)});
		return bounds;
	};

	google.maps.Polygon.prototype.c_getLatLngLiteralArray = function() {
		var arr = [];
		this.getPath().forEach(function(element, index) {
			arr.push({ lat: element.lat(), lng: element.lng() });
		});
		return arr;
	};
} // setPrototypes

function getBounds(arr) {
	var bounds = new google.maps.LatLngBounds();
	arr.forEach(function(element, index) { bounds.extend(element) });
	return bounds;
} // getBounds

function addPrecisePoint(event) {
  if (!currently_logged_in) {
    ui.createSnack('You need to be logged in to do that', 'Login', () => location='login');
    return;
  }
	var precisePoint = new google.maps.Marker({
		position: { lat: parseFloat(event.latLng.lat()), lng: parseFloat(event.latLng.lng()) },
		map: map
	});

	showDialog({
		title: 'Precise point record',
		text: 'Add a recording here?',
		positive: {
			title: 'yes',
			onClick: function (e) {
				precisePoint.setMap(null);
				sound.request(event.latLng);
			}
		},
		negative: {
			title: 'cancel',
			onClick: function(e) {
				precisePoint.setMap(null);
			}
		}
	});
} // addPrecisePoint

function selfDestruct() {
	$.ajax({
		url: 'self_destruct',
		type: 'POST',
		contentType: false,
		processData: false,
		success: function(data) {
			ui.createSnack('Successfully added');
		},
		error: function(e) {
			ui.createSnack('Error while adding: '+e.toString());
		}
	});
} // selfDestruct
