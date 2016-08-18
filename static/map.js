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
	map.addListener('click', closeDomainPanel);
	
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
			var domains = jQuery.parseJSON(data);
//			console.log(domains);
			for (d = 0; d<domains.length; d++)
			{
				if (domains[d].domainName == "null") {
					var markers = domains[d].markers;
					for (i = 0; i<markers.length; i++) {
						placeSoundMarker(markers[i]);
					}
				} else {
					placeDomainMarker(domains[d]);
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

function createDomain(mapClasses, color, name) {
	var location = autocomplete.getPlace().geometry.location

	var marker = new Marker({
		map:map,
		position: location,
		icon: {
			path: ROUTE,
			fillColor: color,
			fillOpacity: 1,
			strokeColor: '',
			strokeWeight: 0
		},
		map_icon_label: '<span class="'+mapClasses+'"></span>'
	});
	
	var data = new FormData();
	data.append('domainName', name);
	data.append('lat', location.lat());
	data.append('lng', location.lng());
	data.append('color', color);
	data.append('iconCss', mapClasses);
	
	$.ajax({
		url: 'submit_domain',
		type: 'POST',
		contentType: false,
		processData: false,
		data: data,
		success: function(data) {
			ui.createSnack('Successfully added');
		},
		error: function(e) {
			ui.createSnack('Error while adding: '+e.toString());
		}
	});
}

function addDomain() {
	ui.createDialog.addDomain();
}
