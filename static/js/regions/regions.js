/* global activeRegion: false, regionPanel: false */
/* exported regions */

var regions = {
  firstFetch: true,
  list: [],

  fetch: function() {
		//var bounds = map.getBounds();
		// TODO create ajax request for markers, then delete current markers and show new
		// https://developers.google.com/maps/articles/toomanymarkers#distancebasedclustering

		// Dont refresh markers if InfoWindow is open
    if (!markers.fetchActive) {
      return;
    }

    fetch('/fetch'+url.getQueryParams(), {credentials: 'include'})
    .then(geovoiceApi.fetchOk)
    .then(data => {
      debugLog(data);
      regions.clear();
      if (data.length == 0) { regions.createTempList(); }
      else {
        for (let i=0; i < data.length; i++) {
          if (data[i].name == 'null') {
            data[i].name = null;
          }
          regions.place(data[i]);
        }

      }
      if (regions.firstFetch) {
        regions.firstFetch = false;
        var params = url.getQueryParams();
        if (params.indexOf('?r=') == 0) {
          var r = regions.list[decodeURIComponent(params.slice(3))];
          if (r) {
            map.setCenter(geovoiceApi.parseLocation(r));
          }
        } else if (params.indexOf('?g=') == 0) {
          var bounds = data.filter(region => region.name !== null && region.name[0] !== ':').map(region => geovoiceApi.parseLocation(region))
          if (bounds.length > 0) {
            map.fitBounds(getBounds(bounds));
          } else {
            map.setZoom(4);
          }
        }
      }
      regions.updateActiveRegion(data);
    }).catch( e => {console.log(e); ui.createSnack(`Error retrieving markers" ${e}`)});
  }, // fetch


  updateActiveRegion: function(regionList) {
    if (typeof activeRegion.region === 'undefined') {
      var rP = location.href.indexOf('region');
      var name = null;
      if (rP > -1) {
        var id = location.href.slice(rP+'region/'.length);
        regionList.some( (region) => {
          if (region._id == id) {
            regionPanel.open(regions.list[region.name]);
            return true;
          }
        });
      } else {
        activeRegion.set(regions.list[null]);
      }
    } else {
      activeRegion.refresh();
    }
  }, // updateActiveRegion

  add: function() {
    regionUi.add.requestType();
  }, // add

  create: function(region) {
    region.markers = [];
    this.place(region); // ! this changes region.geofence from JSON string to array

    var geoJson = region.geofence == null ? null : JSON.stringify(region.geofence);

    var data = new FormData();
    data.append('name', region.name);
    data.append('lat', region.lat);
    data.append('lng', region.lng);
    data.append('color', region.color);
    data.append('shape', region.shape);
    data.append('icon', region.icon);
    data.append('type', region.type);
    data.append('geofence', geoJson);

    $.ajax({
      url: '/submit_region',
      type: 'POST',
      contentType: false,
      processData: false,
      data: data,
      success: function() {
        ui.createSnack('Successfully added');
      },
      error: function(e) {
        ui.createSnack('Error while adding: ' + e.toString());
      }
    });
  }, // create

  // Remove Circular link
  // gmapsMarker.info -> marker.marker -> gmapsMarker
  getTransporatableList: function(region) {
    var points = [];
    region.markers.forEach( marker => {
      points.push({
        creator: marker.creator,
        date: marker.date,
        lat: marker.lat,
        lng: marker.lng,
        media: marker.media,
        region: marker.region,
        tags: marker.tags,
        type: marker.type,
      });
    });
    return points;
  }, // getTransporatableList

  place: function(region) {  // ! this changes region.geofence from string to array
    if (region.name !== null && region.name[0] !== ':') {
      region.marker = new Marker({
        map: map,
        position: {
          'lat': parseFloat(region.lat),
          'lng': parseFloat(region.lng)
        },
        icon: {
          path: this.parseMarkerShape(region.shape),
          fillColor: region.color,
          fillOpacity: 1,
          strokeColor: '',
          strokeWeight: 0
        },
        map_icon_label: '<span class="map-icon ' + region.icon + '"></span>'
      });

			// move region marker if type is sequence
      if (region.type == 'sequence') {
        if (region.markers.length > 0) {
          region.marker.position = new google.maps.LatLng({
            lat : parseFloat(region.markers[0].lat),
            lng : parseFloat(region.markers[0].lng)
          });
        }
      }

      if (typeof region.geofence == 'string') {
        region.geofence = JSON.parse(region.geofence);
      }


      region.marker.addListener('click', function() {
        if (activeRegion.region != region) {
          activeRegion.clear();
  				regionPanel.close();
          regionPanel.open(region);
        }

      });
    }

    if (region.name && region.name[0] == ':') {
      let newRegion = this.list[null] || { name: null, markers: []};
      newRegion.markers = newRegion.markers.concat(region.markers)
      this.list[null] = newRegion;
    } else {
      this.list[region.name] = region;
    }
  }, // place

  parseMarkerShape: function(sShape) {
    var pShape;
    switch (sShape) {
    case 'square-pin':
      pShape = SQUARE_PIN;
      break;
    case 'route-pin':
      pShape = ROUTE;
      break;
    case 'shield':
      pShape = SHIELD;
      break;
    case 'square-rounded':
      pShape = SQUARE_ROUNDED;
      break;
    case 'square':
      pShape = SQUARE;
      break;
    default:
      pShape = MAP_PIN;
    }
    return pShape;

  }, // parseMarkerShape

  createTempMarker: function(url, location, region, type) {
		//Place temporary marker on map
    var marker = {
      media: url,
      creator: 'you - still pending',
      date: new Date().toString(),
      lat: location.lat(),
      lng: location.lng(),
      type: type,
      tags: []
    };

    if (region == null) { // Only pan to insert if not in a region and if point not in center
      var mapCenter = map.getCenter();
      if (mapCenter.equals(location)) {
        regions.injectMarker(region, marker);
      } else { // Only wait to inject point if panning
        panToPromise(location).then(regions.injectMarker(region, marker));
      }
    } else {
      regions.injectMarker(region, marker);
    }
  }, // createTempMarker

  injectMarker: function(region, marker) {
    if (typeof this.list[region] == 'undefined') {
      this.createTempList();
    }

    this.list[region].markers.push(marker);
    if (region !== null) {
      // if its the first marker in a sequence
      if (this.list[region].type == 'sequence' && this.list[region].markers.length == 1) {
        this.list[region].marker.setPosition(geovoiceApi.parseLocation(marker));
      }
      //activeRegion.clear();
      regionPanel.open(this.list[region]);
    } else {
      activeRegion.set(regions.list[null]);
    }

  }, // injectMarker

  createTempList: function() { // create Temporary region if DB is empty
    this.list[null] = {
      name: null,
      markers: []
    };
  }, // createTempList

  clear: function() {
    for (var region in regions.list) {
      if (regions.list[region] && regions.list[region].marker && typeof regions.list[region].marker != 'undefined') {
        regions.list[region].marker.setMap(null);
        regions.list[region].marker = null;
      }
    }
    markers.clear();
    if (regions.list[null]) {
      regions.list[null].markers = [];
    }
  } // clear
}; // regions
