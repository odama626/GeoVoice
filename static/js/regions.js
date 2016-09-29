var regions = {

	list: [],
	
	active: { // methods and members for currently active region
		geofence: null,
		region: undefined,
		
		set: function(region) {
			if (typeof region == "undefined") {
				return;	// if database is empty, do nothing
			}
		
			markers.clear();
			
			this.region = region;
			if (typeof region.geofence !== "undefined") {
				this.geofence = new google.maps.Polygon({
					paths: region.geofence,
					strokeColor: region.color,
					strokeOpacity: 0.8,
					strokeWeight: 2,
					fillColor: region.color,
					fillOpacity: 0.35
				});
			
				this.geofence.setMap(map);
				markers.closeInfoWindow();
				markers.pauseFetch();
			
			}
			
			if (region.regionName !== null) {
				markers.pauseFetch();
				map.fitBounds(getBounds(region.geofence));
			}
			
			this.refresh();
			
		}, // set
		
		refresh: function() {
			this.region.markers.forEach(function(element, i) {
				markers.place(element);
			}); 
		}, // refresh
		
		clear: function() {
			if (this.geofence != null) {
				this.geofence.setMap(null);
			}
			this.set(regions.list[null]);
			markers.resumeFetch();
		} // clear
	
	}, // active region
	
	fetch: function() {
		//var bounds = map.getBounds();
		// TODO create ajax request for markers, then delete current markers and show new
		// https://developers.google.com/maps/articles/toomanymarkers#distancebasedclustering	

		// Dont refresh markers if InfoWindow is open
		if (!markers.fetchActive) {
			return;
		}
		
		console.log('fetch');
		
		$.ajax({
			url : "get_markers",
			type: "GET",
			success: function(data) {
				var regionList = jQuery.parseJSON(data);
				regions.clear();
				for (d = 0; d<regionList.length; d++)
				{
					if (regionList[d].regionName == "null") {
						regionList[d].regionName = null;
					}
					regions.place(regionList[d]);
				
				}
				
				if (typeof regions.active.region === "undefined") {
					regions.active.set(regions.list[null]);
				} else {
					regions.active.refresh();
				}
				
			},
			error: function(e) {
				ui.createSnack('Error retrieving sound markers: '+e.toString());
			}
		});
	}, // fetch
	
	add: function() {
		ui.drawingManager.init();
	
	}, // add

	create: function(region) {
		var location = region.geofence.c_getBounds().getCenter();//this.getPolyCenter(region.geofence);
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
				ui.createSnack('Error while adding: '+e.toString());
			}
		});
	}, // create
	
	place: function(region) {
		if (region.regionName != null) {
			region.marker = new Marker({
				map: map,
				position: {'lat': parseFloat(region.lat), 'lng': parseFloat(region.lng)},
				icon: {
					path: this.parseMarkerShape(region.shape),
					fillColor: region.color,
					fillOpacity: 1,
					strokeColor: '',
					strokeWeight: 0
				},
				map_icon_label: '<span class="map-icon '+region.icon+'"></span>'
			});

			region.geofence = JSON.parse(region.geofence);
			
			region.marker.addListener('click', function() {
				regions.active.clear();
				//regions.panel.close();
				regions.panel.open(region);
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
	
	injectMarker: function(region, marker) {
			console.log('injecting '+marker+' into '+region);
			this.list[region].markers.push(marker);
			this.panel.open(this.list[region], false);
	}, // injectMarker
	
	clear: function() {
			for (region in regions.list) {
				if ( typeof regions.list[region].marker != "undefined") {
					regions.list[region].marker.setMap(null);
					regions.list[region].marker = null;
				}
			}
	
		markers.clear();
	}, // clear
	
	panel: {
		
		open: function(region, animate = true) {
			regions.active.set(region);
			this.createHtml(region, animate);
		}, // open
		
		close: function() {
			regions.active.clear();
			$('.right-panel').removeClass('slide-in');
			console.log('closing panel');
			$('body, html').animate({ scrollTop: 0 }, 500); 
			setTimeout( function() {
				$('#region-panel-container').html('');
			}, 1000);
		}, // close
		
		createHtml: function(region, animate) {
			var itemsHtml = '';

			for (i=0;i < region.markers.length; i++) {
				itemsHtml += regions.panel.generateItem(region.markers[i]);
			}
	
			if (itemsHtml == '') {
				itemsHtml = `
					<div id='no-recordings'>
						<p>There aren't any recordings yet, why don't you add one?</p>
					</div>
				`
			}
	
			itemsHtml += `
				<div style="padding-left:15px">
					<button 
						class='mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect right-panel__button' 
						onClick='regions.panel.close()'>
					
						Close
					</button>
				</div>`;
				
			var containerClasses = 'right-panel';
			if (!animate) {
				containerClasses+= ' slide-in';
			}
			
			var sheetHtml = `
				<div class='`+containerClasses+`'>
						<span class='right-panel__title'>`+region.regionName+`</span>
						<ul class='mdl-list'>
							`+itemsHtml+`
						</ul>

				</div>`;

			$('#region-panel-container').html(sheetHtml);
			
			if (animate) {
				setTimeout(function() {
					$('.right-panel').addClass('slide-in');
				}, 100);			
			}
		}, // createHtml
		
		generateItem: function(item) {
			return `
				<li class="mdl-list__item mdl-list__item--two-line">
					<span class="mdl-list__item-primary-content">
						<span>`+item.date+`</span>
						<span class="mdl-list__item-sub-title">
							<audio controls>
								<source type='audio/mpeg' src='`+item.sound+`'>
							</audio>
						</span>
					</span>
				</li>`;
		} // generateItem
	} // panel
	
}; // regions
