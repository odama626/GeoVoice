var markers = {

	list: [],
	oms: undefined, // OverlappingMarkerSpiderfier
	infoWindow: undefined,
	fetchActive: true,


	place: function(info) {
		var marker = new google.maps.Marker({
			position: { lat: parseFloat(info.lat), lng: parseFloat(info.lng)},
			map:map,
			label: info.date.substring(0,3)
		});

		marker.info = info;
		info.marker = marker;

		if (this.oms === undefined) { // setup spiderfier if undefined
			this.oms = new OverlappingMarkerSpiderfier(map);

			this.infoWindow = new google.maps.InfoWindow( {maxWidth: 640 });

			google.maps.event.addListener(this.infoWindow, 'closeclick', markers.closeInfoWindow);

			this.oms.addListener('click', markers.omsClickListener);
		}

		markers.list.push(marker);
		this.oms.addMarker(marker);

		searchHandler.mapTags(info);
	}, // place

	placeInfoWindow(position, content) {
		if (this.infoWindow === undefined) {
			this.infoWindow = new google.maps.InfoWindow({ maxWidth: 640});
			google.maps.event.addListener(this.infoWindow, 'closeclick', markers.closeInfoWindow);
		}
		this.infoWindow.setPosition(position);
		this.infoWindow.setContent(content);
	}, // placeInfoWindow

	pauseFetch: function() {
		debugLog('pause fetch');
		this.fetchActive = false;
	}, // pauseFetch

	resumeFetch: function() {
		debugLog('resume fetch');
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
		debugTime('marker info');
		markers.closeInfoWindow();
		markers.pauseFetch();
		$('dv audio').remove();
		var date = new Date(marker.info.date);

		markers.infoWindow.setContent(`
				<h5>Created by `+marker.info.creator+ `</h5>
				<h8>At `+ date.toLocaleTimeString() +' on '+date.toLocaleDateString()+ `</h8> <br>
				`+markers.getMediaElement(marker)+`

				<br>
				<span id="tag-container">
				</span>
				`);

		markers.infoWindow.open(map, marker);
		var tagContainer = $('#tag-container');
		new TagHandler(marker.info, tagContainer);
		debugTime('marker info', true);

	}, // omsClickListener

	getMediaElement: function(marker) {
		if (marker.info.type == 'sound') {
			return '<audio controls><source type="audio/mpeg" src="'+marker.info.media+'"></audio>';
		} else if (marker.info.type == 'video') {
			return '<video controls type="video/webm" style="width:100%" src="'+marker.info.media+'"></video>';
		} else {
			console.log('unknown media type');
			console.log(marker.info);
		}
	}, // getMediaElement

	update: function(marker) {
		//var filename = new Date().toISOString() + '.mp3';
		var data = new FormData();
		data.append('media', marker.media);
		data.append('tags', JSON.stringify(marker.tags));
		data.append('region', marker.region);

		$.ajax({
			url : 'update_tags',
			type: 'POST',
			data: data,
			contentType: false,
			processData: false,
			success: function(data) {
				ui.createSnack('tag modification completed');
			},
			error: function(e) {
				ui.createSnack('Error modifying tag');
			}
		});
	}, // update
	search: function() {

	}

}; // markers
