var regions = {

	list: [],

	fetch: function() {
		//var bounds = map.getBounds();
		// TODO create ajax request for markers, then delete current markers and show new
		// https://developers.google.com/maps/articles/toomanymarkers#distancebasedclustering

		// Dont refresh markers if InfoWindow is open
		if (!markers.fetchActive) {
			return;
		}
		console.time('fetch');
		$.ajax({
			url: "get_markers",
			type: "GET",
			success: function(data) {

				var regionList = jQuery.parseJSON(data);
				regions.clear();
				if (regionList.length == 0) {
					regions.createTempList();
				} else {
					for (d = 0; d < regionList.length; d++) {
						if (regionList[d].regionName == "null") {
							regionList[d].regionName = null;
						}
						regions.place(regionList[d]);
					}
				}

				if (typeof activeRegion.region === "undefined") {
					activeRegion.set(regions.list[null]);
				} else {
					activeRegion.refresh();
				}
				console.timeEnd('fetch');

			},
			error: function(e) {
				ui.createSnack('Error retrieving sound markers: ' + e.toString());
			}
		});
	}, // fetch

	add: function() {
		ui.drawingManager.init();

	}, // add

	create: function(region) {
		var location = region.geofence.c_getBounds().getCenter(); //this.getPolyCenter(region.geofence);
		var jsonGeofence = JSON.stringify(region.geofence.c_getLatLngLiteralArray());
		//JSON.stringify(region.geofence = this.getCleanPolyArray(region.geofence));

		region.lat = location.lat();
		region.lng = location.lng();
		region.shape = region.shape.substring('map-icon-'.length);
		region.markers = [];
		region.geofence = jsonGeofence;

		// Convert geofence into array of { lat:, lng: }

		this.place(region);

		var data = new FormData();
		data.append('regionName', region.regionName);
		data.append('lat', region.lat);
		data.append('lng', region.lng);
		data.append('color', region.color);
		data.append('shape', region.shape);
		data.append('icon', region.icon);
		data.append('geofence', jsonGeofence);

		$.ajax({
			url: 'submit_region',
			type: 'POST',
			contentType: false,
			processData: false,
			data: data,
			success: function(data) {
				ui.createSnack('Successfully added');
			},
			error: function(e) {
				ui.createSnack('Error while adding: ' + e.toString());
			}
		});
	}, // create

	place: function(region) {
		if (region.regionName != null) {
			region.marker = new Marker({
				map: map,
				position: {
					'lat': parseFloat(region.lat),
					'lng': parseFloat(region.lng)
				},
				icon: {
					path: this.parseMarkerShape(region.shape),
					fillColor: region.color,
					fillOpacity: 1,
					strokeColor: '',
					strokeWeight: 0
				},
				map_icon_label: '<span class="map-icon ' + region.icon + '"></span>'
			});

			region.geofence = JSON.parse(region.geofence);

			region.marker.addListener('click', function() {
				activeRegion.clear();
				//regionPanel.close();
				regionPanel.open(region);
			});
		}
		//markers.list.push(marker);
		this.list[region.regionName] = region;

	}, // place

	parseMarkerShape: function(sShape) {
		var pShape;
		switch (sShape) {
			case 'square-pin':
				pShape = SQUARE_PIN;
				break;
			case 'route-pin':
				pShape = ROUTE;
				break;
			case 'shield':
				pShape = SHIELD;
				break;
			case 'square-rounded':
				pShape = SQUARE_ROUNDED;
				break;
			case 'square':
				pShape = SQUARE;
				break;
			default:
				pShape = MAP_PIN;
		}
		return pShape;

	}, // parseMarkerShape

	createTempMarker: function(url, location, region) {
		//Place temporary marker on map
		var marker = {
			sound: url,
			creator: 'you - still pending',
			date: new Date().toString(),
			lat: location.lat(),
			lng: location.lng(),
			tags: []
		};

		if (region == null) { // Only pan to insert if not in a region and if point not in center
			var mapLoc = map.getCenter();
			if (mapLoc.equals(location)) {
				regions.injectMarker(region, marker);
				console.log("no pan required");
			} else { // Only wait to inject point if panning
				console.log("panning idle listener");
				map.panTo(location);
				google.maps.event.addListenerOnce(map, 'idle', () => regions.injectMarker(region, marker));
			}
		} else {
			regions.injectMarker(region, marker);
		}
	}, // createTempMarker

	injectMarker: function(region, marker) {
		console.log('injecting ' + marker + ' into ' + region);

		if (typeof this.list[region] == 'undefined') {
			this.createTempList();
		}

		this.list[region].markers.push(marker);
		if (region !== null) {
			this.panel.open(this.list[region], false);
		}
		console.log('placing injected marker');
		console.log(marker);
		activeRegion.set(regions.list[null]);

	}, // injectMarker

	createTempList: function() {
		this.list[null] = {
			regionName: null,
			markers: []
		}
	}, // createTempList

	clear: function() {
		for (region in regions.list) {
			if (typeof regions.list[region].marker != "undefined") {
				regions.list[region].marker.setMap(null);
				regions.list[region].marker = null;
			}
		}

		markers.clear();
	} // clear
}; // regions
