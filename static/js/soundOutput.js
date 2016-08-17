

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

function closeDomainPanel() {
	$('.right-panel').removeClass('slide-in');
	setTimeout( function() {
		$('#bottom-sheet-insertion-point').html('');
	}, 1000);
}

function showDomainSheet(domain) {
	var itemsHtml = '';

	for (i=0;i < domain.markers.length; i++) {
		itemsHtml += createDomainListItem(domain.markers[i]);
	}
	
	if (itemsHtml == '') {
		itemsHtml = `
			<div id='no-recordings'>
				<p>There aren't any recordings yet, why don't you add one?</p>
			</div>
		`
	}
	
	itemsHtml += "<button id='add-domain-sound' class='mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect' onClick='requestRecording(\""+domain.domainName+"\");'>Add a Sound</button><button class='mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect' onClick='closeDomainPanel()'>Close</button>";

	var sheetHtml = `
		<div class='right-panel'>
				<span class='right-panel__title'>`+domain.domainName+`</span>
				<ul class='mdl-list'>
					`+itemsHtml+`
				</ul>

		</div>
	`
	
	$('#bottom-sheet-insertion-point').html(sheetHtml);
	setTimeout(function() {
		$('.right-panel').addClass('slide-in');
	}, 100);
}

function createBottomSheet(domain) {
	var itemsHtml = '';

	for (i=0;i < domain.markers.length; i++) {
		itemsHtml += createDomainListItem(domain.markers[i]);
	}
	
	var sheetHtml = `
		<div id='bottom-sheet' class='modal bottom-sheet'>
			<div class='modal-content'>
				<h4>`+domain.domainName+`</h4>
				`+itemsHtml+`
			</div>
		</div>
	`
}

function createDomainListItem(item) {
	return `<li class="mdl-list__item mdl-list__item--two-line">
						<span class="mdl-list__item-primary-content">
							<span>`+item['date']+`</span>
							<span class="mdl-list__item-sub-title">
								<audio controls>
									<source type='audio/mpeg' src='`+item['sound']+`'>
								</audio>
							</span>
						</span>
					</li>`
}




