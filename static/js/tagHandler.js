class TagHandler {

	constructor(marker, container) {
		this.marker = marker;
		this.container = container;
		this.closeTagAction = function() {
			$(this).parent().remove();
			marker.tags.splice(marker.tags.indexOf($(this).text()),1);
			//TODO update database
			markers.update(marker);
		};

		for (var i=0; i<marker.tags.length; i++) {
			this.container.append(this.createTag(marker.tags[i]));
		}
		$('.mdl-chip__action').on('click',this.closeTagAction);

		this.createTagEntry();
	}

	createTag(tagName, deletable = true) {
		var tag = `
			<span class="mdl-chip `+ (deletable ? 'mdl-chip--deletable' : '')+`">
				<span class="mdl-chip__text">`+tagName+`</span>
				`+(deletable ? `
						<button type="button" class="mdl-chip__action">
							<i class="material-icons">cancel</i>
						</button>
				`: '')+`
			</span>`;
			return tag;
	}

	createTagEntry() {
		this.container.append(`
			<div class="mdl-textfield mdl-textfield--floating-label">
				<span contenteditable="true" class="mdl-textfield__input" type="text" id="tag-entry" name="tag-entry"></span>
				<label class="mdl-textfield__label" for="tag-entry">+tag</label>
			</div>
		`);
		var container = this.container;
		var marker = this.marker;
		var createTag = this.createTag;
		var closeTagAction = this.closeTagAction;

		$('#tag-entry').keyup(function(event) {
			if (event.keyCode == 13) {
				var tag = $(this).text();
				container.prepend(createTag(tag,$(this).parent()));
				$('.mdl-chip__action').first().on('click', closeTagAction);
				$(this).text('');
				marker.tags.push(tag);
				console.log(marker);
				//TODO update database
				markers.update(marker);
			}
		});
	}
};
