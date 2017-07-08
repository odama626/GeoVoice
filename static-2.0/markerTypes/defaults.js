/*
  {
    // required marker type fields
    type: String - must be unique
    icon: string - material-icons font string
    itemView: (marker) return html string.  viewed when clicking on marker
    panelView: (marker) return div element.  viewed in region panel
    on: {
      click({pin = marker, device = 'mobile' || 'tablet' || 'pc', target = gmaps marker})
      create(gmaps LatLng, preview() callback)
      submit(marker) where you build your final marker object to submit it
      cleanup(marker) where you clean up any variables left over from create process
    }
  }
*/

{ // encapsulation to limit scope of helper functions
  let genericMarkerAction = (e) => {
    if (e.device == 'mobile') {
      showDialog({
        text: ui.createMarkerContent(e.pin).outerHTML
      });
    } else {
      markers.infoWindow.setContent(ui.createMarkerContent(e.pin));
      markers.infoWindow.open(map, e.pin);
    }
    new TagHandler(e.target, $('#tag-container'));
  }


  geovoice.registerMarkerType({
    type: 'audio',
    icon: 'mic',
    itemView: (marker) => {
      return `<audio controls><source type="audio/webm"
              src="${url.rootIfNeeded(marker.media)}"></audio>`
    },
    panelView: (marker) => {
      var media = document.createElement('audio');
      media.controls = true;
      media.type = 'audio/wav'
      media.src = url.rootIfNeeded(marker.media);
      return media;
    },
    on: {
      click: genericMarkerAction,
      create: (e) => sound.request(e)
    }
  });

  geovoice.registerMarkerType({
    type: 'video',
    icon: 'videocam',
    itemView: (marker) => {
      return `<video controls type="video/mp4" style="width: 100%; max-width: 468px"
              src="${url.rootIfNeeded(marker.media)}"></video>`
    },
    panelView: (marker) => {
      var media = document.createElement('a');
      media.addEventListener('click', () => {ui.popoutVideo(marker.media); });
      media.className = 'mdl-navigation__link';
      media.textContent = 'View video';
      media.style.padding ='10px';
      return media;
    },
    on: {
      click: genericMarkerAction,
      create: (e) => video.request(e)
    }
  });

  geovoice.registerMarkerType({
    type: 'url',
    icon: 'link',
    itemView: (marker) => {
      return `<a href='${marker.url}' target='_blank'>${marker.url}</a>`
    },
    on: {
      click: (e, done) => {
         window.location = e.target.url;
        console.log('url clicked', e);
        done();
      },
      create: (latLng, preview) => {
        console.log(latLng);
        ui.dialog({
          title: 'Add a link',
          text: `
            <p>Create a marker that can link to somewhere on the internet</p>
            <div id='url' class='mdl-textfield mdl-js-textfield mdl-textfield--floating-label'>
              <input id='url-input' placeholder='https://pathgrab.com' class='mdl-textfield__input' name='url-input' type='text'></input>
              <!-- <label id='url-label' for='url-input' class='mdl-texfield__label'>https://pathgrab.com</label> -->
            </div>
          `
        }).then( e => {
          let url = document.getElementById('url-input').value;
          if (url.indexOf('://') === -1) {
            url = 'http://'+url;
          }
          console.log(url);
          let marker = { url: url};
          preview(marker);
        }).catch( e => console.log(e));
      },
      submit: (marker, send) => {
        send(marker);
      },
      cleanup: (marker) => {
        console.log('cleanup',marker);
      }
    }
  });

}
