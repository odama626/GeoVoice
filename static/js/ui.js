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
					onClick: function() {
						sound.start(region);
					}
				},
				negative: {
					title: 'cancel'
				}
			});
		}, // requestRecording

		recordPreview: function(location, region, url) {
			showDialog({ // class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect"
				title: 'Sound Good?',
				text: `
						<div id='marker-region-selection'>
						<div>Add it to a region</div>
						<select id="regions" class="mdl-button">
							<option value="none">none</option>
						<select>
						</div>
						<span>
						<audio controls id="recording-player">
							Your browser doesn't support playback
						</audio>
						<a id='recording-save' download="recording.mp3">Save</a>
						</span>
					`,
				onLoaded: function(e) {
					var player = $('#recording-player')
					player.attr('src', url);
					$('#recording-save').attr('href', url);
					player[0].load();

					if (!ENABLE_REGIONS) {
						$('#marker-region-selection').remove();
					}

					var regionsContainer = $('#regions');

					for (var place in regions.list) {
						if (typeof regions.list[place].geofence !== 'undefined') {
							if (getBounds(regions.list[place].geofence).contains(location)) {
								regionsContainer.append('<option value="' + place + '">' + place + '</option>');
							}
						}
					}

				},
				positive: {
					title: 'yes',
					onClick: function(e) {
						if (ENABLE_REGIONS) {
							var selected = $('#regions option:selected').text();
							region = (selected == 'none' ? null : selected);
						} else {
							region = null;
						}
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
			var time = 0.00;
			var timerInterval = setInterval(function() {
				time += 0.01;
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
		}, // recordTimer

		addRegion: function(geofence) {

			$.ajax({
				url: 'dialogs/addRegion.pug',
				type: 'GET',
				contentType: false,
				processData: false,
				success: function(data) {
					showDialog({
						title: 'Add Region',
						text: data,
						onLoaded: function(e) {

							// accordian animation
							$('.accordian-expand').click(
								() => $(event.target).next('.accordian-content').toggleClass('open'));

							// icon selection
							$('.map-marker').click((event) => {
								var icon = $(event.target).attr('id');
								var selected = $(event.target).parent().prevAll('span').first();
								var accordianContent = selected.nextAll('div').first();
								selected.
								attr('class', 'map-icon radio-map-icon ' + icon).
								attr('data-icon', icon);
								$(accordianContent).toggleClass('open');
							});

							//set initial icon
							$('.map-icon-point-of-interest').prop('checked', true);
							$('#selected-icon').
							attr('class', 'map-icon radio-map-icon map-icon-point-of-interest').
							attr('data-icon', 'map-icon-point-of-interest');

							var initialColor = '#1998F7';

							var markerShape = $('#selected-marker-shape');
							markerShape.css({
								'color': initialColor
							});
							markerShape.
							attr('class', 'map-icon radio-map-icon map-icon-map-pin').
							attr('data-icon', 'map-icon-map-pin');
							markerShape.nextAll('div').first().children().css({
								'color': initialColor
							});


							$('#region-palette').spectrum({ // Color picker
								showPaletteOnly: true,
								togglePaletteOnly: true,
								togglePaletteMoreText: 'more',
								togglePaletteLessText: 'less',
								hideAfterPaletteSelect: true,
								color: initialColor,
								palette: [
									['#00CCBB', '#1998F7', '#6331AE'],
								],
								change: function(color) {
									var hColor = color.toHexString();
									var markerShape = $('#selected-marker-shape');
									$('#region-color').attr('data-color', hColor);
									markerShape.css({
										'color': hColor
									});
									markerShape.nextAll('div').first().children().css({
										'color': hColor
									});
								},
							});

						},
						positive: {
							title: 'okay',
							onClick: function(e) {
								var color = $('#region-color').data('color');
								var icon = $('#selected-icon').attr('data-icon');
								var shape = $('#selected-marker-shape').attr('data-icon');
								var name = $('#region-name').val();
								var region = {
									icon: icon,
									shape: shape,
									color: color,
									regionName: name,
									geofence: geofence
								};
								region.geofence.setMap(null);
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

	createSnack: function(message, actionText = null, actionHandler = null) {
		var notification = document.querySelector('.mdl-js-snackbar');
		notification.MaterialSnackbar.showSnackbar({
			message: message,
			actionText: actionText,
			actionHandler: actionHandler
		});
	}, // createSnack

	loading: {

		show: function(timeout = 3000) {
			showLoading();
			setTimeout(function() {
				ui.loading.hide()
			}, timeout);
		}, // show

		hide: function() {
				hideLoading();
			} // hide

	}, // loading

	drawingManager: {

		manager: null,

		init: function() {
			this.drawingManager = new google.maps.drawing.DrawingManager({
				drawingMode: google.maps.drawing.OverlayType.MARKER,
				drawingControl: true,
				drawingControlOptions: {
					position: google.maps.ControlPosition.TOP_CENTER,
					drawingModes: ['polygon']
				},
				polygonOptions: {
					fillOpacity: 0.3,
					fillColor: '#1998F7',
					editable: true,
					zIndex: 1
				}
			});
			this.drawingManager.setMap(map);
			this.drawingManager.setDrawingMode(null);
			setTimeout(function() {
				ui.drawingManager.fixIcons();
				var drawingComplete = function(event) {
					var doneButton = $('#done-drawing');
					doneButton.css({
						'background-color': 'lightgreen'
					});

					doneButton.off('click').on('click', function() {
						ui.drawingManager.destroy();
						ui.createDialog.addRegion(event.overlay);
					});
				};

				google.maps.event.addListener(ui.drawingManager.drawingManager, 'overlaycomplete', drawingComplete);
			}, 1000);
		}, // init

		destroy: function() {
			this.drawingManager.setMap(null);
			this.drawingManager.setOptions({
				drawingControls: false
			});
			this.drawingManager = null;
		}, // destroy

		fixIcons: function() {
			$('.gmnoprint').each(function() {

				var setIcon = function(obj, icon) {
					obj.children().children().remove();
					obj.children().html(`<div class='drawing-manager-button'>
																	<i class="material-icons">` + icon + `</i>
																</div>`);
				};

				var panButton = $(this).find("[title='Stop drawing']");
				var polyButton = $(this).find("[title='Draw a shape']");
				var rectButton = $(this).find("[title='Draw a rectangle']");
				var container = panButton.parent().parent();

				// Change DrawingManager button icons
				setIcon(panButton, 'pan_tool');
				setIcon(polyButton, 'linear_scale');
				setIcon(rectButton, 'photo_size_select_small');

				//Add finished editing button
				container.append(`
					<div style="float: left; line-height: 0;">
						<div id="done-drawing" draggable="false" title="Finished drawing" class="drawing-manager-button-container">
							<span style="display: inline-block;">
								<div class="drawing-manager-button">
									<i class="material-icons">check</i>
								</div>
							</span>
						</div>
					</div>`);

			});

		}, // fixIcons

		requestDrawing: function() {
				this.drawingManager.activate(true);
			} // requestDrawing


	} // drawingManager

}; // ui
