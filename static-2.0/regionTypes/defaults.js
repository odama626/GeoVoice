/*
  {
    // required marker type fields
    type: String - must be unique
    icon: String - material-icons. used for menus
    on: {
      click({})
      create(gmaps LatLng)
    }
  }
*/

geovoice.registerRegionType({
  type: 'classic',
  icon: 'gps_fixed',
  description: 'A geofence and marker to open',
  on: {
    create: _ => {drawingUi.init()}
  }
});

geovoice.registerRegionType({
  type: 'sequence',
  icon: 'playlist_play',
  description: 'Markers are played in sequence',
  on: {
    create: _ => {ui.pickPoint()}
  }
});
