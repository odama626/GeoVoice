var map = null;

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -34.397, lng: 150.644},
    zoom: 15
  });
  getLocation(function(loc) {
  	map.setCenter(loc);
	});
  
  google.maps.event.addListener(map, 'click', function(event) {
  		getLocation(placeMarker);
	});
}

function placeMarker(place) {
		var marker = new google.maps.Marker({position: place, map:map, title: "Hello world"});
		
		var infowindow = new google.maps.InfoWindow({
		content: createInputWindow()//'<input class="audio" id="mic-button" type="image" src="res/mic.png" alt="Submit" width="48" height="48">'//'<iframe src="record.html"></iframe'
		});
		
		marker.addListener('click', function() {
			infowindow.open(map, marker);
		});
}

function getLocation(func) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
    	func(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
    }, function() {
      handleLocationError(true, infoWindow, map.getCenter());
    });
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infoWindow, map.getCenter());
  }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ?
                        'Error: The Geolocation service failed.' :
                        'Error: Your browser doesn\'t support geolocation.');
}
