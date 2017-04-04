function selfDestruct() {
  $.ajax({
    url: '/self_destruct',
    type: 'POST',
    contentType: false,
    processData: false,
    success: function() {
      ui.createSnack('Successfully added');
    },
    error: function(e) {
      ui.createSnack('Error while adding: '+e.toString());
    }
  });
} // selfDestruct
