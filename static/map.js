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
  
  getLocation().then(function(loc) {
  	map.setCenter(loc);
  });
	
	google.maps.event.addListener(map, 'idle', getMarkers);
	map.addListener('click', closeDomainPanel);
	// Close navigation drawer on link click
	//$('#layout-drawer .mdl-navigation__link').click(function(){$('.mdl-layout__drawer').toggleClass('is-visible');});
	$('a').click( function() {
		$( '.mdl-layout__drawer, .mdl-layout__obfuscator' ).removeClass( 'is-visible' );
	});
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
		error: function() {
			var notification = document.querySelector('.mdl-js-snackbar');
			notification.MaterialSnackbar.showSnackbar({
				message: 'Error retrieving sound bytes'
			});
		}
	});
}

// the smooth zoom function
function smoothZoom (map, maxZoom, cnt) {
    if (cnt >= maxZoom) {
        return;
    }
    else {
        z = google.maps.event.addListener(map, 'zoom_changed', function(event){
            google.maps.event.removeListener(z);
            smoothZoom(map, maxZoom, cnt + 1);
        });
        setTimeout(function(){map.setZoom(cnt)}, 20);
    }
}

function placeMarker(place) {
		if (typeof latLngMarker !== 'undefined') {
			latLngMarker.setPosition(place);
		} else {
			latLngMarker = new google.maps.Marker({position: place, map:map, title: "Add sound here"});
		
			latLngMarker.click = function() { requestRecording(); }		
			latLngMarker.addListener('click', latLngMarker.click);
		}
		
		smoothZoom(map, 100, map.getZoom());
		return latLngMarker;
}

function getLocation() {
	return new Promise( function(resolve, reject) {
		if (navigator.geolocation) {
		  navigator.geolocation.getCurrentPosition(function(position) {
		  	resolve(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
		  }, function() {
		    handleLocationError(true, infoWindow, map.getCenter());
		  });
		} else {
		  // Browser doesn't support Geolocation
		  handleLocationError(false, infoWindow, map.getCenter());
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
			var notification = document.querySelector('.mdl-js-snackbar');
			notification.MaterialSnackbar.showSnackbar({
				message: 'Successfully added'
			});
		},
		error: function(data) {
			var notification = document.querySelector('.mdl-js-snackbar');
			notification.MaterialSnackbar.showSnackbar({
				message: 'Unknown error while adding'
			});
		}
	});
}

function addDomain() {
	ui.createDialog.addDomain();
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ?
                        'Error: The Geolocation service failed.' :
                        'Error: Your browser doesn\'t support geolocation.');
}
