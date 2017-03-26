/* exported user */

var user = {
  passwordsMatch: false,
  handleAvailable: false,

  validatePassword: function() {
    var pass = document.getElementById('password');
    var passVer = document.getElementById('retype-password');


    if (pass.value == passVer.value) {
      this.passwordsMatch = true;
      passVer.parentElement.classList.remove('is-invalid');
      this.tryEnableSubmit();
    } else {
      this.passwordsMatch = false;
      var label = document.getElementById('retype-password-error');
      label.innerHTML = 'passwords don\'t match';
      passVer.parentElement.classList.add('is-invalid');
      passVer.onkeypress = this.validatePassword;
    }
  }, // validatePassword

  validateHandle: function() { // check if requested username is available
    // TODO IMPLEMENT
    this.handleAvailable = true;
    this.tryEnableSubmit();
  },

  tryEnableSubmit: function() {
    var submit = document.getElementById('sign-up');

    if (this.passwordsMatch && this.handleAvailable) {
      submit.disabled = false;
    } else {
      submit.disabled = true;
    }
  },

  picDropZone: function() {
    var pic = document.querySelector('.user-pic');
    var zone = ui.createDropZone((file) => {
      ui.createCropModal(URL.createObjectURL(file), (blob) => {
        zone.style['background-image'] = 'url('+URL.createObjectURL(blob)+')';
        user.uploadImage(blob);
      });
    }, {type:'image', class:'user-pic drop-zone'});
    zone.style['background-image'] = 'url('+pic.src+')';
    pic.replaceWith(zone);
  },

  uploadImage: function(blob) {
    var data = new FormData();
    data.append('file', new File([blob], new Date().toISOString()+'.png'));

    $.ajax({
      url: 'user',
      type: 'POST',
      data: data,
      contentType: false,
      processData: false,
      success: function() {
        ui.createSnack('Profile updated');
      }, error: function() {
        if (currently_logged_in) {
          ui.createSnack('Error updateing profile');
        } else {
          ui.createSnack('You need to be logged in to do that', 'Login', () => location.href='login');
        }
      }
    });
  }, // uploadImage

  fetchMarkers: function() {
    fetch('get_user_markers', { credentials: 'include'})
    .then( (response) => {
      return response.json();
    })
    .then( (body) => {
      var markers = [];
      for (var r = 0; r < body.length; r++) {
        for (var m = 0; m < body[r].markers.length; m++) {
          markers.push(body[r].markers[m]);
        }
      }
      if (markers.length > 0) {
        markers.sort(user.markerSort);

        var container = document.getElementById('user-markers');
        ui.clearContainer(container);
        markers.forEach( (marker) => {
          var li = ui.createMarkerLi(marker);
          container.append();
        });
      }
    });
  }, // fetchMarkers

  markerSort: function(a, b) {
    var da = new Date(a.date);
    var db = new Date(b.date);
    if (da < db) {
      return 1;
    }
    return -1;
  }, // sortFunc
};
