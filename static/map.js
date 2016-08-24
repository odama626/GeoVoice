//Global Variables
var map;
var drawingManager;
var _debug = true;
"use strict"

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
	
	getLocation().then(function(loc) {
  	map.setCenter(loc);
  });
	
	// Close navigation drawer on <a> click
	$('a').click( function() {
		markers.closeInfoWindow();
		regions.panel.close();
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
