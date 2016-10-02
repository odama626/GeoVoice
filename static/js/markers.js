var markers = {

	list: [],
	oms: undefined, // OverlappingMarkerSpiderfier
	infoWindow: undefined,
	fetchActive: true,
	

	place: function(info) {
		var marker = new google.maps.Marker({
			position: { lat: parseFloat(info.lat), lng: parseFloat(info.lng)},
			map:map,
			label: info.date
		});
		
		marker.info = info;
		info.marker = marker;
		
		if (this.oms === undefined) { // setup spiderfier if undefined
			this.oms = new OverlappingMarkerSpiderfier(map);
			
			this.infoWindow = new google.maps.InfoWindow();
			
			google.maps.event.addListener(this.infoWindow, 'closeclick', markers.closeInfoWindow);
			
			this.oms.addListener('click', markers.omsClickListener);
		}
	
		markers.list.push(marker);
		this.oms.addMarker(marker);
	}, // place
	
	pauseFetch: function() {
		console.log('pause fetch');
		this.fetchActive = false;
	}, // pauseFetch
	
	resumeFetch: function() {
		console.log('resume fetch');
		this.fetchActive = true;
	}, // resumeFetch
	
	clear: function() {
		for (var i = 0; i< markers.list.length; i++) {
			markers.list[i].setMap(null);
		}
		if (this.oms !== undefined) {
			this.oms.clearMarkers();
		}
		markers.list = [];
	}, // clear
	
	closeInfoWindow: function() {
		if (this.infoWindow !== null && typeof this.infoWindow !== 'undefined') {
			this.infoWindow.setMap(null);
			
		}
		markers.resumeFetch();
	}, // closeInfoWindow
	
	omsClickListener: function(marker, event) {
		markers.closeInfoWindow();
		markers.pauseFetch();
		$('dv audio').remove();
		markers.infoWindow.setContent(`
				<h5>Created by `+marker.info.creator+ `</h5>
				<h8>On `+ marker.info.date + `</h8> <br>
				<audio controls>
					<source type="audio/mpeg" src="`+marker.info.sound+`">
				</audio>
				
				<br>
				<!-- Deletable Contact Chip -->
				<div class="mdl-chip mdl-chip--deletable">
					<span class="mdl-chip__text">Deletable Chip</span>
					<a type="button" class="mdl-chip__action"><i class="material-icons">cancel</i></a>
				</div>
				
				`);
		markers.infoWindow.open(map, marker);
	} // omsClickListener
	
}; // markers
