//var currentSearch = [];

var searchHandler = {
  currentSearch: [],
  tagList: [],
  tagMap: {},
  active: false,


  closeTagAction: function() {
    $(this).parent().remove();
    searchHandler.currentSearch.splice(searchHandler.currentSearch.indexOf($(this).attr('data-value')),1);
    searchHandler.updateActive();
  }, // closeTagAction

  updateActive: function() {
    this.active = searchHandler.currentSearch.length > 0;
    if (this.active) {
      this.updateMarkerVisibility();
    } else {
      activeRegion.refresh();
    }
  }, // updateActive

  updateMarkerVisibility: function() {
    markers.clear();
    this.currentSearch.forEach(function(value, i, array) {
      for (var i=0; i< searchHandler.tagMap[value].length; i++) {
        markers.place(searchHandler.tagMap[value][i]);
      }
    });
  }, // updateMarkerVisibility

  addChip: function(data) {
    if (!this.currentSearch.includes(data)) {
      this.currentSearch.push(data);
      this.updateActive();
      $('#search-bar-container').prepend(this.createChip(data));
      $('.search-chip__action').first().on('click',this.closeTagAction);
    }
  }, // addChip

  createChip: function(chipName) {
    return `
      <span class="mdl-chip mdl-chip--deletable">
        <span class="mdl-chip__text">`+chipName+`</span>
        <button type="button" data-value="`+chipName+`" class="mdl-chip__action search-chip__action">
          <i class="material-icons">cancel</i>
        </button>
      </span>
    `;
  },

  mapTags: function(marker) {
    if (marker.tags != undefined) {
      requestIdleCallback(function() {
  			for (var i=0; i<marker.tags.length; i++) {
    if (marker.tags[i] in searchHandler.tagMap) {
      if (!searchHandler.arrayHasSound(searchHandler.tagMap[marker.tags[i]],marker)) {
            //if (!searchHandler.tagMap[marker.tags[i]].includes(marker)) {
        searchHandler.tagMap[marker.tags[i]].push(marker);
      }
    } else {
      searchHandler.tagMap[marker.tags[i]] = [];
      searchHandler.tagMap[marker.tags[i]].push(marker);
    }
  				if (!searchHandler.tagList.includes(marker.tags[i])) {
  					searchHandler.tagList.push(marker.tags[i]);
  				}
  			}
  		});
    }
  }, // mapTags

  arrayHasSound: function(array, marker) {
    for (var i=0; i<array.length; i++) {
      if (array[i].media === marker.media) {
        return true;
      }
    }
    return false;
  }

};
