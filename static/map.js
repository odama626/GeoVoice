//Global Variables
var map;
var drawingManager;
var _debug = true;
var ENABLE_REGIONS = true;


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

	setPrototypes();

	google.maps.event.addListener(map, 'idle', regions.fetch);
	map.addListener('click', () => { regions.panel.close(); markers.closeInfoWindow() });

	google.maps.event.addListener(map, 'rightclick', addPrecisePoint);

	getLocation().then(function(loc) {
  	map.setCenter(loc);
  });

	// Close navigation drawer on <a> click
	$('a').click( function() {
		markers.closeInfoWindow();
		regions.panel.close();
		$( '.mdl-layout__drawer, .mdl-layout__obfuscator' ).removeClass( 'is-visible' );
	});

	if (ENABLE_REGIONS == false) {
		disableRegions();
	}

  $(document).ready(function() {
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
}

function disableRegions() {
	$('#add-region-button').remove();
}

function debugLog(text) {
	if (_debug) {
		console.log(text);
	}
}

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
}

function getBounds(arr) {
	var bounds = new google.maps.LatLngBounds();
	arr.forEach(function(element, index) { bounds.extend(element) });
	return bounds;
}

function addPrecisePoint(event) {
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
}

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
}
