var regions = {

	list: [],

	create: function(region) {
		var location = autocomplete.getPlace().geometry.location
		
		region.lat = location.lat();
		region.lng = location.lng();
		
		this.place(region);
	
		var data = new FormData();
		data.append('regionName', region.regionName);
		data.append('lat', region.lat);
		data.append('lng', region.lng);
		data.append('color', region.color);
		data.append('icon', region.icon);
	
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
		var marker = new Marker({
			map: map,
			position: {'lat': parseFloat(region.lat), 'lng': parseFloat(region.lng)},
			icon: {
				path: MAP_PIN,
				fillColor: region.color,
				fillOpacity: 1,
				strokeColor: '',
				strokeWeight: 0
			},
			map_icon_label: '<span class="map-icon '+region.icon+'"></span>'
		});
	
		markers.list.push(marker);
		this.list[region.regionName] = region;
	
		marker.addListener('click', function() {
			regions.panel.open(region);
		});
	}, // place
	
	panel: {
		
		open: function(region) {
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
				<button id='add-region-sound'
					class='mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect' 
					onClick='sound.request("`+region.regionName+`");'>
					
					Add a Sound
				</button>
				<button 
					class='mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect' 
					onClick='regions.panel.close()'>
					
					Close
				</button>`;

			var sheetHtml = `
				<div class='right-panel'>
						<span class='right-panel__title'>`+region.regionName+`</span>
						<ul class='mdl-list'>
							`+itemsHtml+`
						</ul>

				</div>`;
	
			$('#region-panel-container').html(sheetHtml);
			setTimeout(function() {
				$('.right-panel').addClass('slide-in');
			}, 100);			
		}, // open
		
		close: function() {
			$('.right-panel').removeClass('slide-in');
			setTimeout( function() {
				$('#region-panel-container').html('');
			}, 1000);
		}, // close
		
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