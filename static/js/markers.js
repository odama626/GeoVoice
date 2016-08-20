var markers = {

	list: [],
	oms: undefined, // OverlappingMarkerSpiderfier
	infoWindow: undefined,
	

	place: function(info) {
		var marker = new google.maps.Marker({
			position: { lat: parseFloat(info.lat), lng: parseFloat(info.lng)},
			map:map,
			label: info.date
		});
		
		marker.info = info;
		
		if (this.oms === undefined) { // setup spiderfier if undefined
			this.oms = new OverlappingMarkerSpiderfier(map);
			
			this.infoWindow = new google.maps.InfoWindow();
			
			this.oms.addListener('click', function(marker, event) {
				$('audio').remove();
				markers.infoWindow.setContent(`
						<h5>Created `+marker.info.date+ `</h5>
						<audio controls>
							<source type="audio/mpeg" src="`+marker.info.sound+`">
						</audio>`);
				markers.infoWindow.open(map, marker);
			});
		}
	
		markers.list.push(marker);
		this.oms.addMarker(marker);
	}, // place
	
	fetch: function() {
		//var bounds = map.getBounds();
		// TODO create ajax request for markers, then delete current markers and show new
		// https://developers.google.com/maps/articles/toomanymarkers#distancebasedclustering	
		
		// Dont refresh markers if InfoWindow is open
		if (markers.infoWindowIsOpen()) {
			return;
		}
		
		$.ajax({
			url : "get_markers",
			type: "GET",
			success: function(data) {
				var regionList = jQuery.parseJSON(data);
				markers.clear();
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
		if (this.oms !== undefined) {
			this.oms.clearMarkers();
		}
		markers.list = [];
	}, // clear
	
	infoWindowIsOpen: function () {
		if (this.infoWindow !== null && typeof this.infoWindow !== 'undefined') {
			var map = this.infoWindow.getMap();
			return (map !== null && typeof map !== "undefined");
		}
		return false;
	}
	
}; // markers
