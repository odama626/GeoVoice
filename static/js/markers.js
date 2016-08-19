var markers = {

	list: [],

	place: function(info) {
		var marker = new google.maps.Marker({
			position: { lat: parseFloat(info.lat), lng: parseFloat(info.lng)},
			map:map,
			label: info.date
		});
	
		markers.list.push(marker);
	
		var infoWindow = new google.maps.InfoWindow();
	
		marker.addListener('click', function() {
			$('audio').remove();
			infoWindow.setContent(`
					<h5>Created `+info.date+ `</h5>
					<audio controls>
						<source type="audio/mpeg" src="`+info.sound+`">
					</audio>`);
			infoWindow.open(map, marker);
		
			var listener = map.addListener('click', function() {
				infoWindow.close();
				google.maps.event.removeListener(listener);
			});
		});
	}, // place
	
	fetch: function() {
		//var bounds = map.getBounds();
		// TODO create ajax request for markers, then delete current markers and show new
		// https://developers.google.com/maps/articles/toomanymarkers#distancebasedclustering	
	
		$.ajax({
			url : "get_markers",
			type: "GET",
			success: function(data) {
				var regionList = jQuery.parseJSON(data);

				for (d = 0; d<regionList.length; d++)
				{
					if (regionList[d].regionName == "null") {
						var markerList = regionList[d].markers;
						for (i = 0; i<markerList.length; i++) {
							markers.place(markerList[i]);
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
	}, // fetch
	
	clear: function() {
		for (var i = 0; i< markers.list.length; i++) {
			markers.list[i].setMap(null);
		}
		markers.list = [];
	} // clear
	
}; // markers
