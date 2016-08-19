//Global Variables
var map;
var globalMarkerList = [];

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -34.397, lng: 150.644},
    zoom: 15,
    mapTypeControl: false,
    styles: [
			{stylers: [{ visibility: 'simplified' }]},
		]
  });
  
	google.maps.event.addListener(map, 'idle', getMarkers);
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

function clearMarkers() {
	for (var i = 0; i< globalMarkerList.length; i++) {
		globalMarkerList[i].setMap(null);
	}
	globalMarkerList = [];
}

function getMarkers() {
	//var bounds = map.getBounds();
	// TODO create ajax request for markers, then delete current markers and show new
	// https://developers.google.com/maps/articles/toomanymarkers#distancebasedclustering	
	
	$.ajax({
		url : "get_markers",
		type: "GET",
		success: function(data) {
			var regionList = jQuery.parseJSON(data);
//			console.log(regionList);
			for (d = 0; d<regionList.length; d++)
			{
				if (regionList[d].regionName == "null") {
					var markers = regionList[d].markers;
					for (i = 0; i<markers.length; i++) {
						placeSoundMarker(markers[i]);
					}
				} else {
					regions.place(regionList[d]);
				}
			}
		},
		error: function(e) {
			ui.createSnack('Error retrieving sound markers: '+e.toString());
		}
	});
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
