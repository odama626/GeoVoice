

function placeSoundMarker(soundInfo) {
//var marker = new google.maps.Marker({position: place, map:map, title: "Add sound here"});
	var marker = new google.maps.Marker({
		position: { lat: parseFloat(soundInfo['lat']), lng: parseFloat(soundInfo['lng'])},
		map:map,
		label: soundInfo['date']
		});
	soundInfo['playing'] = false;
	
	var infoWindow = new google.maps.InfoWindow({
		content: `
			<h5>Created `+soundInfo['date']+ `</h5>
			<audio controls>
				<source type="audio/mpeg" src="`+soundInfo['sound']+`">
			</audio>
		`
	});
	
	marker.addListener('click', function() {
		infoWindow.open(map, marker);
		
	});
	
	map.addListener('click', function() {
		infoWindow.close();
	});
}

function placeDomainMarker(domain) {
	console.log("Placing Domain Marker "+domain.domainName);
	
	var marker = new Marker({
		map: map,
		position: {'lat': parseFloat(domain.lat), 'lng': parseFloat(domain.lng)},
		icon: {
			path: MAP_PIN,
			fillColor: domain.color,
			fillOpacity: 1,
			strokeColor: '',
			strokeWeight: 0
		},
		map_icon_label: '<span class="'+domain.iconCss+'"></span>'
	});
	marker.addListener('click', function() {
		showDomainSheet(domain);
	});
	
}

function showDomainSheet(domain) {
	var itemsHtml = '';

	for (i=0;i < domain.markers.length; i++) {
		itemsHtml += createDomainListItem(domain.markers[i]);
	}


	var sheetHtml = `
		<div class='right-panel'>

				<span class='right-panel__title'>`+domain.domainName+`</span>
				<button class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect" onClick='requestRecording("`+domain.domainName+`");'>
					Add a Sound
				</button>
				<ul class='demo-list-two mdl-list'>
					`+itemsHtml+`
				</ul>

		</div>
	`
	
	$('#bottom-sheet-insertion-point').html(sheetHtml);
}

function createDomainListItem(item) {
	return `<li class="mdl-list__item mdl-list__item--two-line">
						<span class="mdl-list__item-primary-content">
							<i class="material-icons mdl-list__item-avatar">pin</i>
							<span>`+item['date']+`</span>
							<span class="mdl-list__item-sub-title">
								<audio controls>
									<source type='audio/mpeg' src='`+item['sound']+`'>
								</audio>
							</span>
						</span>
					</li>`
}




