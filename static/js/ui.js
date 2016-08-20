var ui = {

	alert: function(title, text) {
		showDialog({
			title: title,
			text: text,
			positive: {
				title: 'ok'
			}
		});
	}, // alert

	createDialog: {
		
		requestRecording: function(region) {
			showDialog({
				title: 'Record some audio',
				text: 'Start recording?',
				positive: {
					title: 'yes',
					onClick: function (e) {
							sound.start(region)
						}
				},
				negative: {
					title: 'cancel',
				}
			});
		}, // requestRecording
		
		recordPreview: function(region, url) {
			showDialog({
				title: 'Sound Good?',
				text: `
						<div>Do you want to make it public?</div>
						<span>
						<audio controls id="recording-player">
							<source id="audio-source" type="audio/mpeg">
							Your browser doesn't support playback
						</audio>
						</span>
					`,
				onLoaded: function(e) {
					var player = $('#recording-player')
					$('#audio-source').attr('src', url);
					player[0].pause();
					player[0].load();
				},
				positive: {
					title: 'yes',
					onClick: function(e) {
						sound.upload(region);
					}
				},
				negative: {
					title: 'no'
				}	
			});
		}, // recordPreview
	
		recordTimer: function(region) {
			// Timer logic
			var time = 0.00
			var timerInterval = setInterval(function() {
				time+= 0.01
				$('#recording-timer').text(time.toFixed(2));
			}, 1000);
		
			showDialog({
				title: 'Recording',
				text: '<h4><a id="recording-timer">0.00</a></h4>',
				positive: {
					title: 'done',
					onClick: function(e) {
						sound.stop(region);
						clearInterval(timerInterval);
					}
				}
			});
		},// recordTimer
		
		addRegion: function() {
		
			$.ajax({
				url: 'dialogs/addRegion.html',
				type: 'GET',
				contentType: false,
				processData: false,
				success: function(data) {
					showDialog({
						title: 'Add Region',
						text: data,
						onLoaded: function(e) {
							var input = $('#region-location');
							autocomplete = new google.maps.places.Autocomplete(input[0]);
							autocomplete.bindTo('bounds', map);	
							
							// accordian animation
							$('.accordian-expand').click( () => $('.accordian-content').toggleClass('open'));
						 	
						 	// icon selection
						 	$('.map-marker').click((event) => {
						 		var icon = $(event.target).attr('id');
						 		$('#selected-icon').
						 			attr('class','map-icon radio-map-icon '+ icon).
						 			attr('data-icon',icon);
					 			$('.accordian-content').toggleClass('open');
					 		});
					 		
							//set initial icon
							$('.map-icon-point-of-interest').prop('checked', true);
							$('#selected-icon').
								attr('class', 'map-icon radio-map-icon map-icon-point-of-interest').
								attr('data-icon', 'map-icon-point-of-interest');
							 
			
							$('#region-palette').spectrum({ // Color picker
								showPaletteOnly: true,
								togglePaletteOnly: true,
								togglePaletteMoreText: 'more',
								togglePaletteLessText: 'less',
								hideAfterPaletteSelect: true,
								color: '#1998F7',
								palette: [
									['#00CCBB','#1998F7', '#6331AE'],
								],
								change: function(color) {
									$('#region-color').attr('data-color',color.toHexString());
								}
							});
							
						},
						positive: {
							title: 'okay',
							onClick: function(e) {
								var color = $('#region-color').data('color');
								var icon = $('#selected-icon').attr('data-icon');
								var name = $('#region-name').val();
								var region = { icon: icon, color: color, regionName: name};
								regions.create(region);
							}
						}
					});
				},
				error: function(e) {
					ui.createSnack('Couldn\'t fetch dialog');
				}
			});
		}, // addRegion
	}, // createDialog { }
	
	createSnack: function(message) {
		var notification = document.querySelector('.mdl-js-snackbar');
		notification.MaterialSnackbar.showSnackbar({
			message: message
		});
	}, // createSnack
	
	loading: {
	
		show: function(timeout = 3000) {
			showLoading();
			setTimeout(function() { ui.loading.hide() }, timeout);
		}, // show
		
		hide: function() {
			hideLoading();
		} // hide
		
	} // loading
}; // ui
