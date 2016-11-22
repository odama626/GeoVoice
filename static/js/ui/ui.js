var ui = {

	createSnack: function(message, actionText = null, actionHandler = null) {
		var notification = document.querySelector('.mdl-js-snackbar');
		notification.MaterialSnackbar.showSnackbar({
			message: message,
			actionText: actionText,
			actionHandler: actionHandler
		});
	}, // createSnack

	createCheckbox: function(id, label) {
		var span = document.createElement('span');
		span.className = 'mdl-checkbox__label';
		span.textContent = label;

		var input = document.createElement('input');
		input.type = 'checkbox';
		input.id = id;
		input.className = 'mdl-checkbox__input';

		var label = document.createElement('label');
		label.className = 'mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect';
		label.for = id;
		label.appendChild(input);
		label.appendChild(span);
		return label;
	}, // createCheckbox

	createRadio: function(id, label, value, group, checked = false) {
		var span = document.createElement('span');
		span.className = 'mdl-radio__label';
		span.textContent = label;

		var input = document.createElement('input');
		input.type = 'radio';
		input.id = id;
		input.className = 'mdl-radio__button';
		input.name = group;
		input.value = value;
		input.checked = checked;

		var label = document.createElement('label');
		label.className = 'mdl-radio mdl-js-radio mdl-js-ripple-effect';
		label.for = id;
		label.appendChild(input);
		label.appendChild(span);
		return label;
	}, // createRadio

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

	createDialog: function(p) {
		p.title = p.title || '';
		p.text = p.text || '';
		p.positive.title = p.positive.title || 'Ok';
		p.positive.onClick = p.positive.onClick || ((e) => alert('positive onclick not set'));
		p.negative.title = p.negative.title || 'Cancel';
		p.negative.onClick = p.negative.onClick || ((e) => alert('negative onclick not set'));
		showDialog({
			title: p.title,
			text: p.text,
			positive: p.positive,
			negative: p.negative,
			onLoaded: p.onLoaded
		});
	},

	pickPoint: function() {
		var location = null;

		var getMapClick = function(e) {
			google.maps.event.addListenerOnce(map, 'click',
				(e) => {
					location = e.latLng;
					showDialog(confirmContent)
				});
		}

		var confirmContent = {
			title: 'This your point?',
			text: 'Is this where you want to set your point?',
			positive: { title: 'Yes', onClick: (e) => regionUi.add.sequence(location)},
			negative: { onClick: getMapClick}
		}

		var info = {
			title: 'Pick a location',
			text: 'Click on the map where you want your initial region point to be',
			positive: { onClick: getMapClick}
		}
		showDialog(info);
	} // pickPoint
}; // ui
