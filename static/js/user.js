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
    var showAvailable = (available) => {
      if (available) {
        usernameField.parentElement.classList.remove('is-invalid');
      } else {
        usernameField.parentElement.classList.add('is-invalid');
      }
      user.usernameAvailable = available;
      this.tryEnableSubmit();
    }
    geovoiceApi.checkNameAvailability('user',usernameField.value)
    .then(_=> showAvailable(true)).catch(_=>showAvailable(false));
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
          ui.createSnack('You need to be logged in to do that', 'Login', () => location.href='/user/login');
        }
      }
    });
  }, // uploadImage

  createGroup: function() {
    ui.dialog({
      title: 'Create a Group',
      text: `<div id="group-dialog-container" class="mdl-textfield mdl-js-textfield mdl-textfield--floating-label">
              <input class="mdl-textfield__input" id="group-name" type="text" name="group-name"/>
              <label class="mdl-textfield__label" for="group-name">Group Name</label>
              <span class="mdl-textfield__error" id="group-name-error">That group name is taken</span>
            </div>
            <input id="public" type="radio" name="group-visibility" value="public" checked/>
            <input id="private" type="radio" name="group-visibility" value="private"/>
            <div class="radio-icon-container">
            <label for="public"><i class="material-icons public clickable">public</i></label>
            <label for="private"><i class="material-icons private clickable"> lock</i></label>
            </div>`,
      onLoaded: _ => {
        var groupField = document.getElementById('group-name');
        var okButton = document.getElementById('dialog-ok');
        okButton.disabled = true;
        document.getElementById('dialog-ok');
        groupField.onkeyup = _ => {
          var showAvailable = (available) => {
            if (available) {
              groupField.parentElement.classList.remove('is-invalid');
            } else {
              groupField.parentElement.classList.add('is-invalid');
            }
            okButton.disabled = !available || groupField.value.length==0;
          }
          geovoiceApi.checkNameAvailability('group',groupField.value)
          .then(_=> showAvailable(true)).catch(_=>showAvailable(false));
        }
      }
    }).then(_ => {
      var access = document.querySelector('input[name="group-visibility"]:checked').value;
      var name = document.getElementById('group-name').value;
      console.log(name, access);

      var data = new FormData();
      data.append('name', name);
      data.append('visibility', access);

      $.ajax({
        url : '/submit_group',
        type: 'POST',
        data: data,
        contentType: false,
        processData: false,
        success: function() {
          ui.createSnack('Created Group');
        },
        error: function(e) {
          ui.createSnack('Error Creating Group');
        }
      });
    }).catch(_=>_);
  }, // createGroup

  fetchGroups: function() {
    var container = document.getElementById('user-groups');
    geovoiceApi.getself()
    .then(user => {
      if (user.groups.length > 0) {
        ui.clearContainer(container);
      }
      user.groups.forEach(group => {
        console.log(group);
        var li = ui.createGroupLi(group);
        li.setAttribute('id', `group-${group.name}`);
        if (group.access == 'owner') {
          var i = document.createElement('i');
          i.className = 'material-icons clickable';
          i.style.float = 'right';
          //i.onclick = () => user.delete(marker.region, marker.media);
          i.textContent = 'delete';
          li.appendChild(i);
        }
        container.append(li);
      });
    })
  }, // fetchGroups

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
