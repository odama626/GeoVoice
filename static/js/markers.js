/* global OverlappingMarkerSpiderfier: false, searchHandler: false, TagHandler: false */
/* exported markers */

var markers = {

  list: [],
  oms: undefined, // OverlappingMarkerSpiderfier
  infoWindow: undefined,
  fetchActive: true,


  place: function(info) {
    var marker = new google.maps.Marker({
      position: { lat: parseFloat(info.lat), lng: parseFloat(info.lng)},
      map:map,
      label: {
        fontFamily: 'Material Icons',
        text: (info.type == 'audio' ? 'mic' : 'videocam') //info.date.substring(0,3)
      },
      color: 'blue'
    });

    marker.info = info;
    info.marker = marker;

    if (this.oms === undefined) { // setup spiderfier if undefined
      this.oms = new OverlappingMarkerSpiderfier(map);

      this.infoWindow = new google.maps.InfoWindow( {maxWidth: 640 });

      google.maps.event.addListener(this.infoWindow, 'closeclick', markers.closeInfoWindow);

      this.oms.addListener('click', markers.omsClickListener);
    }

    markers.list.push(marker);
    this.oms.addMarker(marker);

    searchHandler.mapTags(info);
  }, // place

  placeInfoWindow(position, content) {
    if (this.infoWindow === undefined) {
      this.infoWindow = new google.maps.InfoWindow({ maxWidth: 640});
      google.maps.event.addListener(this.infoWindow, 'closeclick', markers.closeInfoWindow);
    }
    this.infoWindow.setPosition(position);
    this.infoWindow.setContent(content);
  }, // placeInfoWindow

  pauseFetch: function() {
    this.fetchActive = false;
  }, // pauseFetch

  resumeFetch: function() {
    this.fetchActive = true;
  }, // resumeFetch

  clear: function() {
    for (var i = 0; i< markers.list.length; i++) {
      markers.list[i].setMap(null);
    }
    if (this.oms !== undefined) {
      this.oms.clearMarkers();
    }
    markers.list = [];
  }, // clear

  sort: function(a, b) {
    var ad = new Date(a.date);
    var bd = new Date(b.date);
    if (ad < bd) {
      return 1;
    }
    return -1;
  }, // sort

  delete: function(region, media) {
    return new Promise( (resolve, reject) => {
      var data = new FormData();
      data.append('media', media);
      data.append('region', region);

      $.ajax({
        url : '/delete_marker',
        type: 'POST',
        data: data,
        contentType: false,
        processData: false,
        success: resolve,
        error: reject
      });
    });
  }, // delete

  closeInfoWindow: function() {
    if (this.infoWindow !== null && typeof this.infoWindow !== 'undefined') {
      this.infoWindow.setMap(null);

    }
    markers.resumeFetch();
  }, // closeInfoWindow

  omsClickListener: function(marker) {
    markers.closeInfoWindow();
    markers.pauseFetch();
    $('dv audio').remove();
    if (window.innerWidth <= 500) {
      showDialog({
        text: ui.createMarkerContent(marker).outerHTML
      })
    } else {
      markers.infoWindow.setContent(ui.createMarkerContent(marker));
      markers.infoWindow.open(map, marker);
    }
    var tagContainer = $('#tag-container');
    new TagHandler(marker.info, tagContainer);
  }, // omsClickListener

  getMediaElement: function(marker) {
    if (marker.info.type == 'audio') {
      return '<audio controls><source type="audio/mpeg" src="'+getResource(marker.info.media)+'"></audio>';
    } else if (marker.info.type == 'video') {
      return '<video controls type="video/webm" style="width:100%; max-width: 468px" src="'+getResource(marker.info.media)+'"></video>';
    }
    return '<h3>Unknown media type</h3>';
  }, // getMediaElement

  update: function(marker) {
		//var filename = new Date().toISOString() + '.mp3';
    var data = new FormData();
    data.append('media', marker.media);
    data.append('tags', JSON.stringify(marker.tags));
    data.append('region', marker.region);

    $.ajax({
      url : '/update_tags',
      type: 'POST',
      data: data,
      contentType: false,
      processData: false,
      success: function() {
        ui.createSnack('tag modification completed');
      },
      error: function() {
        ui.createSnack('Error modifying tag');
      }
    });
  }, // update
  search: function() {

  }
}; // markers
