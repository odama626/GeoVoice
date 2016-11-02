var regionPanel = {

  open: function(region, animate = true) {
    activeRegion.set(region);
    this.createHtml(region, animate);
  }, // open

  close: function() {
    activeRegion.clear();
    $('.right-panel').removeClass('slide-in');
    console.log('closing panel');
    $('body, html').animate({
      scrollTop: 0
    }, 500);
    setTimeout(function() {
      $('#region-panel-container').html('');
    }, 1000);
  }, // close

  createHtml: function(region, animate) {
    var itemsHtml = '';

    for (i = 0; i < region.markers.length; i++) {
      itemsHtml += regionPanel.generateItem(region.markers[i]);
    }

    if (itemsHtml == '') {
      itemsHtml = `
        <div id='no-recordings'>
          <p>There aren't any recordings yet, why don't you add one?</p>
        </div>
      `
    }

    itemsHtml += `
      <div style="padding-left:15px">
        <button
          class='mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect right-panel__button'
          onClick='regionPanel.close()'>

          Close
        </button>
      </div>`;

    var containerClasses = 'right-panel';
    if (!animate) {
      containerClasses += ' slide-in';
    }

    var sheetHtml = `
      <div class='` + containerClasses + `'>
          <span class='right-panel__title'>` + region.regionName + `</span>
          <ul class='mdl-list'>
            ` + itemsHtml + `
          </ul>

      </div>`;

    $('.region-panel-container').html(sheetHtml);

    if (animate) {
      setTimeout(function() {
        $('.right-panel').addClass('slide-in');
      }, 100);
    }
  }, // createHtml

  generateItem: function(item) {
    return `
      <li class="mdl-list__item mdl-list__item--two-line">
        <span class="mdl-list__item-primary-content">
          <span>` + item.date + `</span>
          <span class="mdl-list__item-sub-title">
            <audio controls>
              <source type='audio/mpeg' src='` + item.sound + `'>
            </audio>
          </span>
        </span>
      </li>`;
  } // generateItem
} // regionPanel.
