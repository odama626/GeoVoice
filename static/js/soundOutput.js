

function placeSoundMarker(soundInfo) {
	var marker = new google.maps.Marker({
		position: { lat: parseFloat(soundInfo.lat), lng: parseFloat(soundInfo.lng)},
		map:map,
		label: soundInfo.date
	});
	
	globalMarkerList.push(marker);
	
	var infoWindow = new google.maps.InfoWindow();
	
	marker.addListener('click', function() {
		$('audio').remove();
		infoWindow.setContent(`
				<h5>Created `+soundInfo.date+ `</h5>
				<audio controls>
					<source type="audio/mpeg" src="`+soundInfo.sound+`">
				</audio>`);
		infoWindow.open(map, marker);
		
		var listener = map.addListener('click', function() {
			infoWindow.close();
			google.maps.event.removeListener(listener);
		});
	});
}
