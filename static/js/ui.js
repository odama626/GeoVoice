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
		
		requestRecording: function(domain) {
			showDialog({
				title: 'Record some audio',
				text: 'Start recording?',
				positive: {
					title: 'yes',
					onClick: function (e) {
							startRecording(domain)
						}
				},
				negative: {
					title: 'cancel',
				}
			});
		}, // requestRecording
		
		recordPreview: function(domain, url) {
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
						uploadToServer(domain);
					}
				},
				negative: {
					title: 'no'
				}	
			});
		}, // recordPreview
	
		recordTimer: function(domain) {
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
						stopRecording(domain);
						clearInterval(timerInterval);
					}
				}
			});
		},// recordTimer
		
		addDomain: function() {
			showDialog({
				title: "Add Domain",
				text: `
					<form>
						<div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label">
							<input class="mdl-textfield__input" type="text" id="domain-name">
							<label class="mdl-textfield__label" for="location">Name Place</label>
						</div>
					</form>
					<form>
						<div class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label">
							<input class="mdl-textfield__input" type="text" id="domain-location">
							<label class="mdl-textfield__label" for="domain-location">Enter a location</label>
						</div>
					</form>
					<div id='domain-color' data-color='#1998F7'>
						Pick a color
						<input type='text' id='domain-palette'></input>
					</div>
					<div>
						<label class="mdl-radio mdl-js-radio mdl-js-ripple-effect" for="flash1">
							<input checked class="mdl-radio__button" id="flash1" name="flash" type="radio"
							 value="on">
							<span class="map-icon map-icon-courthouse radio-map-icon"></span>
						</label>
						<label class="mdl-radio mdl-js-radio mdl-js-ripple-effect" for="flash2">
							<input checked class="mdl-radio__button" id="flash2" name="flash" type="radio"
							 value="auto">
							<span class="map-icon map-icon-city-hall radio-map-icon"></span>
						</label>
						<label class="mdl-radio mdl-js-radio mdl-js-ripple-effect" for="flash3">
							<input checked class="mdl-radio__button" id="flash3" name="flash" type="radio"
							 value="auto">
							<span class="map-icon map-icon-grocery-or-supermarket radio-map-icon"></span>
						</label>
					</div>
					<div>
						<label class="mdl-radio mdl-js-radio mdl-js-ripple-effect" for="flash4">
							<input checked class="mdl-radio__button" id="flash4" name="flash" type="radio"
							 value="auto">
							<span class="map-icon map-icon-transit-station radio-map-icon"></span>
						</label>
						<label class="mdl-radio mdl-js-radio mdl-js-ripple-effect" for="flash5">
							<input checked class="mdl-radio__button" id="flash5" name="flash" type="radio"
							 value="auto">
							<span class="map-icon map-icon-police radio-map-icon"></span>
						</label>
						<label class="mdl-radio mdl-js-radio mdl-js-ripple-effect" for="flash6">
							<input checked class="mdl-radio__button" id="flash6" name="flash" type="radio"
							 value="auto">
							<span class="map-icon map-icon-point-of-interest radio-map-icon"></span>
						</label>
					</div>
				`,
				onLoaded: function(e) {
					var input = $('#domain-location');
					autocomplete = new google.maps.places.Autocomplete(input[0]);
					autocomplete.bindTo('bounds', map);	
			
					$('#domain-palette').spectrum({
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
							$('#domain-color').attr('data-color',color.toHexString());
						}
					});
				},
				positive: {
					title: 'okay',
					onClick: function(e) {
						var color = $('#domain-color').data('color');
						var radioLabels = $('label.is-checked');
						var icon = radioLabels.children('span');
						var name = $('#domain-name').val();
						icon.removeClass('radio-map-icon');
						createDomain(icon.attr('class'), color, name);
					}
				}
		
			});
		}, // showDomain
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
};
