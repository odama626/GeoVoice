

function placeSoundMarker(soundInfo) {
//var marker = new google.maps.Marker({position: place, map:map, title: "Add sound here"});
	var marker = new google.maps.Marker({
		position: { lat: parseFloat(soundInfo['lat']), lng: parseFloat(soundInfo['lng'])},
		map:map,
		label: 'S'
		});
	soundInfo['playing'] = false;
		
		marker.addListener('click', function() {
			if (soundInfo['playing']) {
				soundInfo['audio'].pause();
				soundInfo['playing'] = false;
			} else {
				var audio = new Audio(soundInfo['sound']);
				audio.play();
				soundInfo['audio'] = audio;
				soundInfo['playing'] = true;
				
				audio.addEventListener('ended', function() {
					soundInfo['playing'] = false;
				});
			}
		});
		
}
