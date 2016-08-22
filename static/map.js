//Global Variables
var map;
var drawingManager;
var _debug = true;

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -34.397, lng: 150.644},
    zoom: 15,
    mapTypeControl: false,
    styles: [
			{stylers: [{ visibility: 'simplified' }]},
		]
  });
  
	google.maps.event.addListener(map, 'idle', markers.fetch);
	map.addListener('click', regions.panel.close);
	
	getLocation().then(function(loc) {
  	map.setCenter(loc);
  });
	
	// Close navigation drawer on <a> click
	$('a').click( function() {
		$( '.mdl-layout__drawer, .mdl-layout__obfuscator' ).removeClass( 'is-visible' );
	});
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
