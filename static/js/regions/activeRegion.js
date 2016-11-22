var activeRegion = { // methods and members for currently active region
  geofence: null,
  region: undefined,

  set: function(region) {
    if (typeof region == "undefined") {
      return; // if database is empty, do nothing
    }

    markers.clear();

    this.region = region;
    if (typeof region.geofence !== "undefined" && region.geofence !== null ) {
      this.geofence = new google.maps.Polygon({
        paths: region.geofence,
        strokeColor: region.color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: region.color,
        fillOpacity: 0.35
      });

      this.geofence.setMap(map);
      markers.closeInfoWindow();
      markers.pauseFetch();

      map.fitBounds(getBounds(region.geofence));
    }

    this.refresh();
  }, // set

  refresh: function() {
    if (searchHandler.active) {
      searchHandler.updateMarkerVisibility();
    } else {
      if (this.region.type == 'classic') {
        this.region.markers.forEach(function(element, i) {
          markers.place(element);
        });
      }
    }
  }, // refresh

  clear: function() {
      if (this.geofence != null) {
        this.geofence.setMap(null);
      }
      this.set(regions.list[null]);
      markers.resumeFetch();
    } // clear

}; // activeRegion
