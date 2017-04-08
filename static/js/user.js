/* exported user */

var user = {
  passwordsMatch: false,
  usernameAvailable: false,

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
      label.textContent = 'passwords don\'t match';
      passVer.parentElement.classList.add('is-invalid');
      //passVer.onkeypress = this.validatePassword;
    }
  }, // validatePassword

  validateUsername: function() { // check if requested username is available
    var usernameField = document.getElementById('username');
    var data = new FormData();
    data.append('query', usernameField.value);

    $.ajax({
      url: '/user/name_available',
      type: 'POST',
      data: data,
      contentType: false,
      processData: false,
      success: function(e) {
        usernameField.parentElement.classList.remove('is-invalid');
        user.usernameAvailable = true;
      }, error: function(e) {
        usernameField.parentElement.classList.add('is-invalid');
        user.usernameAvailable = false;
      }
    });
    this.tryEnableSubmit();
  },

  tryEnableSubmit: function() {
    var submit = document.getElementById('sign-up');

    if (this.passwordsMatch && this.usernameAvailable) {
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
      url: '/user',
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
      var points = [];
      for (var r = 0; r < body.length; r++) {
        for (var m = 0; m < body[r].markers.length; m++) {
          points.push(body[r].markers[m]);
        }
      }
      if (points.length > 0) {
        points.sort(markers.sort);

        var container = document.getElementById('user-markers');
        ui.clearContainer(container);
        points.forEach( (marker) => {
          var li = ui.createMarkerLi(marker);
          li.setAttribute('id', marker.media);
          var i = document.createElement('i');
          i.className = 'material-icons clickable';
          i.style.float = 'right';
          i.onclick = () => user.delete(marker.region, marker.media);
          i.textContent = 'delete';
          li.appendChild(i);
          container.append(li);
        });
      }
    });
  }, // fetchMarkers

  delete: function(region, media) {
    markers.delete(region, media)
    .then((res) => {
      var el = document.getElementById(media);
      var wrapper = document.createElement('div');
      var height = el.style.height;
      el.parentNode.replaceChild(wrapper, el);
      wrapper.appendChild(el);
      wrapper.style.overflow = 'hidden';
      wrapper.style.height = '72px';
      wrapper.style.transition = 'all 250ms ease-in-out';
      setTimeout( () => {
        wrapper.style.height = '0px';
        setTimeout( () => { wrapper.remove()}, 250);
      }, 200);
    })
    .catch( () => {
      ui.createSnack('Unable to delete marker');
    });
  }
};
