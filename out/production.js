function selfDestruct() {
  fetch('/self_destruct', { method: 'POST', credentials: 'include' })
  .then( () => ui.createSnack('Boom'))
  .catch( e => ui.createSnack('Did not combust '+e.toString()));
} // selfDestruct

var geovoiceApi = {

  getuser: (user) => {
    return new Promise( (resolve, reject) => {
      fetch('/api/user/'+user, { credentials: 'include' })
      .then( r => { return r.json()})
      .then(r => {
        if (typeof(r.error) != 'undefined') { reject(r); }
          else {
            if (typeof(r.img) != 'undefined') { r.img = '/img/'+r.img; }
            resolve(r);
          }
      }).catch(reject);
    });
  }, // getuser( username) returns usr { name, username, image}

  getself: () => {
    return new Promise( (resolve, reject) => {
      fetch('/api/self', { credentials: 'include' })
      .then( r => {return r.json()})
      .then(r => {
        if (typeof(r.error) != 'undefined') { reject(r); }
          else {
            if (typeof(r.img) != 'undefined') { r.img = '/img/'+r.img; }
            resolve(r);
          }
      }).catch(reject);
    });
  },

  parseLocation: (m) => {
    return { lat: parseFloat(m.lat), lng: parseFloat(m.lng)};
  }
}

function getResource(res) {
  if (!res.startsWith('blob:')) {
    res = '/'+res;
  }
  return res;
}

/* global getLoc: false */
/* exported MarkerSequence */

class MarkerSequence {
  constructor(region) {
    this.region = region;
    markers.pauseFetch();
    this.currentMarker = 0;
    this.initializeElement();
  }

  initializeElement() {
    if (this.region.markers[0].type == 'audio') {
      this.mediaElement = document.createElement('audio');
      this.mediaElement.type='audio/mpeg';
    } else if (this.region.markers[0].type == 'video') {
      this.mediaElement = document.createElement('video');
      this.mediaElement.type='video/webm';
      this.mediaElement.style.width = '45vw';
    }
    this.mediaElement.controls = true;
    this.mediaElement.src = getResource(this.region.markers[0].media);

    var subTitle = document.createElement('div');
    subTitle.appendChild(this.mediaElement);

    this.text = document.createElement('span');
    this.text.textContent = this.region.markers.length+' marker';

    var primaryContent = document.createElement('span');
    //primaryContent.className = 'mdl-list__item-primary-content';
    primaryContent.appendChild(this.text);
    primaryContent.appendChild(subTitle);

    this.element = document.createElement('div');
  //  this.element.className = 'mdl-list__item mdl-list__item--two-line';

    this.mediaElement.onended = () => this.nextMarker();
    this.mediaElement.onplay = () => this.started();
    this.element.append(primaryContent);

  //  map.panTo(geovoiceApi.parseLocation(this.region.markers[0]));
    map.panTo(this.region.marker.getPosition());
  }

  started() {
    this.text.textContent = 'Playing '+(this.currentMarker+1)+' of '+this.region.markers.length;


  }

  getNewElement() {
    if (this.region.markers[this.currentMarker-1].type
        == this.region.markers[this.currentMarker].type) {
      return; // current and next markers are same type, nothing to do
    }
    var mediaElement;
    if (this.region.markers[this.currentMarker].type == 'sound') {
      mediaElement = document.createElement('audio');
      mediaElement.type='audio/mpeg';
    } else if (this.region.markers[this.currentMarker].type == 'video') {
      mediaElement = document.createElement('video');
      mediaElement.style.width='45vw';
      mediaElement.type='video/webm';
    }

    mediaElement.controls = true;
    mediaElement.onended = () => this.nextMarker();
    mediaElement.onplay = () => this.started();
    this.mediaElement.replaceWith(mediaElement);
    this.mediaElement = mediaElement;
  }

  nextMarker() {
    // return early if there aren't any markers left
    if (this.currentMarker+1 >= this.region.markers.length) {
      /*this.region.marker.position = new google.maps.LatLng({ // reset marker location
        lat : parseFloat(this.region.markers[0].lat),
        lng : parseFloat(this.region.markers[0].lng)
      });*/
      markers.resumeFetch();
      return;
    }

    this.currentMarker = this.currentMarker+1;
    this.getNewElement();

    if (this.region)

      this.temporaryMarker = this.region.markers[this.currentMarker];
    markers.place(this.temporaryMarker);

    panToPromise(geovoiceApi.parseLocation(this.region.markers[this.currentMarker])).then(() =>{
      this.mediaElement.pause();
      this.mediaElement.currentTime = 0.00;
      this.mediaElement.src = getResource(this.region.markers[this.currentMarker].media);
      this.mediaElement.play();
    });
  }

  getElement() {
    return this.element;
  }

}

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

//var currentSearch = [];

var searchHandler = {
  currentSearch: [],
  tagList: [],
  tagMap: {},
  active: false,


  closeTagAction: function() {
    $(this).parent().remove();
    searchHandler.currentSearch.splice(searchHandler.currentSearch.indexOf($(this).attr('data-value')),1);
    searchHandler.updateActive();
  }, // closeTagAction

  updateActive: function() {
    this.active = searchHandler.currentSearch.length > 0;
    if (this.active) {
      this.updateMarkerVisibility();
    } else {
      activeRegion.refresh();
    }
  }, // updateActive

  updateMarkerVisibility: function() {
    markers.clear();
    this.currentSearch.forEach(function(value, i, array) {
      for (var i=0; i< searchHandler.tagMap[value].length; i++) {
        markers.place(searchHandler.tagMap[value][i]);
      }
    });
  }, // updateMarkerVisibility

  addChip: function(data) {
    if (!this.currentSearch.includes(data)) {
      this.currentSearch.push(data);
      this.updateActive();
      $('#search-bar-container').prepend(this.createChip(data));
      $('.search-chip__action').first().on('click',this.closeTagAction);
    }
  }, // addChip

  createChip: function(chipName) {
    return `
      <span class="mdl-chip mdl-chip--deletable">
        <span class="mdl-chip__text">`+chipName+`</span>
        <button type="button" data-value="`+chipName+`" class="mdl-chip__action search-chip__action">
          <i class="material-icons">cancel</i>
        </button>
      </span>
    `;
  },

  mapTags: function(marker) {
    if (marker.tags != undefined) {
      requestIdleCallback(function() {
        for (var i=0; i<marker.tags.length; i++) {
          if (marker.tags[i] in searchHandler.tagMap) {
            if (!searchHandler.arrayHasSound(searchHandler.tagMap[marker.tags[i]],marker)) {
                  //if (!searchHandler.tagMap[marker.tags[i]].includes(marker)) {
              searchHandler.tagMap[marker.tags[i]].push(marker);
            }
          } else {
            searchHandler.tagMap[marker.tags[i]] = [];
            searchHandler.tagMap[marker.tags[i]].push(marker);
          }
          if (!searchHandler.tagList.includes(marker.tags[i])) {
            searchHandler.tagList.push(marker.tags[i]);
          }
        }
      });
    }
  }, // mapTags

  arrayHasSound: function(array, marker) {
    for (var i=0; i<array.length; i++) {
      if (array[i].media === marker.media) {
        return true;
      }
    }
    return false;
  }

};

/* global soundUi: false, RecordRTC: false */
/* exported sound */

var sound = {

  recorder: null,
  stream: null,
  blob: null,
  location: null,

  request: function(location = null) {
    ui.loading.show();
    this.location = location;
    if (location == null) {
      getLocation().then( loc => sound.location = loc);
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
    .then( stream => {
      this.recorder = RecordRTC(stream, { type: 'audio' });
      this.stream = stream;
      ui.loading.hide();
      soundUi.request();
    }).catch(e => ui.createSnack('Error initializing mic: '+e.toString()));
  }, // request

  start: function() {
    ui.loading.show();
    this.recorder.startRecording();
    soundUi.timer();
    ui.loading.hide();
  }, // start

  stop: function() {
    ui.loading.show();
    this.recorder.stopRecording( audioUrl => {
      sound.blob = sound.recorder.getBlob();
      soundUi.preview(location, audioUrl);
      ui.loading.hide();
    });
  }, // stop

  upload: function(region) {
    regions.createTempMarker(URL.createObjectURL(this.blob), this.location, region, 'audio');

    var data = new FormData();
    data.append('file',  new File([this.blob], new Date().toISOString()+'.wav'));
    data.append('lat', this.location.lat());
    data.append('lng', this.location.lng());
    data.append('date', new Date().toString());
    data.append('type','audio');
    data.append('region', region);

    $.ajax({
      url : '/submit',
      type: 'POST',
      data: data,
      contentType: false,
      processData: false,
      success: function() {
        ui.createSnack('Upload completed');
      },
      error: function(e) {
        if (currently_logged_in) {
          ui.createSnack('Error sending sound: '+e.toString());
        }	else {
          ui.createSnack('You need to be logged in to do that', 'Login', () => location.href='login');
        }
      }
    });
  }, // upload

  cleanup: function() {
    if (this.stream != null) {
      var tracks = this.stream.getTracks();
      tracks.forEach( (track) => track.stop() );

      this.recorder.clearRecordedData();
    }
    this.recorder = null;
    this.blob = null;
    this.stream = null;
  }
}; // soundHandler

class TagHandler {

  constructor(marker, container) {
    this.marker = marker;
    this.container = container;
    this.closeTagAction = function() {
      $(this).parent().remove();
      marker.tags.splice(marker.tags.indexOf($(this).text()),1);
			// update database
      markers.update(marker);
    };

    for (var i=0; i<marker.tags.length; i++) {
      this.container.append(this.createTag(marker.tags[i]));
    }
    $('.marker-tag__action').on('click',this.closeTagAction);

    this.createTagEntry();
  }

  createTag(tagName, deletable = true) {
    var tag = `
			<span class="mdl-chip `+ (deletable ? 'mdl-chip--deletable' : '')+`">
				<span class="mdl-chip__text">`+tagName+`</span>
				`+(deletable ? `
						<button type="button" class="mdl-chip__action marker-tag__action">
							<i class="material-icons">cancel</i>
						</button>
				`: '')+`
			</span>`;
    return tag;
  }

  createTagEntry() {
    this.container.append(`
			<div class="mdl-textfield mdl-textfield--floating-label">
				<input class="mdl-textfield__input" type="text" id="tag-entry" name="tag-entry"></span>
				<label class="mdl-textfield__label" for="tag-entry">+tag</label>
			</div>
		`);
    var container = this.container;
    var marker = this.marker;
    var createTag = this.createTag;
    var closeTagAction = this.closeTagAction;

    $('#tag-entry').keyup(function(event) {
      debugLog(event);
      if (event.keyCode == 13) {
        var tag = $(this).val();
        container.prepend(createTag(tag,$(this).parent()));
        $('.marker-tag__action').first().on('click', closeTagAction);
        $(this).val('');
        marker.tags.push(tag);
        debugLog(marker);
				// update database
        markers.update(marker);
      }
    });
  }
}

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
      url: '/username_available',
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

window.onload = () => user.fetchMarkers();

/* global videoUi: false, RecordRTC: false */
/* exported video */

var video = {
  videoStream: null,
  videoRecorder: null,
  stream: null,
  blob: null,
  location: null,

  request: function(location = null) {
    ui.loading.show();
    this.location = location;
    if (this.location == null) {
      getLocation().then( loc => video.location = loc);
    }

    var options = {
      mimeType: 'video/webm'
    };

    navigator.mediaDevices.getUserMedia({ audio: true, video: true})
    .then(stream => {
      this.videoRecorder = RecordRTC(stream, options);
      this.stream = stream;
      this.videoStream = URL.createObjectURL(stream);
      ui.loading.hide();
      videoUi.request(this.videoStream);
    }).catch(e => ui.createSnack('Error initializing camera: '+e.toString()));
  }, // request

  start: function() {
    ui.loading.show();
    this.videoRecorder.startRecording();
    videoUi.timer(video.videoStream);
    ui.loading.hide();
  }, // start

  stop: function() {
    ui.loading.show();
    this.videoRecorder.stopRecording( (vidUrl) => {
      video.blob = video.videoRecorder.getBlob();
      videoUi.preview(this.location, vidUrl);
      ui.loading.hide();
    });
  }, // stop

  upload: function(region) {
    regions.createTempMarker(URL.createObjectURL(this.blob), this.location, region, 'video');

    var data = new FormData();
    data.append('file', new File([this.blob], new Date().toISOString()+'.webm'));
    data.append('lat', this.location.lat());
    data.append('lng', this.location.lng());
    data.append('date', new Date().toString());
    data.append('type', 'video');
    data.append('region', region);

    $.ajax({
      url: '/submit',
      type: 'POST',
      data: data,
      contentType: false,
      processData: false,
      success: function() {
        ui.createSnack('upload completed');
      },
      error: function(e) {
        if (currently_logged_in) {
          ui.createSnack('Error sending video: '+e.toString());
        } else {
          ui.createSnack('You need to be logged in to do that', 'Login', () => location.href='login');
        }
      }
    });
  }, // upload

  cleanup: function() {
    if (this.stream != null) {
      var tracks = this.stream.getTracks();
      tracks.forEach( (track) => track.stop() );

      this.videoRecorder.clearRecordedData();
    }

    this.blob = null;
    this.stream = null;
    this.videoStream = null;
    this.videoRecorder = null;
  }
}; // videoUi

/*! Sortable 1.4.2 - MIT | git://github.com/rubaxa/Sortable.git */
!function(a){'use strict';'function'==typeof define&&define.amd?define(a):'undefined'!=typeof module&&'undefined'!=typeof module.exports?module.exports=a():'undefined'!=typeof Package?Sortable=a():window.Sortable=a();}(function(){'use strict';function a(a,b){if(!a||!a.nodeType||1!==a.nodeType)throw'Sortable: `el` must be HTMLElement, and not '+{}.toString.call(a);this.el=a,this.options=b=t({},b),a[Q]=this;var c={group:Math.random(),sort:!0,disabled:!1,store:null,handle:null,scroll:!0,scrollSensitivity:30,scrollSpeed:10,draggable:/[uo]l/i.test(a.nodeName)?'li':'>*',ghostClass:'sortable-ghost',chosenClass:'sortable-chosen',dragClass:'sortable-drag',ignore:'a, img',filter:null,animation:0,setData:function(a,b){a.setData('Text',b.textContent);},dropBubble:!1,dragoverBubble:!1,dataIdAttr:'data-id',delay:0,forceFallback:!1,fallbackClass:'sortable-fallback',fallbackOnBody:!1,fallbackTolerance:0,fallbackOffset:{x:0,y:0}};for(var d in c)!(d in b)&&(b[d]=c[d]);ba(b);for(var e in this)'_'===e.charAt(0)&&'function'==typeof this[e]&&(this[e]=this[e].bind(this));this.nativeDraggable=!b.forceFallback&&W,f(a,'mousedown',this._onTapStart),f(a,'touchstart',this._onTapStart),this.nativeDraggable&&(f(a,'dragover',this),f(a,'dragenter',this)),_.push(this._onDragOver),b.store&&this.sort(b.store.get(this));}function b(a){y&&y.state!==a&&(i(y,'display',a?'none':''),!a&&y.state&&z.insertBefore(y,v),y.state=a);}function c(a,b,c){if(a){c=c||S;do if('>*'===b&&a.parentNode===c||r(a,b))return a;while(a=d(a));}return null;}function d(a){var b=a.host;return b&&b.nodeType?b:a.parentNode;}function e(a){a.dataTransfer&&(a.dataTransfer.dropEffect='move'),a.preventDefault();}function f(a,b,c){a.addEventListener(b,c,!1);}function g(a,b,c){a.removeEventListener(b,c,!1);}function h(a,b,c){if(a)if(a.classList)a.classList[c?'add':'remove'](b);else{var d=(' '+a.className+' ').replace(P,' ').replace(' '+b+' ',' ');a.className=(d+(c?' '+b:'')).replace(P,' ');}}function i(a,b,c){var d=a&&a.style;if(d){if(void 0===c)return S.defaultView&&S.defaultView.getComputedStyle?c=S.defaultView.getComputedStyle(a,''):a.currentStyle&&(c=a.currentStyle),void 0===b?c:c[b];b in d||(b='-webkit-'+b),d[b]=c+('string'==typeof c?'':'px');}}function j(a,b,c){if(a){var d=a.getElementsByTagName(b),e=0,f=d.length;if(c)for(;e<f;e++)c(d[e],e);return d;}return[];}function k(a,b,c,d,e,f,g){a=a||b[Q];var h=S.createEvent('Event'),i=a.options,j='on'+c.charAt(0).toUpperCase()+c.substr(1);h.initEvent(c,!0,!0),h.to=b,h.from=e||b,h.item=d||b,h.clone=y,h.oldIndex=f,h.newIndex=g,b.dispatchEvent(h),i[j]&&i[j].call(a,h);}function l(a,b,c,d,e,f,g){var h,i,j=a[Q],k=j.options.onMove;return h=S.createEvent('Event'),h.initEvent('move',!0,!0),h.to=b,h.from=a,h.dragged=c,h.draggedRect=d,h.related=e||b,h.relatedRect=f||b.getBoundingClientRect(),a.dispatchEvent(h),k&&(i=k.call(j,h,g)),i;}function m(a){a.draggable=!1;}function n(){Y=!1;}function o(a,b){var c=a.lastElementChild,d=c.getBoundingClientRect();return(b.clientY-(d.top+d.height)>5||b.clientX-(d.right+d.width)>5)&&c;}function p(a){for(var b=a.tagName+a.className+a.src+a.href+a.textContent,c=b.length,d=0;c--;)d+=b.charCodeAt(c);return d.toString(36);}function q(a,b){var c=0;if(!a||!a.parentNode)return-1;for(;a&&(a=a.previousElementSibling);)'TEMPLATE'===a.nodeName.toUpperCase()||'>*'!==b&&!r(a,b)||c++;return c;}function r(a,b){if(a){b=b.split('.');var c=b.shift().toUpperCase(),d=new RegExp('\\s('+b.join('|')+')(?=\\s)','g');return!(''!==c&&a.nodeName.toUpperCase()!=c||b.length&&((' '+a.className+' ').match(d)||[]).length!=b.length);}return!1;}function s(a,b){var c,d;return function(){void 0===c&&(c=arguments,d=this,setTimeout(function(){1===c.length?a.call(d,c[0]):a.apply(d,c),c=void 0;},b));};}function t(a,b){if(a&&b)for(var c in b)b.hasOwnProperty(c)&&(a[c]=b[c]);return a;}function u(a){return U?U(a).clone(!0)[0]:V&&V.dom?V.dom(a).cloneNode(!0):a.cloneNode(!0);}if('undefined'==typeof window||!window.document)return function(){throw new Error('Sortable.js requires a window with a document');};var v,w,x,y,z,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O={},P=/\s+/g,Q='Sortable'+(new Date).getTime(),R=window,S=R.document,T=R.parseInt,U=R.jQuery||R.Zepto,V=R.Polymer,W=!!('draggable'in S.createElement('div')),X=function(a){return!navigator.userAgent.match(/Trident.*rv[ :]?11\./)&&(a=S.createElement('x'),a.style.cssText='pointer-events:auto','auto'===a.style.pointerEvents);}(),Y=!1,Z=Math.abs,$=Math.min,_=([].slice,[]),aa=s(function(a,b,c){if(c&&b.scroll){var d,e,f,g,h,i,j=b.scrollSensitivity,k=b.scrollSpeed,l=a.clientX,m=a.clientY,n=window.innerWidth,o=window.innerHeight;if(C!==c&&(B=b.scroll,C=c,D=b.scrollFn,B===!0)){B=c;do if(B.offsetWidth<B.scrollWidth||B.offsetHeight<B.scrollHeight)break;while(B=B.parentNode);}B&&(d=B,e=B.getBoundingClientRect(),f=(Z(e.right-l)<=j)-(Z(e.left-l)<=j),g=(Z(e.bottom-m)<=j)-(Z(e.top-m)<=j)),f||g||(f=(n-l<=j)-(l<=j),g=(o-m<=j)-(m<=j),(f||g)&&(d=R)),O.vx===f&&O.vy===g&&O.el===d||(O.el=d,O.vx=f,O.vy=g,clearInterval(O.pid),d&&(O.pid=setInterval(function(){return i=g?g*k:0,h=f?f*k:0,'function'==typeof D?D.call(_this,h,i,a):void(d===R?R.scrollTo(R.pageXOffset+h,R.pageYOffset+i):(d.scrollTop+=i,d.scrollLeft+=h));},24)));}},30),ba=function(a){function b(a,b){return void 0!==a&&a!==!0||(a=c.name),'function'==typeof a?a:function(c,d){var e=d.options.group.name;return b?a:a&&(a.join?a.indexOf(e)>-1:e==a);};}var c={},d=a.group;d&&'object'==typeof d||(d={name:d}),c.name=d.name,c.checkPull=b(d.pull,!0),c.checkPut=b(d.put),a.group=c;};return a.prototype={constructor:a,_onTapStart:function(a){var b,d=this,e=this.el,f=this.options,g=a.type,h=a.touches&&a.touches[0],i=(h||a).target,j=a.target.shadowRoot&&a.path[0]||i,l=f.filter;if(!v&&!('mousedown'===g&&0!==a.button||f.disabled)&&(!f.handle||c(j,f.handle,e))&&(i=c(i,f.draggable,e))){if(b=q(i,f.draggable),'function'==typeof l){if(l.call(this,a,i,this))return k(d,j,'filter',i,e,b),void a.preventDefault();}else if(l&&(l=l.split(',').some(function(a){if(a=c(j,a.trim(),e))return k(d,a,'filter',i,e,b),!0;})))return void a.preventDefault();this._prepareDragStart(a,h,i,b);}},_prepareDragStart:function(a,b,c,d){var e,g=this,i=g.el,l=g.options,n=i.ownerDocument;c&&!v&&c.parentNode===i&&(L=a,z=i,v=c,w=v.parentNode,A=v.nextSibling,J=l.group,H=d,this._lastX=(b||a).clientX,this._lastY=(b||a).clientY,v.style['will-change']='transform',e=function(){g._disableDelayedDrag(),v.draggable=g.nativeDraggable,h(v,l.chosenClass,!0),g._triggerDragStart(b),k(g,z,'choose',v,z,H);},l.ignore.split(',').forEach(function(a){j(v,a.trim(),m);}),f(n,'mouseup',g._onDrop),f(n,'touchend',g._onDrop),f(n,'touchcancel',g._onDrop),l.delay?(f(n,'mouseup',g._disableDelayedDrag),f(n,'touchend',g._disableDelayedDrag),f(n,'touchcancel',g._disableDelayedDrag),f(n,'mousemove',g._disableDelayedDrag),f(n,'touchmove',g._disableDelayedDrag),g._dragStartTimer=setTimeout(e,l.delay)):e());},_disableDelayedDrag:function(){var a=this.el.ownerDocument;clearTimeout(this._dragStartTimer),g(a,'mouseup',this._disableDelayedDrag),g(a,'touchend',this._disableDelayedDrag),g(a,'touchcancel',this._disableDelayedDrag),g(a,'mousemove',this._disableDelayedDrag),g(a,'touchmove',this._disableDelayedDrag);},_triggerDragStart:function(a){a?(L={target:v,clientX:a.clientX,clientY:a.clientY},this._onDragStart(L,'touch')):this.nativeDraggable?(f(v,'dragend',this),f(z,'dragstart',this._onDragStart)):this._onDragStart(L,!0);try{S.selection?setTimeout(function(){S.selection.empty();}):window.getSelection().removeAllRanges();}catch(a){}},_dragStarted:function(){if(z&&v){var b=this.options;h(v,b.ghostClass,!0),h(v,b.dragClass,!1),a.active=this,k(this,z,'start',v,z,H);}},_emulateDragOver:function(){if(M){if(this._lastX===M.clientX&&this._lastY===M.clientY)return;this._lastX=M.clientX,this._lastY=M.clientY,X||i(x,'display','none');var a=S.elementFromPoint(M.clientX,M.clientY),b=a,c=_.length;if(b)do{if(b[Q]){for(;c--;)_[c]({clientX:M.clientX,clientY:M.clientY,target:a,rootEl:b});break;}a=b;}while(b=b.parentNode);X||i(x,'display','');}},_onTouchMove:function(b){if(L){var c=this.options,d=c.fallbackTolerance,e=c.fallbackOffset,f=b.touches?b.touches[0]:b,g=f.clientX-L.clientX+e.x,h=f.clientY-L.clientY+e.y,j=b.touches?'translate3d('+g+'px,'+h+'px,0)':'translate('+g+'px,'+h+'px)';if(!a.active){if(d&&$(Z(f.clientX-this._lastX),Z(f.clientY-this._lastY))<d)return;this._dragStarted();}this._appendGhost(),N=!0,M=f,i(x,'webkitTransform',j),i(x,'mozTransform',j),i(x,'msTransform',j),i(x,'transform',j),b.preventDefault();}},_appendGhost:function(){if(!x){var a,b=v.getBoundingClientRect(),c=i(v),d=this.options;x=v.cloneNode(!0),h(x,d.ghostClass,!1),h(x,d.fallbackClass,!0),h(x,d.dragClass,!0),i(x,'top',b.top-T(c.marginTop,10)),i(x,'left',b.left-T(c.marginLeft,10)),i(x,'width',b.width),i(x,'height',b.height),i(x,'opacity','0.8'),i(x,'position','fixed'),i(x,'zIndex','100000'),i(x,'pointerEvents','none'),d.fallbackOnBody&&S.body.appendChild(x)||z.appendChild(x),a=x.getBoundingClientRect(),i(x,'width',2*b.width-a.width),i(x,'height',2*b.height-a.height);}},_onDragStart:function(a,b){var c=a.dataTransfer,d=this.options;this._offUpEvents(),'clone'==J.checkPull(this,this,v,a)&&(y=u(v),i(y,'display','none'),z.insertBefore(y,v),k(this,z,'clone',v)),h(v,d.dragClass,!0),b?('touch'===b?(f(S,'touchmove',this._onTouchMove),f(S,'touchend',this._onDrop),f(S,'touchcancel',this._onDrop)):(f(S,'mousemove',this._onTouchMove),f(S,'mouseup',this._onDrop)),this._loopId=setInterval(this._emulateDragOver,50)):(c&&(c.effectAllowed='move',d.setData&&d.setData.call(this,c,v)),f(S,'drop',this),setTimeout(this._dragStarted,0));},_onDragOver:function(d){var e,f,g,h,j=this.el,k=this.options,m=k.group,p=a.active,q=J===m,r=k.sort;if(void 0!==d.preventDefault&&(d.preventDefault(),!k.dragoverBubble&&d.stopPropagation()),N=!0,J&&!k.disabled&&(q?r||(h=!z.contains(v)):K===this||J.checkPull(this,p,v,d)&&m.checkPut(this,p,v,d))&&(void 0===d.rootEl||d.rootEl===this.el)){if(aa(d,k,this.el),Y)return;if(e=c(d.target,k.draggable,j),f=v.getBoundingClientRect(),K=this,h)return b(!0),w=z,void(y||A?z.insertBefore(v,y||A):r||z.appendChild(v));if(0===j.children.length||j.children[0]===x||j===d.target&&(e=o(j,d))){if(e){if(e.animated)return;g=e.getBoundingClientRect();}b(q),l(z,j,v,f,e,g,d)!==!1&&(v.contains(j)||(j.appendChild(v),w=j),this._animate(f,v),e&&this._animate(g,e));}else if(e&&!e.animated&&e!==v&&void 0!==e.parentNode[Q]){E!==e&&(E=e,F=i(e),G=i(e.parentNode)),g=e.getBoundingClientRect();var s,t=g.right-g.left,u=g.bottom-g.top,B=/left|right|inline/.test(F.cssFloat+F.display)||'flex'==G.display&&0===G['flex-direction'].indexOf('row'),C=e.offsetWidth>v.offsetWidth,D=e.offsetHeight>v.offsetHeight,H=(B?(d.clientX-g.left)/t:(d.clientY-g.top)/u)>.5,I=e.nextElementSibling,L=l(z,j,v,f,e,g,d);if(L!==!1){if(Y=!0,setTimeout(n,30),b(q),1===L||L===-1)s=1===L;else if(B){var M=v.offsetTop,O=e.offsetTop;s=M===O?e.previousElementSibling===v&&!C||H&&C:e.previousElementSibling===v||v.previousElementSibling===e?(d.clientY-g.top)/u>.5:O>M;}else s=I!==v&&!D||H&&D;v.contains(j)||(s&&!I?j.appendChild(v):e.parentNode.insertBefore(v,s?I:e)),w=v.parentNode,this._animate(f,v),this._animate(g,e);}}}},_animate:function(a,b){var c=this.options.animation;if(c){var d=b.getBoundingClientRect();i(b,'transition','none'),i(b,'transform','translate3d('+(a.left-d.left)+'px,'+(a.top-d.top)+'px,0)'),b.offsetWidth,i(b,'transition','all '+c+'ms'),i(b,'transform','translate3d(0,0,0)'),clearTimeout(b.animated),b.animated=setTimeout(function(){i(b,'transition',''),i(b,'transform',''),b.animated=!1;},c);}},_offUpEvents:function(){var a=this.el.ownerDocument;g(S,'touchmove',this._onTouchMove),g(a,'mouseup',this._onDrop),g(a,'touchend',this._onDrop),g(a,'touchcancel',this._onDrop);},_onDrop:function(b){var c=this.el,d=this.options;clearInterval(this._loopId),clearInterval(O.pid),clearTimeout(this._dragStartTimer),g(S,'mousemove',this._onTouchMove),this.nativeDraggable&&(g(S,'drop',this),g(c,'dragstart',this._onDragStart)),this._offUpEvents(),b&&(N&&(b.preventDefault(),!d.dropBubble&&b.stopPropagation()),x&&x.parentNode.removeChild(x),v&&(this.nativeDraggable&&g(v,'dragend',this),m(v),v.style['will-change']='',h(v,this.options.ghostClass,!1),h(v,this.options.chosenClass,!1),z!==w?(I=q(v,d.draggable),I>=0&&(k(null,w,'add',v,z,H,I),k(this,z,'remove',v,z,H,I),k(null,w,'sort',v,z,H,I),k(this,z,'sort',v,z,H,I))):(y&&y.parentNode.removeChild(y),v.nextSibling!==A&&(I=q(v,d.draggable),I>=0&&(k(this,z,'update',v,z,H,I),k(this,z,'sort',v,z,H,I)))),a.active&&(null!=I&&I!==-1||(I=H),k(this,z,'end',v,z,H,I),this.save()))),this._nulling();},_nulling:function(){z=v=w=x=A=y=B=C=L=M=N=I=E=F=K=J=a.active=null;},handleEvent:function(a){var b=a.type;'dragover'===b||'dragenter'===b?v&&(this._onDragOver(a),e(a)):'drop'!==b&&'dragend'!==b||this._onDrop(a);},toArray:function(){for(var a,b=[],d=this.el.children,e=0,f=d.length,g=this.options;e<f;e++)a=d[e],c(a,g.draggable,this.el)&&b.push(a.getAttribute(g.dataIdAttr)||p(a));return b;},sort:function(a){var b={},d=this.el;this.toArray().forEach(function(a,e){var f=d.children[e];c(f,this.options.draggable,d)&&(b[a]=f);},this),a.forEach(function(a){b[a]&&(d.removeChild(b[a]),d.appendChild(b[a]));});},save:function(){var a=this.options.store;a&&a.set(this);},closest:function(a,b){return c(a,b||this.options.draggable,this.el);},option:function(a,b){var c=this.options;return void 0===b?c[a]:(c[a]=b,void('group'===a&&ba(c)));},destroy:function(){var a=this.el;a[Q]=null,g(a,'mousedown',this._onTapStart),g(a,'touchstart',this._onTapStart),this.nativeDraggable&&(g(a,'dragover',this),g(a,'dragenter',this)),Array.prototype.forEach.call(a.querySelectorAll('[draggable]'),function(a){a.removeAttribute('draggable');}),_.splice(_.indexOf(this._onDragOver),1),this._onDrop(),this.el=a=null;}},a.utils={on:f,off:g,css:i,find:j,is:function(a,b){return!!c(a,b,a);},extend:t,throttle:s,closest:c,toggleClass:h,clone:u,index:q},a.create=function(b,c){return new a(b,c);},a.version='1.4.2',a;});
(function(f){if(typeof exports==='object'&&typeof module!=='undefined'){module.exports=f();}else if(typeof define==='function'&&define.amd){define([],f);}else{var g;if(typeof window!=='undefined'){g=window;}else if(typeof global!=='undefined'){g=global;}else if(typeof self!=='undefined'){g=self;}else{g=this;}g.adapter = f();}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=='function'&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error('Cannot find module \''+o+'\'');throw f.code='MODULE_NOT_FOUND',f;}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e);},l,l.exports,e,t,n,r);}return n[o].exports;}var i=typeof require=='function'&&require;for(var o=0;o<r.length;o++)s(r[o]);return s;})({1:[function(require,module,exports){
 /* eslint-env node */
  'use strict';

// SDP helpers.
  var SDPUtils = {};

// Generate an alphanumeric identifier for cname or mids.
// TODO: use UUIDs instead? https://gist.github.com/jed/982883
  SDPUtils.generateIdentifier = function() {
    return Math.random().toString(36).substr(2, 10);
  };

// The RTCP CNAME used by all peerconnections from the same JS.
  SDPUtils.localCName = SDPUtils.generateIdentifier();

// Splits SDP into lines, dealing with both CRLF and LF.
  SDPUtils.splitLines = function(blob) {
    return blob.trim().split('\n').map(function(line) {
      return line.trim();
    });
  };
// Splits SDP into sessionpart and mediasections. Ensures CRLF.
  SDPUtils.splitSections = function(blob) {
    var parts = blob.split('\nm=');
    return parts.map(function(part, index) {
      return (index > 0 ? 'm=' + part : part).trim() + '\r\n';
    });
  };

// Returns lines that start with a certain prefix.
  SDPUtils.matchPrefix = function(blob, prefix) {
    return SDPUtils.splitLines(blob).filter(function(line) {
      return line.indexOf(prefix) === 0;
    });
  };

// Parses an ICE candidate line. Sample input:
// candidate:702786350 2 udp 41819902 8.8.8.8 60769 typ relay raddr 8.8.8.8
// rport 55996"
  SDPUtils.parseCandidate = function(line) {
    var parts;
  // Parse both variants.
    if (line.indexOf('a=candidate:') === 0) {
      parts = line.substring(12).split(' ');
    } else {
      parts = line.substring(10).split(' ');
    }

    var candidate = {
      foundation: parts[0],
      component: parts[1],
      protocol: parts[2].toLowerCase(),
      priority: parseInt(parts[3], 10),
      ip: parts[4],
      port: parseInt(parts[5], 10),
    // skip parts[6] == 'typ'
      type: parts[7]
    };

    for (var i = 8; i < parts.length; i += 2) {
      switch (parts[i]) {
      case 'raddr':
        candidate.relatedAddress = parts[i + 1];
        break;
      case 'rport':
        candidate.relatedPort = parseInt(parts[i + 1], 10);
        break;
      case 'tcptype':
        candidate.tcpType = parts[i + 1];
        break;
      default: // Unknown extensions are silently ignored.
        break;
      }
    }
    return candidate;
  };

// Translates a candidate object into SDP candidate attribute.
  SDPUtils.writeCandidate = function(candidate) {
    var sdp = [];
    sdp.push(candidate.foundation);
    sdp.push(candidate.component);
    sdp.push(candidate.protocol.toUpperCase());
    sdp.push(candidate.priority);
    sdp.push(candidate.ip);
    sdp.push(candidate.port);

    var type = candidate.type;
    sdp.push('typ');
    sdp.push(type);
    if (type !== 'host' && candidate.relatedAddress &&
      candidate.relatedPort) {
      sdp.push('raddr');
      sdp.push(candidate.relatedAddress); // was: relAddr
      sdp.push('rport');
      sdp.push(candidate.relatedPort); // was: relPort
    }
    if (candidate.tcpType && candidate.protocol.toLowerCase() === 'tcp') {
      sdp.push('tcptype');
      sdp.push(candidate.tcpType);
    }
    return 'candidate:' + sdp.join(' ');
  };

// Parses an rtpmap line, returns RTCRtpCoddecParameters. Sample input:
// a=rtpmap:111 opus/48000/2
  SDPUtils.parseRtpMap = function(line) {
    var parts = line.substr(9).split(' ');
    var parsed = {
      payloadType: parseInt(parts.shift(), 10) // was: id
    };

    parts = parts[0].split('/');

    parsed.name = parts[0];
    parsed.clockRate = parseInt(parts[1], 10); // was: clockrate
  // was: channels
    parsed.numChannels = parts.length === 3 ? parseInt(parts[2], 10) : 1;
    return parsed;
  };

// Generate an a=rtpmap line from RTCRtpCodecCapability or
// RTCRtpCodecParameters.
  SDPUtils.writeRtpMap = function(codec) {
    var pt = codec.payloadType;
    if (codec.preferredPayloadType !== undefined) {
      pt = codec.preferredPayloadType;
    }
    return 'a=rtpmap:' + pt + ' ' + codec.name + '/' + codec.clockRate +
      (codec.numChannels !== 1 ? '/' + codec.numChannels : '') + '\r\n';
  };

// Parses an a=extmap line (headerextension from RFC 5285). Sample input:
// a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
  SDPUtils.parseExtmap = function(line) {
    var parts = line.substr(9).split(' ');
    return {
      id: parseInt(parts[0], 10),
      uri: parts[1]
    };
  };

// Generates a=extmap line from RTCRtpHeaderExtensionParameters or
// RTCRtpHeaderExtension.
  SDPUtils.writeExtmap = function(headerExtension) {
    return 'a=extmap:' + (headerExtension.id || headerExtension.preferredId) +
       ' ' + headerExtension.uri + '\r\n';
  };

// Parses an ftmp line, returns dictionary. Sample input:
// a=fmtp:96 vbr=on;cng=on
// Also deals with vbr=on; cng=on
  SDPUtils.parseFmtp = function(line) {
    var parsed = {};
    var kv;
    var parts = line.substr(line.indexOf(' ') + 1).split(';');
    for (var j = 0; j < parts.length; j++) {
      kv = parts[j].trim().split('=');
      parsed[kv[0].trim()] = kv[1];
    }
    return parsed;
  };

// Generates an a=ftmp line from RTCRtpCodecCapability or RTCRtpCodecParameters.
  SDPUtils.writeFmtp = function(codec) {
    var line = '';
    var pt = codec.payloadType;
    if (codec.preferredPayloadType !== undefined) {
      pt = codec.preferredPayloadType;
    }
    if (codec.parameters && Object.keys(codec.parameters).length) {
      var params = [];
      Object.keys(codec.parameters).forEach(function(param) {
        params.push(param + '=' + codec.parameters[param]);
      });
      line += 'a=fmtp:' + pt + ' ' + params.join(';') + '\r\n';
    }
    return line;
  };

// Parses an rtcp-fb line, returns RTCPRtcpFeedback object. Sample input:
// a=rtcp-fb:98 nack rpsi
  SDPUtils.parseRtcpFb = function(line) {
    var parts = line.substr(line.indexOf(' ') + 1).split(' ');
    return {
      type: parts.shift(),
      parameter: parts.join(' ')
    };
  };
// Generate a=rtcp-fb lines from RTCRtpCodecCapability or RTCRtpCodecParameters.
  SDPUtils.writeRtcpFb = function(codec) {
    var lines = '';
    var pt = codec.payloadType;
    if (codec.preferredPayloadType !== undefined) {
      pt = codec.preferredPayloadType;
    }
    if (codec.rtcpFeedback && codec.rtcpFeedback.length) {
    // FIXME: special handling for trr-int?
      codec.rtcpFeedback.forEach(function(fb) {
        lines += 'a=rtcp-fb:' + pt + ' ' + fb.type +
      (fb.parameter && fb.parameter.length ? ' ' + fb.parameter : '') +
          '\r\n';
      });
    }
    return lines;
  };

// Parses an RFC 5576 ssrc media attribute. Sample input:
// a=ssrc:3735928559 cname:something
  SDPUtils.parseSsrcMedia = function(line) {
    var sp = line.indexOf(' ');
    var parts = {
      ssrc: parseInt(line.substr(7, sp - 7), 10)
    };
    var colon = line.indexOf(':', sp);
    if (colon > -1) {
      parts.attribute = line.substr(sp + 1, colon - sp - 1);
      parts.value = line.substr(colon + 1);
    } else {
      parts.attribute = line.substr(sp + 1);
    }
    return parts;
  };

// Extracts DTLS parameters from SDP media section or sessionpart.
// FIXME: for consistency with other functions this should only
//   get the fingerprint line as input. See also getIceParameters.
  SDPUtils.getDtlsParameters = function(mediaSection, sessionpart) {
    var lines = SDPUtils.splitLines(mediaSection);
  // Search in session part, too.
    lines = lines.concat(SDPUtils.splitLines(sessionpart));
    var fpLine = lines.filter(function(line) {
      return line.indexOf('a=fingerprint:') === 0;
    })[0].substr(14);
  // Note: a=setup line is ignored since we use the 'auto' role.
    var dtlsParameters = {
      role: 'auto',
      fingerprints: [{
        algorithm: fpLine.split(' ')[0],
        value: fpLine.split(' ')[1]
      }]
    };
    return dtlsParameters;
  };

// Serializes DTLS parameters to SDP.
  SDPUtils.writeDtlsParameters = function(params, setupType) {
    var sdp = 'a=setup:' + setupType + '\r\n';
    params.fingerprints.forEach(function(fp) {
      sdp += 'a=fingerprint:' + fp.algorithm + ' ' + fp.value + '\r\n';
    });
    return sdp;
  };
// Parses ICE information from SDP media section or sessionpart.
// FIXME: for consistency with other functions this should only
//   get the ice-ufrag and ice-pwd lines as input.
  SDPUtils.getIceParameters = function(mediaSection, sessionpart) {
    var lines = SDPUtils.splitLines(mediaSection);
  // Search in session part, too.
    lines = lines.concat(SDPUtils.splitLines(sessionpart));
    var iceParameters = {
      usernameFragment: lines.filter(function(line) {
        return line.indexOf('a=ice-ufrag:') === 0;
      })[0].substr(12),
      password: lines.filter(function(line) {
        return line.indexOf('a=ice-pwd:') === 0;
      })[0].substr(10)
    };
    return iceParameters;
  };

// Serializes ICE parameters to SDP.
  SDPUtils.writeIceParameters = function(params) {
    return 'a=ice-ufrag:' + params.usernameFragment + '\r\n' +
      'a=ice-pwd:' + params.password + '\r\n';
  };

// Parses the SDP media section and returns RTCRtpParameters.
  SDPUtils.parseRtpParameters = function(mediaSection) {
    var description = {
      codecs: [],
      headerExtensions: [],
      fecMechanisms: [],
      rtcp: []
    };
    var lines = SDPUtils.splitLines(mediaSection);
    var mline = lines[0].split(' ');
    for (var i = 3; i < mline.length; i++) { // find all codecs from mline[3..]
      var pt = mline[i];
      var rtpmapline = SDPUtils.matchPrefix(
        mediaSection, 'a=rtpmap:' + pt + ' ')[0];
      if (rtpmapline) {
        var codec = SDPUtils.parseRtpMap(rtpmapline);
        var fmtps = SDPUtils.matchPrefix(
          mediaSection, 'a=fmtp:' + pt + ' ');
      // Only the first a=fmtp:<pt> is considered.
        codec.parameters = fmtps.length ? SDPUtils.parseFmtp(fmtps[0]) : {};
        codec.rtcpFeedback = SDPUtils.matchPrefix(
          mediaSection, 'a=rtcp-fb:' + pt + ' ')
        .map(SDPUtils.parseRtcpFb);
        description.codecs.push(codec);
      // parse FEC mechanisms from rtpmap lines.
        switch (codec.name.toUpperCase()) {
        case 'RED':
        case 'ULPFEC':
          description.fecMechanisms.push(codec.name.toUpperCase());
          break;
        default: // only RED and ULPFEC are recognized as FEC mechanisms.
          break;
        }
      }
    }
    SDPUtils.matchPrefix(mediaSection, 'a=extmap:').forEach(function(line) {
      description.headerExtensions.push(SDPUtils.parseExtmap(line));
    });
  // FIXME: parse rtcp.
    return description;
  };

// Generates parts of the SDP media section describing the capabilities /
// parameters.
  SDPUtils.writeRtpDescription = function(kind, caps) {
    var sdp = '';

  // Build the mline.
    sdp += 'm=' + kind + ' ';
    sdp += caps.codecs.length > 0 ? '9' : '0'; // reject if no codecs.
    sdp += ' UDP/TLS/RTP/SAVPF ';
    sdp += caps.codecs.map(function(codec) {
      if (codec.preferredPayloadType !== undefined) {
        return codec.preferredPayloadType;
      }
      return codec.payloadType;
    }).join(' ') + '\r\n';

    sdp += 'c=IN IP4 0.0.0.0\r\n';
    sdp += 'a=rtcp:9 IN IP4 0.0.0.0\r\n';

  // Add a=rtpmap lines for each codec. Also fmtp and rtcp-fb.
    caps.codecs.forEach(function(codec) {
      sdp += SDPUtils.writeRtpMap(codec);
      sdp += SDPUtils.writeFmtp(codec);
      sdp += SDPUtils.writeRtcpFb(codec);
    });
  // FIXME: add headerExtensions, fecMechanismş and rtcp.
    sdp += 'a=rtcp-mux\r\n';
    return sdp;
  };

// Parses the SDP media section and returns an array of
// RTCRtpEncodingParameters.
  SDPUtils.parseRtpEncodingParameters = function(mediaSection) {
    var encodingParameters = [];
    var description = SDPUtils.parseRtpParameters(mediaSection);
    var hasRed = description.fecMechanisms.indexOf('RED') !== -1;
    var hasUlpfec = description.fecMechanisms.indexOf('ULPFEC') !== -1;

  // filter a=ssrc:... cname:, ignore PlanB-msid
    var ssrcs = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:')
  .map(function(line) {
    return SDPUtils.parseSsrcMedia(line);
  })
  .filter(function(parts) {
    return parts.attribute === 'cname';
  });
    var primarySsrc = ssrcs.length > 0 && ssrcs[0].ssrc;
    var secondarySsrc;

    var flows = SDPUtils.matchPrefix(mediaSection, 'a=ssrc-group:FID')
  .map(function(line) {
    var parts = line.split(' ');
    parts.shift();
    return parts.map(function(part) {
      return parseInt(part, 10);
    });
  });
    if (flows.length > 0 && flows[0].length > 1 && flows[0][0] === primarySsrc) {
      secondarySsrc = flows[0][1];
    }

    description.codecs.forEach(function(codec) {
      if (codec.name.toUpperCase() === 'RTX' && codec.parameters.apt) {
        var encParam = {
          ssrc: primarySsrc,
          codecPayloadType: parseInt(codec.parameters.apt, 10),
          rtx: {
            payloadType: codec.payloadType,
            ssrc: secondarySsrc
          }
        };
        encodingParameters.push(encParam);
        if (hasRed) {
          encParam = JSON.parse(JSON.stringify(encParam));
          encParam.fec = {
            ssrc: secondarySsrc,
            mechanism: hasUlpfec ? 'red+ulpfec' : 'red'
          };
          encodingParameters.push(encParam);
        }
      }
    });
    if (encodingParameters.length === 0 && primarySsrc) {
      encodingParameters.push({
        ssrc: primarySsrc
      });
    }

  // we support both b=AS and b=TIAS but interpret AS as TIAS.
    var bandwidth = SDPUtils.matchPrefix(mediaSection, 'b=');
    if (bandwidth.length) {
      if (bandwidth[0].indexOf('b=TIAS:') === 0) {
        bandwidth = parseInt(bandwidth[0].substr(7), 10);
      } else if (bandwidth[0].indexOf('b=AS:') === 0) {
        bandwidth = parseInt(bandwidth[0].substr(5), 10);
      }
      encodingParameters.forEach(function(params) {
        params.maxBitrate = bandwidth;
      });
    }
    return encodingParameters;
  };

  SDPUtils.writeSessionBoilerplate = function() {
  // FIXME: sess-id should be an NTP timestamp.
    return 'v=0\r\n' +
      'o=thisisadapterortc 8169639915646943137 2 IN IP4 127.0.0.1\r\n' +
      's=-\r\n' +
      't=0 0\r\n';
  };

  SDPUtils.writeMediaSection = function(transceiver, caps, type, stream) {
    var sdp = SDPUtils.writeRtpDescription(transceiver.kind, caps);

  // Map ICE parameters (ufrag, pwd) to SDP.
    sdp += SDPUtils.writeIceParameters(
      transceiver.iceGatherer.getLocalParameters());

  // Map DTLS parameters to SDP.
    sdp += SDPUtils.writeDtlsParameters(
      transceiver.dtlsTransport.getLocalParameters(),
      type === 'offer' ? 'actpass' : 'active');

    sdp += 'a=mid:' + transceiver.mid + '\r\n';

    if (transceiver.rtpSender && transceiver.rtpReceiver) {
      sdp += 'a=sendrecv\r\n';
    } else if (transceiver.rtpSender) {
      sdp += 'a=sendonly\r\n';
    } else if (transceiver.rtpReceiver) {
      sdp += 'a=recvonly\r\n';
    } else {
      sdp += 'a=inactive\r\n';
    }

  // FIXME: for RTX there might be multiple SSRCs. Not implemented in Edge yet.
    if (transceiver.rtpSender) {
      var msid = 'msid:' + stream.id + ' ' +
        transceiver.rtpSender.track.id + '\r\n';
      sdp += 'a=' + msid;
      sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
        ' ' + msid;
    }
  // FIXME: this should be written by writeRtpDescription.
    sdp += 'a=ssrc:' + transceiver.sendEncodingParameters[0].ssrc +
      ' cname:' + SDPUtils.localCName + '\r\n';
    return sdp;
  };

// Gets the direction from the mediaSection or the sessionpart.
  SDPUtils.getDirection = function(mediaSection, sessionpart) {
  // Look for sendrecv, sendonly, recvonly, inactive, default to sendrecv.
    var lines = SDPUtils.splitLines(mediaSection);
    for (var i = 0; i < lines.length; i++) {
      switch (lines[i]) {
      case 'a=sendrecv':
      case 'a=sendonly':
      case 'a=recvonly':
      case 'a=inactive':
        return lines[i].substr(2);
      default:
        // FIXME: What should happen here?
      }
    }
    if (sessionpart) {
      return SDPUtils.getDirection(sessionpart);
    }
    return 'sendrecv';
  };

// Expose public methods.
  module.exports = SDPUtils;

},{}],2:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */

  'use strict';

// Shimming starts here.
  (function() {
  // Utils.
    var logging = require('./utils').log;
    var browserDetails = require('./utils').browserDetails;
  // Export to the adapter global object visible in the browser.
    module.exports.browserDetails = browserDetails;
    module.exports.extractVersion = require('./utils').extractVersion;
    module.exports.disableLog = require('./utils').disableLog;

  // Uncomment the line below if you want logging to occur, including logging
  // for the switch statement below. Can also be turned on in the browser via
  // adapter.disableLog(false), but then logging from the switch statement below
  // will not appear.
  // require('./utils').disableLog(false);

  // Browser shims.
    var chromeShim = require('./chrome/chrome_shim') || null;
    var edgeShim = require('./edge/edge_shim') || null;
    var firefoxShim = require('./firefox/firefox_shim') || null;
    var safariShim = require('./safari/safari_shim') || null;

  // Shim browser if found.
    switch (browserDetails.browser) {
    case 'opera': // fallthrough as it uses chrome shims
    case 'chrome':
      if (!chromeShim || !chromeShim.shimPeerConnection) {
        logging('Chrome shim is not included in this adapter release.');
        return;
      }
      logging('adapter.js shimming chrome.');
      // Export to the adapter global object visible in the browser.
      module.exports.browserShim = chromeShim;

      chromeShim.shimGetUserMedia();
      chromeShim.shimMediaStream();
      chromeShim.shimSourceObject();
      chromeShim.shimPeerConnection();
      chromeShim.shimOnTrack();
      break;
    case 'firefox':
      if (!firefoxShim || !firefoxShim.shimPeerConnection) {
        logging('Firefox shim is not included in this adapter release.');
        return;
      }
      logging('adapter.js shimming firefox.');
      // Export to the adapter global object visible in the browser.
      module.exports.browserShim = firefoxShim;

      firefoxShim.shimGetUserMedia();
      firefoxShim.shimSourceObject();
      firefoxShim.shimPeerConnection();
      firefoxShim.shimOnTrack();
      break;
    case 'edge':
      if (!edgeShim || !edgeShim.shimPeerConnection) {
        logging('MS edge shim is not included in this adapter release.');
        return;
      }
      logging('adapter.js shimming edge.');
      // Export to the adapter global object visible in the browser.
      module.exports.browserShim = edgeShim;

      edgeShim.shimGetUserMedia();
      edgeShim.shimPeerConnection();
      break;
    case 'safari':
      if (!safariShim) {
        logging('Safari shim is not included in this adapter release.');
        return;
      }
      logging('adapter.js shimming safari.');
      // Export to the adapter global object visible in the browser.
      module.exports.browserShim = safariShim;

      safariShim.shimGetUserMedia();
      break;
    default:
      logging('Unsupported browser!');
    }
  })();

},{'./chrome/chrome_shim':3,'./edge/edge_shim':5,'./firefox/firefox_shim':7,'./safari/safari_shim':9,'./utils':10}],3:[function(require,module,exports){

/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */
  'use strict';
  var logging = require('../utils.js').log;
  var browserDetails = require('../utils.js').browserDetails;

  var chromeShim = {
    shimMediaStream: function() {
      window.MediaStream = window.MediaStream || window.webkitMediaStream;
    },

    shimOnTrack: function() {
      if (typeof window === 'object' && window.RTCPeerConnection && !('ontrack' in
        window.RTCPeerConnection.prototype)) {
        Object.defineProperty(window.RTCPeerConnection.prototype, 'ontrack', {
          get: function() {
            return this._ontrack;
          },
          set: function(f) {
            var self = this;
            if (this._ontrack) {
              this.removeEventListener('track', this._ontrack);
              this.removeEventListener('addstream', this._ontrackpoly);
            }
            this.addEventListener('track', this._ontrack = f);
            this.addEventListener('addstream', this._ontrackpoly = function(e) {
            // onaddstream does not fire when a track is added to an existing
            // stream. But stream.onaddtrack is implemented so we use that.
              e.stream.addEventListener('addtrack', function(te) {
                var event = new Event('track');
                event.track = te.track;
                event.receiver = {track: te.track};
                event.streams = [e.stream];
                self.dispatchEvent(event);
              });
              e.stream.getTracks().forEach(function(track) {
                var event = new Event('track');
                event.track = track;
                event.receiver = {track: track};
                event.streams = [e.stream];
                this.dispatchEvent(event);
              }.bind(this));
            }.bind(this));
          }
        });
      }
    },

    shimSourceObject: function() {
      if (typeof window === 'object') {
        if (window.HTMLMediaElement &&
        !('srcObject' in window.HTMLMediaElement.prototype)) {
        // Shim the srcObject property, once, when HTMLMediaElement is found.
          Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
            get: function() {
              return this._srcObject;
            },
            set: function(stream) {
              var self = this;
            // Use _srcObject as a private property for this shim
              this._srcObject = stream;
              if (this.src) {
                URL.revokeObjectURL(this.src);
              }

              if (!stream) {
                this.src = '';
                return;
              }
              this.src = URL.createObjectURL(stream);
            // We need to recreate the blob url when a track is added or
            // removed. Doing it manually since we want to avoid a recursion.
              stream.addEventListener('addtrack', function() {
                if (self.src) {
                  URL.revokeObjectURL(self.src);
                }
                self.src = URL.createObjectURL(stream);
              });
              stream.addEventListener('removetrack', function() {
                if (self.src) {
                  URL.revokeObjectURL(self.src);
                }
                self.src = URL.createObjectURL(stream);
              });
            }
          });
        }
      }
    },

    shimPeerConnection: function() {
    // The RTCPeerConnection object.
      window.RTCPeerConnection = function(pcConfig, pcConstraints) {
      // Translate iceTransportPolicy to iceTransports,
      // see https://code.google.com/p/webrtc/issues/detail?id=4869
        logging('PeerConnection');
        if (pcConfig && pcConfig.iceTransportPolicy) {
          pcConfig.iceTransports = pcConfig.iceTransportPolicy;
        }

        var pc = new webkitRTCPeerConnection(pcConfig, pcConstraints);
        var origGetStats = pc.getStats.bind(pc);
        pc.getStats = function(selector, successCallback, errorCallback) {
          var self = this;
          var args = arguments;

        // If selector is a function then we are in the old style stats so just
        // pass back the original getStats format to avoid breaking old users.
          if (arguments.length > 0 && typeof selector === 'function') {
            return origGetStats(selector, successCallback);
          }

          var fixChromeStats_ = function(response) {
            var standardReport = {};
            var reports = response.result();
            reports.forEach(function(report) {
              var standardStats = {
                id: report.id,
                timestamp: report.timestamp,
                type: report.type
              };
              report.names().forEach(function(name) {
                standardStats[name] = report.stat(name);
              });
              standardReport[standardStats.id] = standardStats;
            });

            return standardReport;
          };

        // shim getStats with maplike support
          var makeMapStats = function(stats, legacyStats) {
            var map = new Map(Object.keys(stats).map(function(key) {
              return[key, stats[key]];
            }));
            legacyStats = legacyStats || stats;
            Object.keys(legacyStats).forEach(function(key) {
              map[key] = legacyStats[key];
            });
            return map;
          };

          if (arguments.length >= 2) {
            var successCallbackWrapper_ = function(response) {
              args[1](makeMapStats(fixChromeStats_(response)));
            };

            return origGetStats.apply(this, [successCallbackWrapper_,
              arguments[0]]);
          }

        // promise-support
          return new Promise(function(resolve, reject) {
            if (args.length === 1 && typeof selector === 'object') {
              origGetStats.apply(self, [
                function(response) {
                  resolve(makeMapStats(fixChromeStats_(response)));
                }, reject]);
            } else {
            // Preserve legacy chrome stats only on legacy access of stats obj
              origGetStats.apply(self, [
                function(response) {
                  resolve(makeMapStats(fixChromeStats_(response),
                    response.result()));
                }, reject]);
            }
          }).then(successCallback, errorCallback);
        };

        return pc;
      };
      window.RTCPeerConnection.prototype = webkitRTCPeerConnection.prototype;

    // wrap static methods. Currently just generateCertificate.
      if (webkitRTCPeerConnection.generateCertificate) {
        Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
          get: function() {
            return webkitRTCPeerConnection.generateCertificate;
          }
        });
      }

      ['createOffer', 'createAnswer'].forEach(function(method) {
        var nativeMethod = webkitRTCPeerConnection.prototype[method];
        webkitRTCPeerConnection.prototype[method] = function() {
          var self = this;
          if (arguments.length < 1 || (arguments.length === 1 &&
            typeof arguments[0] === 'object')) {
            var opts = arguments.length === 1 ? arguments[0] : undefined;
            return new Promise(function(resolve, reject) {
              nativeMethod.apply(self, [resolve, reject, opts]);
            });
          }
          return nativeMethod.apply(this, arguments);
        };
      });

    // add promise support -- natively available in Chrome 51
      if (browserDetails.version < 51) {
        ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate']
          .forEach(function(method) {
            var nativeMethod = webkitRTCPeerConnection.prototype[method];
            webkitRTCPeerConnection.prototype[method] = function() {
              var args = arguments;
              var self = this;
              var promise = new Promise(function(resolve, reject) {
                nativeMethod.apply(self, [args[0], resolve, reject]);
              });
              if (args.length < 2) {
                return promise;
              }
              return promise.then(function() {
                args[1].apply(null, []);
              },
              function(err) {
                if (args.length >= 3) {
                  args[2].apply(null, [err]);
                }
              });
            };
          });
      }

    // shim implicit creation of RTCSessionDescription/RTCIceCandidate
      ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate']
        .forEach(function(method) {
          var nativeMethod = webkitRTCPeerConnection.prototype[method];
          webkitRTCPeerConnection.prototype[method] = function() {
            arguments[0] = new ((method === 'addIceCandidate') ?
                RTCIceCandidate : RTCSessionDescription)(arguments[0]);
            return nativeMethod.apply(this, arguments);
          };
        });

    // support for addIceCandidate(null)
      var nativeAddIceCandidate =
        RTCPeerConnection.prototype.addIceCandidate;
      RTCPeerConnection.prototype.addIceCandidate = function() {
        return arguments[0] === null ? Promise.resolve()
          : nativeAddIceCandidate.apply(this, arguments);
      };
    }
  };


// Expose public methods.
  module.exports = {
    shimMediaStream: chromeShim.shimMediaStream,
    shimOnTrack: chromeShim.shimOnTrack,
    shimSourceObject: chromeShim.shimSourceObject,
    shimPeerConnection: chromeShim.shimPeerConnection,
    shimGetUserMedia: require('./getusermedia')
  };

},{'../utils.js':10,'./getusermedia':4}],4:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */
  'use strict';
  var logging = require('../utils.js').log;

// Expose public methods.
  module.exports = function() {
    var constraintsToChrome_ = function(c) {
      if (typeof c !== 'object' || c.mandatory || c.optional) {
        return c;
      }
      var cc = {};
      Object.keys(c).forEach(function(key) {
        if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
          return;
        }
        var r = (typeof c[key] === 'object') ? c[key] : {ideal: c[key]};
        if (r.exact !== undefined && typeof r.exact === 'number') {
          r.min = r.max = r.exact;
        }
        var oldname_ = function(prefix, name) {
          if (prefix) {
            return prefix + name.charAt(0).toUpperCase() + name.slice(1);
          }
          return (name === 'deviceId') ? 'sourceId' : name;
        };
        if (r.ideal !== undefined) {
          cc.optional = cc.optional || [];
          var oc = {};
          if (typeof r.ideal === 'number') {
            oc[oldname_('min', key)] = r.ideal;
            cc.optional.push(oc);
            oc = {};
            oc[oldname_('max', key)] = r.ideal;
            cc.optional.push(oc);
          } else {
            oc[oldname_('', key)] = r.ideal;
            cc.optional.push(oc);
          }
        }
        if (r.exact !== undefined && typeof r.exact !== 'number') {
          cc.mandatory = cc.mandatory || {};
          cc.mandatory[oldname_('', key)] = r.exact;
        } else {
          ['min', 'max'].forEach(function(mix) {
            if (r[mix] !== undefined) {
              cc.mandatory = cc.mandatory || {};
              cc.mandatory[oldname_(mix, key)] = r[mix];
            }
          });
        }
      });
      if (c.advanced) {
        cc.optional = (cc.optional || []).concat(c.advanced);
      }
      return cc;
    };

    var shimConstraints_ = function(constraints, func) {
      constraints = JSON.parse(JSON.stringify(constraints));
      if (constraints && constraints.audio) {
        constraints.audio = constraintsToChrome_(constraints.audio);
      }
      if (constraints && typeof constraints.video === 'object') {
      // Shim facingMode for mobile, where it defaults to "user".
        var face = constraints.video.facingMode;
        face = face && ((typeof face === 'object') ? face : {ideal: face});

        if ((face && (face.exact === 'user' || face.exact === 'environment' ||
                    face.ideal === 'user' || face.ideal === 'environment')) &&
          !(navigator.mediaDevices.getSupportedConstraints &&
            navigator.mediaDevices.getSupportedConstraints().facingMode)) {
          delete constraints.video.facingMode;
          if (face.exact === 'environment' || face.ideal === 'environment') {
          // Look for "back" in label, or use last cam (typically back cam).
            return navigator.mediaDevices.enumerateDevices()
          .then(function(devices) {
            devices = devices.filter(function(d) {
              return d.kind === 'videoinput';
            });
            var back = devices.find(function(d) {
              return d.label.toLowerCase().indexOf('back') !== -1;
            }) || (devices.length && devices[devices.length - 1]);
            if (back) {
              constraints.video.deviceId = face.exact ? {exact: back.deviceId} :
                                                        {ideal: back.deviceId};
            }
            constraints.video = constraintsToChrome_(constraints.video);
            logging('chrome: ' + JSON.stringify(constraints));
            return func(constraints);
          });
          }
        }
        constraints.video = constraintsToChrome_(constraints.video);
      }
      logging('chrome: ' + JSON.stringify(constraints));
      return func(constraints);
    };

    var shimError_ = function(e) {
      return {
        name: {
          PermissionDeniedError: 'NotAllowedError',
          ConstraintNotSatisfiedError: 'OverconstrainedError'
        }[e.name] || e.name,
        message: e.message,
        constraint: e.constraintName,
        toString: function() {
          return this.name + (this.message && ': ') + this.message;
        }
      };
    };

    var getUserMedia_ = function(constraints, onSuccess, onError) {
      shimConstraints_(constraints, function(c) {
        navigator.webkitGetUserMedia(c, onSuccess, function(e) {
          onError(shimError_(e));
        });
      });
    };

    navigator.getUserMedia = getUserMedia_;

  // Returns the result of getUserMedia as a Promise.
    var getUserMediaPromise_ = function(constraints) {
      return new Promise(function(resolve, reject) {
        navigator.getUserMedia(constraints, resolve, reject);
      });
    };

    if (!navigator.mediaDevices) {
      navigator.mediaDevices = {
        getUserMedia: getUserMediaPromise_,
        enumerateDevices: function() {
          return new Promise(function(resolve) {
            var kinds = {audio: 'audioinput', video: 'videoinput'};
            return MediaStreamTrack.getSources(function(devices) {
              resolve(devices.map(function(device) {
                return {label: device.label,
                      kind: kinds[device.kind],
                      deviceId: device.id,
                      groupId: ''};
              }));
            });
          });
        }
      };
    }

  // A shim for getUserMedia method on the mediaDevices object.
  // TODO(KaptenJansson) remove once implemented in Chrome stable.
    if (!navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia = function(constraints) {
        return getUserMediaPromise_(constraints);
      };
    } else {
    // Even though Chrome 45 has navigator.mediaDevices and a getUserMedia
    // function which returns a Promise, it does not accept spec-style
    // constraints.
      var origGetUserMedia = navigator.mediaDevices.getUserMedia.
        bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = function(cs) {
        return shimConstraints_(cs, function(c) {
          return origGetUserMedia(c).catch(function(e) {
            return Promise.reject(shimError_(e));
          });
        });
      };
    }

  // Dummy devicechange event methods.
  // TODO(KaptenJansson) remove once implemented in Chrome stable.
    if (typeof navigator.mediaDevices.addEventListener === 'undefined') {
      navigator.mediaDevices.addEventListener = function() {
        logging('Dummy mediaDevices.addEventListener called.');
      };
    }
    if (typeof navigator.mediaDevices.removeEventListener === 'undefined') {
      navigator.mediaDevices.removeEventListener = function() {
        logging('Dummy mediaDevices.removeEventListener called.');
      };
    }
  };

},{'../utils.js':10}],5:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */
  'use strict';

  var SDPUtils = require('sdp');
  var browserDetails = require('../utils').browserDetails;

  var edgeShim = {
    shimPeerConnection: function() {
      if (window.RTCIceGatherer) {
      // ORTC defines an RTCIceCandidate object but no constructor.
      // Not implemented in Edge.
        if (!window.RTCIceCandidate) {
          window.RTCIceCandidate = function(args) {
            return args;
          };
        }
      // ORTC does not have a session description object but
      // other browsers (i.e. Chrome) that will support both PC and ORTC
      // in the future might have this defined already.
        if (!window.RTCSessionDescription) {
          window.RTCSessionDescription = function(args) {
            return args;
          };
        }
      }

      window.RTCPeerConnection = function(config) {
        var self = this;

        var _eventTarget = document.createDocumentFragment();
        ['addEventListener', 'removeEventListener', 'dispatchEvent']
          .forEach(function(method) {
            self[method] = _eventTarget[method].bind(_eventTarget);
          });

        this.onicecandidate = null;
        this.onaddstream = null;
        this.ontrack = null;
        this.onremovestream = null;
        this.onsignalingstatechange = null;
        this.oniceconnectionstatechange = null;
        this.onnegotiationneeded = null;
        this.ondatachannel = null;

        this.localStreams = [];
        this.remoteStreams = [];
        this.getLocalStreams = function() {
          return self.localStreams;
        };
        this.getRemoteStreams = function() {
          return self.remoteStreams;
        };

        this.localDescription = new RTCSessionDescription({
          type: '',
          sdp: ''
        });
        this.remoteDescription = new RTCSessionDescription({
          type: '',
          sdp: ''
        });
        this.signalingState = 'stable';
        this.iceConnectionState = 'new';
        this.iceGatheringState = 'new';

        this.iceOptions = {
          gatherPolicy: 'all',
          iceServers: []
        };
        if (config && config.iceTransportPolicy) {
          switch (config.iceTransportPolicy) {
          case 'all':
          case 'relay':
            this.iceOptions.gatherPolicy = config.iceTransportPolicy;
            break;
          case 'none':
            // FIXME: remove once implementation and spec have added this.
            throw new TypeError('iceTransportPolicy "none" not supported');
          default:
            // don't set iceTransportPolicy.
            break;
          }
        }
        this.usingBundle = config && config.bundlePolicy === 'max-bundle';

        if (config && config.iceServers) {
        // Edge does not like
        // 1) stun:
        // 2) turn: that does not have all of turn:host:port?transport=udp
        // 3) turn: with ipv6 addresses
          var iceServers = JSON.parse(JSON.stringify(config.iceServers));
          this.iceOptions.iceServers = iceServers.filter(function(server) {
            if (server && server.urls) {
              var urls = server.urls;
              if (typeof urls === 'string') {
                urls = [urls];
              }
              urls = urls.filter(function(url) {
                return (url.indexOf('turn:') === 0 &&
                  url.indexOf('transport=udp') !== -1 &&
                  url.indexOf('turn:[') === -1) ||
                  (url.indexOf('stun:') === 0 &&
                    browserDetails.version >= 14393);
              })[0];
              return !!urls;
            }
            return false;
          });
        }

      // per-track iceGathers, iceTransports, dtlsTransports, rtpSenders, ...
      // everything that is needed to describe a SDP m-line.
        this.transceivers = [];

      // since the iceGatherer is currently created in createOffer but we
      // must not emit candidates until after setLocalDescription we buffer
      // them in this array.
        this._localIceCandidatesBuffer = [];
      };

      window.RTCPeerConnection.prototype._emitBufferedCandidates = function() {
        var self = this;
        var sections = SDPUtils.splitSections(self.localDescription.sdp);
      // FIXME: need to apply ice candidates in a way which is async but
      // in-order
        this._localIceCandidatesBuffer.forEach(function(event) {
          var end = !event.candidate || Object.keys(event.candidate).length === 0;
          if (end) {
            for (var j = 1; j < sections.length; j++) {
              if (sections[j].indexOf('\r\na=end-of-candidates\r\n') === -1) {
                sections[j] += 'a=end-of-candidates\r\n';
              }
            }
          } else if (event.candidate.candidate.indexOf('typ endOfCandidates')
            === -1) {
            sections[event.candidate.sdpMLineIndex + 1] +=
              'a=' + event.candidate.candidate + '\r\n';
          }
          self.localDescription.sdp = sections.join('');
          self.dispatchEvent(event);
          if (self.onicecandidate !== null) {
            self.onicecandidate(event);
          }
          if (!event.candidate && self.iceGatheringState !== 'complete') {
            var complete = self.transceivers.every(function(transceiver) {
              return transceiver.iceGatherer &&
                transceiver.iceGatherer.state === 'completed';
            });
            if (complete) {
              self.iceGatheringState = 'complete';
            }
          }
        });
        this._localIceCandidatesBuffer = [];
      };

      window.RTCPeerConnection.prototype.addStream = function(stream) {
      // Clone is necessary for local demos mostly, attaching directly
      // to two different senders does not work (build 10547).
        this.localStreams.push(stream.clone());
        this._maybeFireNegotiationNeeded();
      };

      window.RTCPeerConnection.prototype.removeStream = function(stream) {
        var idx = this.localStreams.indexOf(stream);
        if (idx > -1) {
          this.localStreams.splice(idx, 1);
          this._maybeFireNegotiationNeeded();
        }
      };

      window.RTCPeerConnection.prototype.getSenders = function() {
        return this.transceivers.filter(function(transceiver) {
          return !!transceiver.rtpSender;
        })
      .map(function(transceiver) {
        return transceiver.rtpSender;
      });
      };

      window.RTCPeerConnection.prototype.getReceivers = function() {
        return this.transceivers.filter(function(transceiver) {
          return !!transceiver.rtpReceiver;
        })
      .map(function(transceiver) {
        return transceiver.rtpReceiver;
      });
      };

    // Determines the intersection of local and remote capabilities.
      window.RTCPeerConnection.prototype._getCommonCapabilities =
        function(localCapabilities, remoteCapabilities) {
          var commonCapabilities = {
            codecs: [],
            headerExtensions: [],
            fecMechanisms: []
          };
          localCapabilities.codecs.forEach(function(lCodec) {
            for (var i = 0; i < remoteCapabilities.codecs.length; i++) {
              var rCodec = remoteCapabilities.codecs[i];
              if (lCodec.name.toLowerCase() === rCodec.name.toLowerCase() &&
                  lCodec.clockRate === rCodec.clockRate &&
                  lCodec.numChannels === rCodec.numChannels) {
                // push rCodec so we reply with offerer payload type
                commonCapabilities.codecs.push(rCodec);

                // determine common feedback mechanisms
                rCodec.rtcpFeedback = rCodec.rtcpFeedback.filter(function(fb) {
                  for (var j = 0; j < lCodec.rtcpFeedback.length; j++) {
                    if (lCodec.rtcpFeedback[j].type === fb.type &&
                        lCodec.rtcpFeedback[j].parameter === fb.parameter) {
                      return true;
                    }
                  }
                  return false;
                });
                // FIXME: also need to determine .parameters
                //  see https://github.com/openpeer/ortc/issues/569
                break;
              }
            }
          });

          localCapabilities.headerExtensions
              .forEach(function(lHeaderExtension) {
                for (var i = 0; i < remoteCapabilities.headerExtensions.length;
                     i++) {
                  var rHeaderExtension = remoteCapabilities.headerExtensions[i];
                  if (lHeaderExtension.uri === rHeaderExtension.uri) {
                    commonCapabilities.headerExtensions.push(rHeaderExtension);
                    break;
                  }
                }
              });

          // FIXME: fecMechanisms
          return commonCapabilities;
        };

    // Create ICE gatherer, ICE transport and DTLS transport.
      window.RTCPeerConnection.prototype._createIceAndDtlsTransports =
        function(mid, sdpMLineIndex) {
          var self = this;
          var iceGatherer = new RTCIceGatherer(self.iceOptions);
          var iceTransport = new RTCIceTransport(iceGatherer);
          iceGatherer.onlocalcandidate = function(evt) {
            var event = new Event('icecandidate');
            event.candidate = {sdpMid: mid, sdpMLineIndex: sdpMLineIndex};

            var cand = evt.candidate;
            var end = !cand || Object.keys(cand).length === 0;
            // Edge emits an empty object for RTCIceCandidateComplete‥
            if (end) {
              // polyfill since RTCIceGatherer.state is not implemented in
              // Edge 10547 yet.
              if (iceGatherer.state === undefined) {
                iceGatherer.state = 'completed';
              }

              // Emit a candidate with type endOfCandidates to make the samples
              // work. Edge requires addIceCandidate with this empty candidate
              // to start checking. The real solution is to signal
              // end-of-candidates to the other side when getting the null
              // candidate but some apps (like the samples) don't do that.
              event.candidate.candidate =
                  'candidate:1 1 udp 1 0.0.0.0 9 typ endOfCandidates';
            } else {
              // RTCIceCandidate doesn't have a component, needs to be added
              cand.component = iceTransport.component === 'RTCP' ? 2 : 1;
              event.candidate.candidate = SDPUtils.writeCandidate(cand);
            }

            // update local description.
            var sections = SDPUtils.splitSections(self.localDescription.sdp);
            if (event.candidate.candidate.indexOf('typ endOfCandidates')
                === -1) {
              sections[event.candidate.sdpMLineIndex + 1] +=
                  'a=' + event.candidate.candidate + '\r\n';
            } else {
              sections[event.candidate.sdpMLineIndex + 1] +=
                  'a=end-of-candidates\r\n';
            }
            self.localDescription.sdp = sections.join('');

            var complete = self.transceivers.every(function(transceiver) {
              return transceiver.iceGatherer &&
                  transceiver.iceGatherer.state === 'completed';
            });

            // Emit candidate if localDescription is set.
            // Also emits null candidate when all gatherers are complete.
            switch (self.iceGatheringState) {
            case 'new':
              self._localIceCandidatesBuffer.push(event);
              if (end && complete) {
                self._localIceCandidatesBuffer.push(
                      new Event('icecandidate'));
              }
              break;
            case 'gathering':
              self._emitBufferedCandidates();
              self.dispatchEvent(event);
              if (self.onicecandidate !== null) {
                self.onicecandidate(event);
              }
              if (complete) {
                self.dispatchEvent(new Event('icecandidate'));
                if (self.onicecandidate !== null) {
                  self.onicecandidate(new Event('icecandidate'));
                }
                self.iceGatheringState = 'complete';
              }
              break;
            case 'complete':
                // should not happen... currently!
              break;
            default: // no-op.
              break;
            }
          };
          iceTransport.onicestatechange = function() {
            self._updateConnectionState();
          };

          var dtlsTransport = new RTCDtlsTransport(iceTransport);
          dtlsTransport.ondtlsstatechange = function() {
            self._updateConnectionState();
          };
          dtlsTransport.onerror = function() {
            // onerror does not set state to failed by itself.
            dtlsTransport.state = 'failed';
            self._updateConnectionState();
          };

          return {
            iceGatherer: iceGatherer,
            iceTransport: iceTransport,
            dtlsTransport: dtlsTransport
          };
        };

    // Start the RTP Sender and Receiver for a transceiver.
      window.RTCPeerConnection.prototype._transceive = function(transceiver,
        send, recv) {
        var params = this._getCommonCapabilities(transceiver.localCapabilities,
          transceiver.remoteCapabilities);
        if (send && transceiver.rtpSender) {
          params.encodings = transceiver.sendEncodingParameters;
          params.rtcp = {
            cname: SDPUtils.localCName
          };
          if (transceiver.recvEncodingParameters.length) {
            params.rtcp.ssrc = transceiver.recvEncodingParameters[0].ssrc;
          }
          transceiver.rtpSender.send(params);
        }
        if (recv && transceiver.rtpReceiver) {
          params.encodings = transceiver.recvEncodingParameters;
          params.rtcp = {
            cname: transceiver.cname
          };
          if (transceiver.sendEncodingParameters.length) {
            params.rtcp.ssrc = transceiver.sendEncodingParameters[0].ssrc;
          }
          transceiver.rtpReceiver.receive(params);
        }
      };

      window.RTCPeerConnection.prototype.setLocalDescription =
        function(description) {
          var self = this;
          var sections;
          var sessionpart;
          if (description.type === 'offer') {
            // FIXME: What was the purpose of this empty if statement?
            // if (!this._pendingOffer) {
            // } else {
            if (this._pendingOffer) {
              // VERY limited support for SDP munging. Limited to:
              // * changing the order of codecs
              sections = SDPUtils.splitSections(description.sdp);
              sessionpart = sections.shift();
              sections.forEach(function(mediaSection, sdpMLineIndex) {
                var caps = SDPUtils.parseRtpParameters(mediaSection);
                self._pendingOffer[sdpMLineIndex].localCapabilities = caps;
              });
              this.transceivers = this._pendingOffer;
              delete this._pendingOffer;
            }
          } else if (description.type === 'answer') {
            sections = SDPUtils.splitSections(self.remoteDescription.sdp);
            sessionpart = sections.shift();
            var isIceLite = SDPUtils.matchPrefix(sessionpart,
                'a=ice-lite').length > 0;
            sections.forEach(function(mediaSection, sdpMLineIndex) {
              var transceiver = self.transceivers[sdpMLineIndex];
              var iceGatherer = transceiver.iceGatherer;
              var iceTransport = transceiver.iceTransport;
              var dtlsTransport = transceiver.dtlsTransport;
              var localCapabilities = transceiver.localCapabilities;
              var remoteCapabilities = transceiver.remoteCapabilities;
              var rejected = mediaSection.split('\n', 1)[0]
                  .split(' ', 2)[1] === '0';

              if (!rejected) {
                var remoteIceParameters = SDPUtils.getIceParameters(
                    mediaSection, sessionpart);
                if (isIceLite) {
                  var cands = SDPUtils.matchPrefix(mediaSection, 'a=candidate:')
                  .map(function(cand) {
                    return SDPUtils.parseCandidate(cand);
                  })
                  .filter(function(cand) {
                    return cand.component === '1';
                  });
                  // ice-lite only includes host candidates in the SDP so we can
                  // use setRemoteCandidates (which implies an
                  // RTCIceCandidateComplete)
                  if (cands.length) {
                    iceTransport.setRemoteCandidates(cands);
                  }
                }
                var remoteDtlsParameters = SDPUtils.getDtlsParameters(
                    mediaSection, sessionpart);
                if (isIceLite) {
                  remoteDtlsParameters.role = 'server';
                }

                if (!self.usingBundle || sdpMLineIndex === 0) {
                  iceTransport.start(iceGatherer, remoteIceParameters,
                      isIceLite ? 'controlling' : 'controlled');
                  dtlsTransport.start(remoteDtlsParameters);
                }

                // Calculate intersection of capabilities.
                var params = self._getCommonCapabilities(localCapabilities,
                    remoteCapabilities);

                // Start the RTCRtpSender. The RTCRtpReceiver for this
                // transceiver has already been started in setRemoteDescription.
                self._transceive(transceiver,
                    params.codecs.length > 0,
                    false);
              }
            });
          }

          this.localDescription = {
            type: description.type,
            sdp: description.sdp
          };
          switch (description.type) {
          case 'offer':
            this._updateSignalingState('have-local-offer');
            break;
          case 'answer':
            this._updateSignalingState('stable');
            break;
          default:
            throw new TypeError('unsupported type "' + description.type +
                  '"');
          }

          // If a success callback was provided, emit ICE candidates after it
          // has been executed. Otherwise, emit callback after the Promise is
          // resolved.
          var hasCallback = arguments.length > 1 &&
            typeof arguments[1] === 'function';
          if (hasCallback) {
            var cb = arguments[1];
            window.setTimeout(function() {
              cb();
              if (self.iceGatheringState === 'new') {
                self.iceGatheringState = 'gathering';
              }
              self._emitBufferedCandidates();
            }, 0);
          }
          var p = Promise.resolve();
          p.then(function() {
            if (!hasCallback) {
              if (self.iceGatheringState === 'new') {
                self.iceGatheringState = 'gathering';
              }
              // Usually candidates will be emitted earlier.
              window.setTimeout(self._emitBufferedCandidates.bind(self), 500);
            }
          });
          return p;
        };

      window.RTCPeerConnection.prototype.setRemoteDescription =
        function(description) {
          var self = this;
          var stream = new MediaStream();
          var receiverList = [];
          var sections = SDPUtils.splitSections(description.sdp);
          var sessionpart = sections.shift();
          var isIceLite = SDPUtils.matchPrefix(sessionpart,
              'a=ice-lite').length > 0;
          this.usingBundle = SDPUtils.matchPrefix(sessionpart,
              'a=group:BUNDLE ').length > 0;
          sections.forEach(function(mediaSection, sdpMLineIndex) {
            var lines = SDPUtils.splitLines(mediaSection);
            var mline = lines[0].substr(2).split(' ');
            var kind = mline[0];
            var rejected = mline[1] === '0';
            var direction = SDPUtils.getDirection(mediaSection, sessionpart);

            var transceiver;
            var iceGatherer;
            var iceTransport;
            var dtlsTransport;
            var rtpSender;
            var rtpReceiver;
            var sendEncodingParameters;
            var recvEncodingParameters;
            var localCapabilities;

            var track;
            // FIXME: ensure the mediaSection has rtcp-mux set.
            var remoteCapabilities = SDPUtils.parseRtpParameters(mediaSection);
            var remoteIceParameters;
            var remoteDtlsParameters;
            if (!rejected) {
              remoteIceParameters = SDPUtils.getIceParameters(mediaSection,
                  sessionpart);
              remoteDtlsParameters = SDPUtils.getDtlsParameters(mediaSection,
                  sessionpart);
              remoteDtlsParameters.role = 'client';
            }
            recvEncodingParameters =
                SDPUtils.parseRtpEncodingParameters(mediaSection);

            var mid = SDPUtils.matchPrefix(mediaSection, 'a=mid:');
            if (mid.length) {
              mid = mid[0].substr(6);
            } else {
              mid = SDPUtils.generateIdentifier();
            }

            var cname;
            // Gets the first SSRC. Note that with RTX there might be multiple
            // SSRCs.
            var remoteSsrc = SDPUtils.matchPrefix(mediaSection, 'a=ssrc:')
                .map(function(line) {
                  return SDPUtils.parseSsrcMedia(line);
                })
                .filter(function(obj) {
                  return obj.attribute === 'cname';
                })[0];
            if (remoteSsrc) {
              cname = remoteSsrc.value;
            }

            var isComplete = SDPUtils.matchPrefix(mediaSection,
                'a=end-of-candidates', sessionpart).length > 0;
            var cands = SDPUtils.matchPrefix(mediaSection, 'a=candidate:')
                .map(function(cand) {
                  return SDPUtils.parseCandidate(cand);
                })
                .filter(function(cand) {
                  return cand.component === '1';
                });
            if (description.type === 'offer' && !rejected) {
              var transports = self.usingBundle && sdpMLineIndex > 0 ? {
                iceGatherer: self.transceivers[0].iceGatherer,
                iceTransport: self.transceivers[0].iceTransport,
                dtlsTransport: self.transceivers[0].dtlsTransport
              } : self._createIceAndDtlsTransports(mid, sdpMLineIndex);

              if (isComplete) {
                transports.iceTransport.setRemoteCandidates(cands);
              }

              localCapabilities = RTCRtpReceiver.getCapabilities(kind);
              sendEncodingParameters = [{
                ssrc: (2 * sdpMLineIndex + 2) * 1001
              }];

              rtpReceiver = new RTCRtpReceiver(transports.dtlsTransport, kind);

              track = rtpReceiver.track;
              receiverList.push([track, rtpReceiver]);
              // FIXME: not correct when there are multiple streams but that is
              // not currently supported in this shim.
              stream.addTrack(track);

              // FIXME: look at direction.
              if (self.localStreams.length > 0 &&
                  self.localStreams[0].getTracks().length >= sdpMLineIndex) {
                var localTrack;
                if (kind === 'audio') {
                  localTrack = self.localStreams[0].getAudioTracks()[0];
                } else if (kind === 'video') {
                  localTrack = self.localStreams[0].getVideoTracks()[0];
                }
                if (localTrack) {
                  rtpSender = new RTCRtpSender(localTrack,
                      transports.dtlsTransport);
                }
              }

              self.transceivers[sdpMLineIndex] = {
                iceGatherer: transports.iceGatherer,
                iceTransport: transports.iceTransport,
                dtlsTransport: transports.dtlsTransport,
                localCapabilities: localCapabilities,
                remoteCapabilities: remoteCapabilities,
                rtpSender: rtpSender,
                rtpReceiver: rtpReceiver,
                kind: kind,
                mid: mid,
                cname: cname,
                sendEncodingParameters: sendEncodingParameters,
                recvEncodingParameters: recvEncodingParameters
              };
              // Start the RTCRtpReceiver now. The RTPSender is started in
              // setLocalDescription.
              self._transceive(self.transceivers[sdpMLineIndex],
                  false,
                  direction === 'sendrecv' || direction === 'sendonly');
            } else if (description.type === 'answer' && !rejected) {
              transceiver = self.transceivers[sdpMLineIndex];
              iceGatherer = transceiver.iceGatherer;
              iceTransport = transceiver.iceTransport;
              dtlsTransport = transceiver.dtlsTransport;
              rtpSender = transceiver.rtpSender;
              rtpReceiver = transceiver.rtpReceiver;
              sendEncodingParameters = transceiver.sendEncodingParameters;
              localCapabilities = transceiver.localCapabilities;

              self.transceivers[sdpMLineIndex].recvEncodingParameters =
                  recvEncodingParameters;
              self.transceivers[sdpMLineIndex].remoteCapabilities =
                  remoteCapabilities;
              self.transceivers[sdpMLineIndex].cname = cname;

              if ((isIceLite || isComplete) && cands.length) {
                iceTransport.setRemoteCandidates(cands);
              }
              if (!self.usingBundle || sdpMLineIndex === 0) {
                iceTransport.start(iceGatherer, remoteIceParameters,
                    'controlling');
                dtlsTransport.start(remoteDtlsParameters);
              }

              self._transceive(transceiver,
                  direction === 'sendrecv' || direction === 'recvonly',
                  direction === 'sendrecv' || direction === 'sendonly');

              if (rtpReceiver &&
                  (direction === 'sendrecv' || direction === 'sendonly')) {
                track = rtpReceiver.track;
                receiverList.push([track, rtpReceiver]);
                stream.addTrack(track);
              } else {
                // FIXME: actually the receiver should be created later.
                delete transceiver.rtpReceiver;
              }
            }
          });

          this.remoteDescription = {
            type: description.type,
            sdp: description.sdp
          };
          switch (description.type) {
          case 'offer':
            this._updateSignalingState('have-remote-offer');
            break;
          case 'answer':
            this._updateSignalingState('stable');
            break;
          default:
            throw new TypeError('unsupported type "' + description.type +
                  '"');
          }
          if (stream.getTracks().length) {
            self.remoteStreams.push(stream);
            window.setTimeout(function() {
              var event = new Event('addstream');
              event.stream = stream;
              self.dispatchEvent(event);
              if (self.onaddstream !== null) {
                window.setTimeout(function() {
                  self.onaddstream(event);
                }, 0);
              }

              receiverList.forEach(function(item) {
                var track = item[0];
                var receiver = item[1];
                var trackEvent = new Event('track');
                trackEvent.track = track;
                trackEvent.receiver = receiver;
                trackEvent.streams = [stream];
                self.dispatchEvent(event);
                if (self.ontrack !== null) {
                  window.setTimeout(function() {
                    self.ontrack(trackEvent);
                  }, 0);
                }
              });
            }, 0);
          }
          if (arguments.length > 1 && typeof arguments[1] === 'function') {
            window.setTimeout(arguments[1], 0);
          }
          return Promise.resolve();
        };

      window.RTCPeerConnection.prototype.close = function() {
        this.transceivers.forEach(function(transceiver) {
        /* not yet
        if (transceiver.iceGatherer) {
          transceiver.iceGatherer.close();
        }
        */
          if (transceiver.iceTransport) {
            transceiver.iceTransport.stop();
          }
          if (transceiver.dtlsTransport) {
            transceiver.dtlsTransport.stop();
          }
          if (transceiver.rtpSender) {
            transceiver.rtpSender.stop();
          }
          if (transceiver.rtpReceiver) {
            transceiver.rtpReceiver.stop();
          }
        });
      // FIXME: clean up tracks, local streams, remote streams, etc
        this._updateSignalingState('closed');
      };

    // Update the signaling state.
      window.RTCPeerConnection.prototype._updateSignalingState =
        function(newState) {
          this.signalingState = newState;
          var event = new Event('signalingstatechange');
          this.dispatchEvent(event);
          if (this.onsignalingstatechange !== null) {
            this.onsignalingstatechange(event);
          }
        };

    // Determine whether to fire the negotiationneeded event.
      window.RTCPeerConnection.prototype._maybeFireNegotiationNeeded =
        function() {
          // Fire away (for now).
          var event = new Event('negotiationneeded');
          this.dispatchEvent(event);
          if (this.onnegotiationneeded !== null) {
            this.onnegotiationneeded(event);
          }
        };

    // Update the connection state.
      window.RTCPeerConnection.prototype._updateConnectionState = function() {
        var self = this;
        var newState;
        var states = {
          'new': 0,
          closed: 0,
          connecting: 0,
          checking: 0,
          connected: 0,
          completed: 0,
          failed: 0
        };
        this.transceivers.forEach(function(transceiver) {
          states[transceiver.iceTransport.state]++;
          states[transceiver.dtlsTransport.state]++;
        });
      // ICETransport.completed and connected are the same for this purpose.
        states.connected += states.completed;

        newState = 'new';
        if (states.failed > 0) {
          newState = 'failed';
        } else if (states.connecting > 0 || states.checking > 0) {
          newState = 'connecting';
        } else if (states.disconnected > 0) {
          newState = 'disconnected';
        } else if (states.new > 0) {
          newState = 'new';
        } else if (states.connected > 0 || states.completed > 0) {
          newState = 'connected';
        }

        if (newState !== self.iceConnectionState) {
          self.iceConnectionState = newState;
          var event = new Event('iceconnectionstatechange');
          this.dispatchEvent(event);
          if (this.oniceconnectionstatechange !== null) {
            this.oniceconnectionstatechange(event);
          }
        }
      };

      window.RTCPeerConnection.prototype.createOffer = function() {
        var self = this;
        if (this._pendingOffer) {
          throw new Error('createOffer called while there is a pending offer.');
        }
        var offerOptions;
        if (arguments.length === 1 && typeof arguments[0] !== 'function') {
          offerOptions = arguments[0];
        } else if (arguments.length === 3) {
          offerOptions = arguments[2];
        }

        var tracks = [];
        var numAudioTracks = 0;
        var numVideoTracks = 0;
      // Default to sendrecv.
        if (this.localStreams.length) {
          numAudioTracks = this.localStreams[0].getAudioTracks().length;
          numVideoTracks = this.localStreams[0].getVideoTracks().length;
        }
      // Determine number of audio and video tracks we need to send/recv.
        if (offerOptions) {
        // Reject Chrome legacy constraints.
          if (offerOptions.mandatory || offerOptions.optional) {
            throw new TypeError(
              'Legacy mandatory/optional constraints not supported.');
          }
          if (offerOptions.offerToReceiveAudio !== undefined) {
            numAudioTracks = offerOptions.offerToReceiveAudio;
          }
          if (offerOptions.offerToReceiveVideo !== undefined) {
            numVideoTracks = offerOptions.offerToReceiveVideo;
          }
        }
        if (this.localStreams.length) {
        // Push local streams.
          this.localStreams[0].getTracks().forEach(function(track) {
            tracks.push({
              kind: track.kind,
              track: track,
              wantReceive: track.kind === 'audio' ?
                numAudioTracks > 0 : numVideoTracks > 0
            });
            if (track.kind === 'audio') {
              numAudioTracks--;
            } else if (track.kind === 'video') {
              numVideoTracks--;
            }
          });
        }
      // Create M-lines for recvonly streams.
        while (numAudioTracks > 0 || numVideoTracks > 0) {
          if (numAudioTracks > 0) {
            tracks.push({
              kind: 'audio',
              wantReceive: true
            });
            numAudioTracks--;
          }
          if (numVideoTracks > 0) {
            tracks.push({
              kind: 'video',
              wantReceive: true
            });
            numVideoTracks--;
          }
        }

        var sdp = SDPUtils.writeSessionBoilerplate();
        var transceivers = [];
        tracks.forEach(function(mline, sdpMLineIndex) {
        // For each track, create an ice gatherer, ice transport,
        // dtls transport, potentially rtpsender and rtpreceiver.
          var track = mline.track;
          var kind = mline.kind;
          var mid = SDPUtils.generateIdentifier();

          var transports = self.usingBundle && sdpMLineIndex > 0 ? {
            iceGatherer: transceivers[0].iceGatherer,
            iceTransport: transceivers[0].iceTransport,
            dtlsTransport: transceivers[0].dtlsTransport
          } : self._createIceAndDtlsTransports(mid, sdpMLineIndex);

          var localCapabilities = RTCRtpSender.getCapabilities(kind);
          var rtpSender;
          var rtpReceiver;

        // generate an ssrc now, to be used later in rtpSender.send
          var sendEncodingParameters = [{
            ssrc: (2 * sdpMLineIndex + 1) * 1001
          }];
          if (track) {
            rtpSender = new RTCRtpSender(track, transports.dtlsTransport);
          }

          if (mline.wantReceive) {
            rtpReceiver = new RTCRtpReceiver(transports.dtlsTransport, kind);
          }

          transceivers[sdpMLineIndex] = {
            iceGatherer: transports.iceGatherer,
            iceTransport: transports.iceTransport,
            dtlsTransport: transports.dtlsTransport,
            localCapabilities: localCapabilities,
            remoteCapabilities: null,
            rtpSender: rtpSender,
            rtpReceiver: rtpReceiver,
            kind: kind,
            mid: mid,
            sendEncodingParameters: sendEncodingParameters,
            recvEncodingParameters: null
          };
        });
        if (this.usingBundle) {
          sdp += 'a=group:BUNDLE ' + transceivers.map(function(t) {
            return t.mid;
          }).join(' ') + '\r\n';
        }
        tracks.forEach(function(mline, sdpMLineIndex) {
          var transceiver = transceivers[sdpMLineIndex];
          sdp += SDPUtils.writeMediaSection(transceiver,
            transceiver.localCapabilities, 'offer', self.localStreams[0]);
        });

        this._pendingOffer = transceivers;
        var desc = new RTCSessionDescription({
          type: 'offer',
          sdp: sdp
        });
        if (arguments.length && typeof arguments[0] === 'function') {
          window.setTimeout(arguments[0], 0, desc);
        }
        return Promise.resolve(desc);
      };

      window.RTCPeerConnection.prototype.createAnswer = function() {
        var self = this;

        var sdp = SDPUtils.writeSessionBoilerplate();
        if (this.usingBundle) {
          sdp += 'a=group:BUNDLE ' + this.transceivers.map(function(t) {
            return t.mid;
          }).join(' ') + '\r\n';
        }
        this.transceivers.forEach(function(transceiver) {
        // Calculate intersection of capabilities.
          var commonCapabilities = self._getCommonCapabilities(
            transceiver.localCapabilities,
            transceiver.remoteCapabilities);

          sdp += SDPUtils.writeMediaSection(transceiver, commonCapabilities,
            'answer', self.localStreams[0]);
        });

        var desc = new RTCSessionDescription({
          type: 'answer',
          sdp: sdp
        });
        if (arguments.length && typeof arguments[0] === 'function') {
          window.setTimeout(arguments[0], 0, desc);
        }
        return Promise.resolve(desc);
      };

      window.RTCPeerConnection.prototype.addIceCandidate = function(candidate) {
        if (candidate === null) {
          this.transceivers.forEach(function(transceiver) {
            transceiver.iceTransport.addRemoteCandidate({});
          });
        } else {
          var mLineIndex = candidate.sdpMLineIndex;
          if (candidate.sdpMid) {
            for (var i = 0; i < this.transceivers.length; i++) {
              if (this.transceivers[i].mid === candidate.sdpMid) {
                mLineIndex = i;
                break;
              }
            }
          }
          var transceiver = this.transceivers[mLineIndex];
          if (transceiver) {
            var cand = Object.keys(candidate.candidate).length > 0 ?
              SDPUtils.parseCandidate(candidate.candidate) : {};
          // Ignore Chrome's invalid candidates since Edge does not like them.
            if (cand.protocol === 'tcp' && (cand.port === 0 || cand.port === 9)) {
              return;
            }
          // Ignore RTCP candidates, we assume RTCP-MUX.
            if (cand.component !== '1') {
              return;
            }
          // A dirty hack to make samples work.
            if (cand.type === 'endOfCandidates') {
              cand = {};
            }
            transceiver.iceTransport.addRemoteCandidate(cand);

          // update the remoteDescription.
            var sections = SDPUtils.splitSections(this.remoteDescription.sdp);
            sections[mLineIndex + 1] += (cand.type ? candidate.candidate.trim()
              : 'a=end-of-candidates') + '\r\n';
            this.remoteDescription.sdp = sections.join('');
          }
        }
        if (arguments.length > 1 && typeof arguments[1] === 'function') {
          window.setTimeout(arguments[1], 0);
        }
        return Promise.resolve();
      };

      window.RTCPeerConnection.prototype.getStats = function() {
        var promises = [];
        this.transceivers.forEach(function(transceiver) {
          ['rtpSender', 'rtpReceiver', 'iceGatherer', 'iceTransport',
            'dtlsTransport'].forEach(function(method) {
              if (transceiver[method]) {
                promises.push(transceiver[method].getStats());
              }
            });
        });
        var cb = arguments.length > 1 && typeof arguments[1] === 'function' &&
          arguments[1];
        return new Promise(function(resolve) {
        // shim getStats with maplike support
          var results = new Map();
          Promise.all(promises).then(function(res) {
            res.forEach(function(result) {
              Object.keys(result).forEach(function(id) {
                results.set(id, result[id]);
                results[id] = result[id];
              });
            });
            if (cb) {
              window.setTimeout(cb, 0, results);
            }
            resolve(results);
          });
        });
      };
    }
  };

// Expose public methods.
  module.exports = {
    shimPeerConnection: edgeShim.shimPeerConnection,
    shimGetUserMedia: require('./getusermedia')
  };

},{'../utils':10,'./getusermedia':6,'sdp':1}],6:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */
  'use strict';

// Expose public methods.
  module.exports = function() {
    var shimError_ = function(e) {
      return {
        name: {PermissionDeniedError: 'NotAllowedError'}[e.name] || e.name,
        message: e.message,
        constraint: e.constraint,
        toString: function() {
          return this.name;
        }
      };
    };

  // getUserMedia error shim.
    var origGetUserMedia = navigator.mediaDevices.getUserMedia.
      bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function(c) {
      return origGetUserMedia(c).catch(function(e) {
        return Promise.reject(shimError_(e));
      });
    };
  };

},{}],7:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */
  'use strict';

  var browserDetails = require('../utils').browserDetails;

  var firefoxShim = {
    shimOnTrack: function() {
      if (typeof window === 'object' && window.RTCPeerConnection && !('ontrack' in
        window.RTCPeerConnection.prototype)) {
        Object.defineProperty(window.RTCPeerConnection.prototype, 'ontrack', {
          get: function() {
            return this._ontrack;
          },
          set: function(f) {
            if (this._ontrack) {
              this.removeEventListener('track', this._ontrack);
              this.removeEventListener('addstream', this._ontrackpoly);
            }
            this.addEventListener('track', this._ontrack = f);
            this.addEventListener('addstream', this._ontrackpoly = function(e) {
              e.stream.getTracks().forEach(function(track) {
                var event = new Event('track');
                event.track = track;
                event.receiver = {track: track};
                event.streams = [e.stream];
                this.dispatchEvent(event);
              }.bind(this));
            }.bind(this));
          }
        });
      }
    },

    shimSourceObject: function() {
    // Firefox has supported mozSrcObject since FF22, unprefixed in 42.
      if (typeof window === 'object') {
        if (window.HTMLMediaElement &&
        !('srcObject' in window.HTMLMediaElement.prototype)) {
        // Shim the srcObject property, once, when HTMLMediaElement is found.
          Object.defineProperty(window.HTMLMediaElement.prototype, 'srcObject', {
            get: function() {
              return this.mozSrcObject;
            },
            set: function(stream) {
              this.mozSrcObject = stream;
            }
          });
        }
      }
    },

    shimPeerConnection: function() {
      if (typeof window !== 'object' || !(window.RTCPeerConnection ||
        window.mozRTCPeerConnection)) {
        return; // probably media.peerconnection.enabled=false in about:config
      }
    // The RTCPeerConnection object.
      if (!window.RTCPeerConnection) {
        window.RTCPeerConnection = function(pcConfig, pcConstraints) {
          if (browserDetails.version < 38) {
          // .urls is not supported in FF < 38.
          // create RTCIceServers with a single url.
            if (pcConfig && pcConfig.iceServers) {
              var newIceServers = [];
              for (var i = 0; i < pcConfig.iceServers.length; i++) {
                var server = pcConfig.iceServers[i];
                if (server.hasOwnProperty('urls')) {
                  for (var j = 0; j < server.urls.length; j++) {
                    var newServer = {
                    url: server.urls[j]
                  };
                    if (server.urls[j].indexOf('turn') === 0) {
                    newServer.username = server.username;
                    newServer.credential = server.credential;
                  }
                    newIceServers.push(newServer);
                  }
                } else {
                  newIceServers.push(pcConfig.iceServers[i]);
                }
              }
              pcConfig.iceServers = newIceServers;
            }
          }
          return new mozRTCPeerConnection(pcConfig, pcConstraints);
        };
        window.RTCPeerConnection.prototype = mozRTCPeerConnection.prototype;

      // wrap static methods. Currently just generateCertificate.
        if (mozRTCPeerConnection.generateCertificate) {
          Object.defineProperty(window.RTCPeerConnection, 'generateCertificate', {
            get: function() {
              return mozRTCPeerConnection.generateCertificate;
            }
          });
        }

        window.RTCSessionDescription = mozRTCSessionDescription;
        window.RTCIceCandidate = mozRTCIceCandidate;
      }

    // shim away need for obsolete RTCIceCandidate/RTCSessionDescription.
      ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate']
        .forEach(function(method) {
          var nativeMethod = RTCPeerConnection.prototype[method];
          RTCPeerConnection.prototype[method] = function() {
            arguments[0] = new ((method === 'addIceCandidate') ?
                RTCIceCandidate : RTCSessionDescription)(arguments[0]);
            return nativeMethod.apply(this, arguments);
          };
        });

    // support for addIceCandidate(null)
      var nativeAddIceCandidate =
        RTCPeerConnection.prototype.addIceCandidate;
      RTCPeerConnection.prototype.addIceCandidate = function() {
        return arguments[0] === null ? Promise.resolve()
          : nativeAddIceCandidate.apply(this, arguments);
      };

    // shim getStats with maplike support
      var makeMapStats = function(stats) {
        var map = new Map();
        Object.keys(stats).forEach(function(key) {
          map.set(key, stats[key]);
          map[key] = stats[key];
        });
        return map;
      };

      var nativeGetStats = RTCPeerConnection.prototype.getStats;
      RTCPeerConnection.prototype.getStats = function(selector, onSucc, onErr) {
        return nativeGetStats.apply(this, [selector || null])
        .then(function(stats) {
          return makeMapStats(stats);
        })
        .then(onSucc, onErr);
      };
    }
  };

// Expose public methods.
  module.exports = {
    shimOnTrack: firefoxShim.shimOnTrack,
    shimSourceObject: firefoxShim.shimSourceObject,
    shimPeerConnection: firefoxShim.shimPeerConnection,
    shimGetUserMedia: require('./getusermedia')
  };

},{'../utils':10,'./getusermedia':8}],8:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */
  'use strict';

  var logging = require('../utils').log;
  var browserDetails = require('../utils').browserDetails;

// Expose public methods.
  module.exports = function() {
    var shimError_ = function(e) {
      return {
        name: {
          SecurityError: 'NotAllowedError',
          PermissionDeniedError: 'NotAllowedError'
        }[e.name] || e.name,
        message: {
          'The operation is insecure.': 'The request is not allowed by the ' +
        'user agent or the platform in the current context.'
        }[e.message] || e.message,
        constraint: e.constraint,
        toString: function() {
          return this.name + (this.message && ': ') + this.message;
        }
      };
    };

  // getUserMedia constraints shim.
    var getUserMedia_ = function(constraints, onSuccess, onError) {
      var constraintsToFF37_ = function(c) {
        if (typeof c !== 'object' || c.require) {
          return c;
        }
        var require = [];
        Object.keys(c).forEach(function(key) {
          if (key === 'require' || key === 'advanced' || key === 'mediaSource') {
            return;
          }
          var r = c[key] = (typeof c[key] === 'object') ?
            c[key] : {ideal: c[key]};
          if (r.min !== undefined ||
            r.max !== undefined || r.exact !== undefined) {
            require.push(key);
          }
          if (r.exact !== undefined) {
            if (typeof r.exact === 'number') {
              r. min = r.max = r.exact;
            } else {
              c[key] = r.exact;
            }
            delete r.exact;
          }
          if (r.ideal !== undefined) {
            c.advanced = c.advanced || [];
            var oc = {};
            if (typeof r.ideal === 'number') {
              oc[key] = {min: r.ideal, max: r.ideal};
            } else {
              oc[key] = r.ideal;
            }
            c.advanced.push(oc);
            delete r.ideal;
            if (!Object.keys(r).length) {
              delete c[key];
            }
          }
        });
        if (require.length) {
          c.require = require;
        }
        return c;
      };
      constraints = JSON.parse(JSON.stringify(constraints));
      if (browserDetails.version < 38) {
        logging('spec: ' + JSON.stringify(constraints));
        if (constraints.audio) {
          constraints.audio = constraintsToFF37_(constraints.audio);
        }
        if (constraints.video) {
          constraints.video = constraintsToFF37_(constraints.video);
        }
        logging('ff37: ' + JSON.stringify(constraints));
      }
      return navigator.mozGetUserMedia(constraints, onSuccess, function(e) {
        onError(shimError_(e));
      });
    };

  // Returns the result of getUserMedia as a Promise.
    var getUserMediaPromise_ = function(constraints) {
      return new Promise(function(resolve, reject) {
        getUserMedia_(constraints, resolve, reject);
      });
    };

  // Shim for mediaDevices on older versions.
    if (!navigator.mediaDevices) {
      navigator.mediaDevices = {getUserMedia: getUserMediaPromise_,
      addEventListener: function() { },
      removeEventListener: function() { }
    };
    }
    navigator.mediaDevices.enumerateDevices =
      navigator.mediaDevices.enumerateDevices || function() {
        return new Promise(function(resolve) {
          var infos = [
            {kind: 'audioinput', deviceId: 'default', label: '', groupId: ''},
            {kind: 'videoinput', deviceId: 'default', label: '', groupId: ''}
          ];
          resolve(infos);
        });
      };

    if (browserDetails.version < 41) {
    // Work around http://bugzil.la/1169665
      var orgEnumerateDevices =
        navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
      navigator.mediaDevices.enumerateDevices = function() {
        return orgEnumerateDevices().then(undefined, function(e) {
          if (e.name === 'NotFoundError') {
            return [];
          }
          throw e;
        });
      };
    }
    if (browserDetails.version < 49) {
      var origGetUserMedia = navigator.mediaDevices.getUserMedia.
        bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = function(c) {
        return origGetUserMedia(c).catch(function(e) {
          return Promise.reject(shimError_(e));
        });
      };
    }
    navigator.getUserMedia = function(constraints, onSuccess, onError) {
      if (browserDetails.version < 44) {
        return getUserMedia_(constraints, onSuccess, onError);
      }
    // Replace Firefox 44+'s deprecation warning with unprefixed version.
      console.warn('navigator.getUserMedia has been replaced by ' +
                 'navigator.mediaDevices.getUserMedia');
      navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
    };
  };

},{'../utils':10}],9:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
  'use strict';
  var safariShim = {
  // TODO: DrAlex, should be here, double check against LayoutTests
  // shimOnTrack: function() { },

  // TODO: once the back-end for the mac port is done, add.
  // TODO: check for webkitGTK+
  // shimPeerConnection: function() { },

    shimGetUserMedia: function() {
      navigator.getUserMedia = navigator.webkitGetUserMedia;
    }
  };

// Expose public methods.
  module.exports = {
    shimGetUserMedia: safariShim.shimGetUserMedia
  // TODO
  // shimOnTrack: safariShim.shimOnTrack,
  // shimPeerConnection: safariShim.shimPeerConnection
  };

},{}],10:[function(require,module,exports){
/*
 *  Copyright (c) 2016 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
 /* eslint-env node */
  'use strict';

  var logDisabled_ = true;

// Utility methods.
  var utils = {
    disableLog: function(bool) {
      if (typeof bool !== 'boolean') {
        return new Error('Argument type: ' + typeof bool +
          '. Please use a boolean.');
      }
      logDisabled_ = bool;
      return (bool) ? 'adapter.js logging disabled' :
        'adapter.js logging enabled';
    },

    log: function() {
      if (typeof window === 'object') {
        if (logDisabled_) {
          return;
        }
        if (typeof console !== 'undefined' && typeof console.log === 'function') {
          console.log.apply(console, arguments);
        }
      }
    },

  /**
   * Extract browser version out of the provided user agent string.
   *
   * @param {!string} uastring userAgent string.
   * @param {!string} expr Regular expression used as match criteria.
   * @param {!number} pos position in the version string to be returned.
   * @return {!number} browser version.
   */
    extractVersion: function(uastring, expr, pos) {
      var match = uastring.match(expr);
      return match && match.length >= pos && parseInt(match[pos], 10);
    },

  /**
   * Browser detector.
   *
   * @return {object} result containing browser and version
   *     properties.
   */
    detectBrowser: function() {
    // Returned result object.
      var result = {};
      result.browser = null;
      result.version = null;

    // Fail early if it's not a browser
      if (typeof window === 'undefined' || !window.navigator) {
        result.browser = 'Not a browser.';
        return result;
      }

    // Firefox.
      if (navigator.mozGetUserMedia) {
        result.browser = 'firefox';
        result.version = this.extractVersion(navigator.userAgent,
          /Firefox\/([0-9]+)\./, 1);

    // all webkit-based browsers
      } else if (navigator.webkitGetUserMedia) {
      // Chrome, Chromium, Webview, Opera, all use the chrome shim for now
        if (window.webkitRTCPeerConnection) {
          result.browser = 'chrome';
          result.version = this.extractVersion(navigator.userAgent,
          /Chrom(e|ium)\/([0-9]+)\./, 2);

      // Safari or unknown webkit-based
      // for the time being Safari has support for MediaStreams but not webRTC
        } else {
        // Safari UA substrings of interest for reference:
        // - webkit version:           AppleWebKit/602.1.25 (also used in Op,Cr)
        // - safari UI version:        Version/9.0.3 (unique to Safari)
        // - safari UI webkit version: Safari/601.4.4 (also used in Op,Cr)
        //
        // if the webkit version and safari UI webkit versions are equals,
        // ... this is a stable version.
        //
        // only the internal webkit version is important today to know if
        // media streams are supported
        //
          if (navigator.userAgent.match(/Version\/(\d+).(\d+)/)) {
            result.browser = 'safari';
            result.version = this.extractVersion(navigator.userAgent,
            /AppleWebKit\/([0-9]+)\./, 1);

        // unknown webkit-based browser
          } else {
            result.browser = 'Unsupported webkit-based browser ' +
              'with GUM support but no WebRTC support.';
            return result;
          }
        }

    // Edge.
      } else if (navigator.mediaDevices &&
        navigator.userAgent.match(/Edge\/(\d+).(\d+)$/)) {
        result.browser = 'edge';
        result.version = this.extractVersion(navigator.userAgent,
          /Edge\/(\d+).(\d+)$/, 2);

    // Default fallthrough: not supported.
      } else {
        result.browser = 'Not a supported browser.';
        return result;
      }

      return result;
    }
  };

// Export.
  module.exports = {
    log: utils.log,
    disableLog: utils.disableLog,
    browserDetails: utils.detectBrowser(),
    extractVersion: utils.extractVersion
  };

},{}]},{},[2])(2);
});

/**
 * @fileOverview Better Autocomplete is a flexible jQuery plugin which offers
 * rich text autocompletion, both from local and remote sources.
 *
 * @author Didrik Nordström, http://betamos.se/
 *
 * @version v1.0-dev
 *
 * @requires
 *   <ul><li>
 *   jQuery 1.4+
 *   </li><li>
 *   IE7+ or any decent webkit/gecko-based web browser
 *   </li></ul>
 *
 * @preserve Better Autocomplete v1.0-dev
 * https://github.com/betamos/Better-Autocomplete
 *
 * Copyright 2011, Didrik Nordström, http://betamos.se/
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Requires jQuery 1.4+
 * http://jquery.com/
 */

/**
 * Create or alter an autocomplete object instance that belongs to
 * the elements in the selection. Make sure there are only text field elements
 * in the selection.
 *
 * @constructor
 *
 * @name jQuery.betterAutocomplete
 *
 * @param {String} method
 *   Should be one of the following:
 *   <ul><li>
 *     init: Initiate Better Autocomplete instances on the text input elements
 *     in the current jQuery selection. They are enabled by default. The other
 *     parameters are then required.
 *   </li><li>
 *     enable: In this jQuery selection, reenable the Better Autocomplete
 *     instances.
 *   </li><li>
 *     disable: In this jQuery selection, disable the Better Autocomplete
 *     instances.
 *   </li><li>
 *     destroy: In this jQuery selection, destroy the Better Autocomplete
 *     instances. It will not be possible to reenable them after this.
 *   </li></ul>
 *
 * @param {String|Object} [resource]
 *   If String, it will become the path for a remote resource. If not, it will
 *   be treated like a local resource. The path should provide JSON objects
 *   upon HTTP requests.
 *
 * @param {Object} [options]
 *   An object with configurable options:
 *   <ul><li>
 *     charLimit: (default=3 for remote or 1 for local resource) The minimum
 *     number of chars to do an AJAX call. A typical use case for this limit is
 *     to reduce server load.
 *   </li><li>
 *     delay: (default=350) The time in ms between last keypress and AJAX call.
 *     Typically used to prevent looking up irrelevant strings while the user
 *     is still typing. Only relevant for remote resources.
 *   </li><li>
 *     caseSensitive: (default=false) If the search should be case sensitive.
 *     If false, query strings will be converted to lowercase.
 *   </li><li>
 *     cacheLimit: (default=256 for remote or 0 for local resource) The maximum
 *     number of result objects to store in the cache. This option reduces
 *     server load if the user deletes characters to check back on previous
 *     results. To disable caching of previous results, set this option to 0.
 *   </li><li>
 *     remoteTimeout: (default=10000) The timeout for remote (AJAX) calls.
 *   </li><li>
 *     crossOrigin: (default=false) Set to true if cross origin requests will
 *     be performed, i.e. that the remote URL has a different domain. This will
 *     force Internet Explorer to use "jsonp" instead of "json" as datatype.
 *   </li><li>
 *     selectKeys: (default=[9, 13]) The key codes for keys which will select
 *     the current highlighted element. The defaults are tab, enter.
 *   </li><li>
 *     autoHighlight: (default=true) Automatically highlight the first result.
 *   </li></ul>
 *
 * @param {Object} [callbacks]
 *   An object containing optional callback functions on certain events. See
 *   {@link callbacks} for details. These callbacks should be used when
 *   customization of the default behavior of Better Autocomplete is required.
 *
 * @returns {Object}
 *   The jQuery object with the same element selection, for chaining.
 */

(function($) {

  $.fn.betterAutocomplete = function(method) {

  /*
   * Each method expects the "this" object to be a valid DOM text input node.
   * The methods "enable", "disable" and "destroy" expects an instance of a
   * BetterAutocomplete object as their first argument.
   */
    var methods = {
        init: function(resource, options, callbacks) {
          var $input = $(this),
            bac = new BetterAutocomplete($input, resource, options, callbacks);
          $input.data('better-autocomplete', bac);
          bac.enable();
        },
        enable: function(bac) {
          bac.enable();
        },
        disable: function(bac) {
          bac.disable();
        },
        destroy: function(bac) {
          bac.destroy();
        }
      }, args = Array.prototype.slice.call(arguments, 1);

  // Method calling logic
    this.each(function() {
      switch (method) {
      case 'init':
        methods[method].apply(this, args);
        break;
      case 'enable':
      case 'disable':
      case 'destroy':
        var bac = $(this).data('better-autocomplete');
        if (bac instanceof BetterAutocomplete) {
          methods[method].call(this, bac);
        }
        break;
      default:
        $.error(['Method', method,
          'does not exist in jQuery.betterAutocomplete.'].join(' '));
      }
    });

  // Maintain chainability
    return this;
  };

/**
 * The BetterAutocomplete constructor function. Returns a BetterAutocomplete
 * instance object.
 *
 * @private @constructor
 * @name BetterAutocomplete
 *
 * @param {Object} $input
 *   A single input element wrapped in jQuery.
 */
  var BetterAutocomplete = function($input, resource, options, callbacks) {

    var lastRenderedQuery = '',
      cache = {}, // Key-valued caching of search results
      cacheOrder = [], // Array of query strings, in the order they are added
      cacheSize = 0, // Keep count of the cache's size
      timer, // Used for options.delay
      activeRemoteCalls = [], // A flat array of query strings that are pending
      disableMouseHighlight = false, // Suppress the autotriggered mouseover event
      inputEvents = {},
      isLocal = ($.type(resource) != 'string'),
      $results = $('<ul />').addClass('better-autocomplete'),
      $ariaLive = null,
      hiddenResults = true, // $results are hidden
      preventBlurTimer = null; // IE bug workaround, see below in code.

    options = $.extend({
      charLimit: isLocal ? 1 : 3,
      delay: 350, // milliseconds
      caseSensitive: false,
      cacheLimit: isLocal ? 0 : 256, // Number of result objects
      remoteTimeout: 10000, // milliseconds
      crossOrigin: false,
      selectKeys: [9, 13], // [tab, enter]
      autoHighlight: true // Automatically highlight the topmost result
    }, options);

    callbacks = $.extend({}, defaultCallbacks, callbacks);

    callbacks.insertSuggestionList($results, $input);

    inputEvents.focus = function() {
    // If the blur timer is active, a redraw is redundant.
      preventBlurTimer || redraw(true);
    };

    inputEvents.blur = function() {
    // If the blur prevention timer is active, refocus the input, since the
    // blur event can not be cancelled.
      if (preventBlurTimer) {
        $input.focus();
      }
      else {
      // The input has already lost focus, so redraw the suggestion list.
        redraw();
      }
    };

    inputEvents.keydown = function(event) {
      var index = getHighlightedIndex();
    // If an arrow key is pressed and a result is highlighted
      if ($.inArray(event.keyCode, [38, 40]) >= 0 && $results.children().length > 0) {
        var newIndex,
          size = $('.result', $results).length;
        switch (event.keyCode) {
        case 38: // Up arrow
          newIndex = Math.max(-1, index - 1);
          break;
        case 40: // Down arrow
          newIndex = Math.min(size - 1, index + 1);
          break;
        }
        disableMouseHighlight = true;
        setHighlighted(newIndex, 'key', true);
        return false;
      }
    // A select key has been pressed
      else if ($.inArray(event.keyCode, options.selectKeys) >= 0 &&
             !event.shiftKey && !event.ctrlKey && !event.altKey &&
             !event.metaKey) {
        select();
        return event.keyCode == 9; // Never cancel tab
      }
    };

    inputEvents.keyup = inputEvents.click = reprocess;

    $results.delegate('.result', {
    // When the user hovers a result with the mouse, highlight it.
      mouseenter: function() {
        if (disableMouseHighlight) {
          return;
        }
        setHighlighted($('.result', $results).index($(this)), 'mouse');
      },
      mousemove: function() {
      // Enable mouseover again.
        disableMouseHighlight = false;
      },
      mousedown: function() {
        select();
        return false;
      }
    });

  // Prevent blur when clicking on group titles, scrollbars etc.,
  // This event is triggered after the others because of bubbling.
    $results.mousedown(function() {
    // Bug in IE where clicking on scrollbar would trigger a blur event for the
    // input field, despite using preventDefault() on the mousedown event.
    // This workaround locks the blur event on the input for a small time.
      clearTimeout(preventBlurTimer);
      preventBlurTimer = setTimeout(function() {
        preventBlurTimer = null;
      }, 50);
      return false;
    });

  // If auto highlight is off, remove highlighting
    $results.mouseleave(function() {
      if (!options.autoHighlight) {
        setHighlighted(-1);
      }
    });

  /*
   * PUBLIC METHODS
   */

  /**
   * Enable this instance.
   */
    this.enable = function() {
    // Turn off the browser's autocompletion
      $input
      .attr('autocomplete', 'OFF')
      .attr('aria-autocomplete', 'list')
      .parent()
      .attr('role', 'application')
      .append($('<span class="better-autocomplete-aria"></span>').attr({
        'aria-live': 'assertive',
        'id': $input.attr('id') + '-autocomplete-aria-live'
      }));
      $input.bind(inputEvents);
      $ariaLive = $('#' + $input.attr('id') + '-autocomplete-aria-live');
    };

  /**
   * Disable this instance.
   */
    this.disable = function() {
      $input
      .removeAttr('autocomplete')
      .removeAttr('aria-autocomplete')
      .parent()
      .removeAttr('role');
      $results.hide();
      $ariaLive.empty();
      $input.unbind(inputEvents);
    };

  /**
   * Disable and remove this instance. This instance should not be reused.
   */
    this.destroy = function() {
      $results.remove();
      $ariaLive.remove();
      $input.unbind(inputEvents);
      $input.removeData('better-autocomplete');
    };

  /*
   * PRIVATE METHODS
   */

  /**
   * Add an array of results to the cache. Internal methods always reads from
   * the cache, so this method must be invoked even when caching is not used,
   * e.g. when using local results. This method automatically clears as much of
   * the cache as required to fit within the cache limit.
   *
   * @param {String} query
   *   The query to set the results to.
   *
   * @param {Array[Object]} results
   *   The array of results for this query.
   */
    var cacheResults = function(query, results) {
      cacheSize += results.length;
    // Now reduce size until it fits
      while (cacheSize > options.cacheLimit && cacheOrder.length) {
        var key = cacheOrder.shift();
        cacheSize -= cache[key].length;
        delete cache[key];
      }
      cacheOrder.push(query);
      cache[query] = results;
    };

  /**
   * Set highlight to a specific result item
   *
   * @param {Number} index
   *   The result item's index, or negative if highlight should be removed.
   *
   * @param {String} [trigger]
   *   What triggered the highlight: "mouse", "key" or "auto". If index is
   *   negative trigger may be omitted.
   *
   * @param {Boolean} [autoScroll]
   *   (default=false) If scrolling of the results list should be automated.
   */
    var setHighlighted = function(index, trigger, autoScroll) {
    //console.log('Index: '+index)
      var prevIndex = getHighlightedIndex(),
        $resultList = $('.result', $results);
    //console.log('prevIndex: '+prevIndex)
      $resultList.removeClass('highlight');

      if (index < 0) {
        return;
      }
      $resultList.eq(index).addClass('highlight');

      if (prevIndex != index) {
        $ariaLive.html($resultList.eq(index).html());
        var result = getResultByIndex(index);
        callbacks.highlight(result, $input, trigger);
      }

    // Scrolling
      var up = index == 0 || index < prevIndex,
        $scrollTo = $resultList.eq(index);

      if (!autoScroll) {
        return;
      }
    // Scrolling up, then make sure to show the group title
      if ($scrollTo.prev().is('.group') && up) {
        $scrollTo = $scrollTo.prev();
      }
    // Is $scrollTo partly above the visible region?
      if ($scrollTo.position().top < 0) {
        $results.scrollTop($scrollTo.position().top + $results.scrollTop());
      }
    // Or is it partly below the visible region?
      else if (($scrollTo.position().top + $scrollTo.outerHeight()) >
              $results.height()) {
        $results.scrollTop($scrollTo.position().top + $results.scrollTop() +
          $scrollTo.outerHeight() - $results.height());
      }
    };

  /**
   * Retrieve the index of the currently highlighted result item
   *
   * @returns {Number}
   *   The result's index or -1 if no result is highlighted.
   */
    var getHighlightedIndex = function() {
      var res = $('.result.highlight', $results);
      ind= $('.result', $results).index(res);
      return ind;
    };

  /**
   * Retrieve the result object with the specific position in the results list
   *
   * @param {Number} index
   *   The index of the item in the current result list.
   *
   * @returns {Object}
   *   The result object or null if index out of bounds.
   */
    var getResultByIndex = function(index) {
      var $result = $('.result', $results).eq(index);
      if (!$result.length) {
        return; // No selectable element
      }
      return $result.data('result');
    };

  /**
   * Select the current highlighted element, if any.
   */
    var select = function() {
      var highlighted = getHighlightedIndex();
      if(highlighted >= 0){
        var result = getResultByIndex(highlighted);
        callbacks.select(result, $input);
      // Redraw again, if the callback changed focus or content
        reprocess();
      }
    };

  /**
   * Fetch results asynchronously via AJAX.
   * Errors are ignored.
   *
   * @param {String} query
   *   The query string.
   */
    var fetchResults = function(query) {
    // Synchronously fetch local data
      if (isLocal) {
        cacheResults(query, callbacks.queryLocalResults(query, resource,
                                                      options.caseSensitive));
        redraw();
      }
    // Asynchronously fetch remote data
      else {
        activeRemoteCalls.push(query);
        var url = callbacks.constructURL(resource, query);
        $ariaLive.html('Searching for matches...');
        callbacks.beginFetching($input);
        callbacks.fetchRemoteData(url, function(data) {
          var searchResults = callbacks.processRemoteData(data);
          if (!$.isArray(searchResults)) {
            searchResults = [];
          }
          cacheResults(query, searchResults);
        // Remove the query from active remote calls, since it's finished
          activeRemoteCalls = $.grep(activeRemoteCalls, function(value) {
            return value != query;
          });
          if (!activeRemoteCalls.length) {
            callbacks.finishFetching($input);
          }
          redraw();
        }, options.remoteTimeout, options.crossOrigin);
      }
    };

  /**
   * Reprocess the contents of the input field, fetch data and redraw if
   * necessary.
   *
   * @param {Object} [event]
   *   The event that triggered the reprocessing. Not always present.
   */
    function reprocess(event) {
    // If this call was triggered by an arrow key, cancel the reprocessing.
      if ($.type(event) == 'object' && event.type == 'keyup' &&
        $.inArray(event.keyCode, [38, 40]) >= 0) {
        return;
      }
      var query = callbacks.canonicalQuery($input.val(), options.caseSensitive);
      clearTimeout(timer);
    // Indicate that timer is inactive
      timer = null;
      redraw();
      if (query.length >= options.charLimit && !$.isArray(cache[query]) &&
        $.inArray(query, activeRemoteCalls) == -1) {
      // Fetching is required
        $results.empty();
        if (isLocal) {
          fetchResults(query);
        }
        else {
          timer = setTimeout(function() {
            fetchResults(query);
            timer = null;
          }, options.delay);
        }
      }
    }

  /**
   * Redraws the autocomplete list based on current query and focus.
   *
   * @param {Boolean} [focus]
   *   (default=false) Force to treat the input element like it's focused.
   */
    var redraw = function(focus) {
      var query = callbacks.canonicalQuery($input.val(), options.caseSensitive);

    // The query does not exist in db
      if (!$.isArray(cache[query])) {
        lastRenderedQuery = null;
        $results.empty();
      }
    // The query exists and is not already rendered
      else if (lastRenderedQuery !== query) {
        lastRenderedQuery = query;
        renderResults(cache[query]);
      }
    // Finally show/hide based on focus and emptiness
      if (($input.is(':focus') || focus) && !$results.is(':empty')) {
        $results.filter(':hidden').show() // Show if hidden
        .scrollTop($results.data('scroll-top')); // Reset the lost scrolling
        if (hiddenResults) {
          hiddenResults = false;
          $ariaLive.html('Autocomplete popup');
          if (options.autoHighlight && $('.result', $results).length > 0) {
            setHighlighted(0, 'auto');
          }
          callbacks.afterShow($results);
        }
      }
      else if ($results.is(':visible')) {
      // Store the scrolling position for later
        $results.data('scroll-top', $results.scrollTop())
        .hide(); // Hiding it resets it's scrollTop
        if (!hiddenResults) {
          hiddenResults = true;
          $ariaLive.empty();
          callbacks.afterHide($results);
        }
      }
    };

  /**
   * Regenerate the DOM content within the results list for a given set of
   * results. Heavy method, use only when necessary.
   *
   * @param {Array[Object]} results
   *   An array of result objects to render.
   */
    var renderResults = function(results) {
      $results.empty();
      var groups = {}; // Key is the group name, value is the heading element.

      $.each(results, function(index, result) {
        if ($.type(result) != 'object') {
          return; // Continue
        }

        var output = callbacks.themeResult(result);
        if ($.type(output) != 'string') {
          return; // Continue
        }

      // Add the group if it doesn't exist
        var group = callbacks.getGroup(result);
        if ($.type(group) == 'string' && !groups[group]) {
          var $groupHeading = $('<li />').addClass('group')
          .append($('<h3 />').html(group))
          .appendTo($results);
          groups[group] = $groupHeading;
        }

        var $result = $('<li />').addClass('result')
        .append(output)
        .data('result', result) // Store the result object on this DOM element
        .addClass(result.addClass);

      // First groupless item
        if ($.type(group) != 'string' &&
          !$results.children().first().is('.result')) {
          $results.prepend($result);
          return; // Continue
        }
        var $traverseFrom = ($.type(group) == 'string') ?
                          groups[group] : $results.children().first();
        var $target = $traverseFrom.nextUntil('.group').last();
        $result.insertAfter($target.length ? $target : $traverseFrom);
      });
    };
  };

/*
 * CALLBACK METHODS
 */

/**
 * These callbacks are supposed to be overridden by you when you need
 * customization of the default behavior. When you are overriding a callback
 * function, it is a good idea to copy the source code from the default
 * callback function, as a skeleton.
 *
 * @name callbacks
 * @namespace
 */
  var defaultCallbacks = {
  /**
   * @lends callbacks.prototype
   */

  /**
   * Gets fired when the user selects a result by clicking or using the
   * keyboard to select an element.
   *
   * <br /><br /><em>Default behavior: Inserts the result's title into the
   * input field.</em>
   *
   * @param {Object} result
   *   The result object that was selected.
   *
   * @param {Object} $input
   *   The input DOM element, wrapped in jQuery.
   */
    select: function(result, $input) {
      $input.val(result.title);
    },

  /**
   * Gets fired when the a result is highlighted. This may happen either
   * automatically or by user action.
   *
   * <br /><br /><em>Default behavior: Does nothing.</em>
   *
   * @param {Object} result
   *   The result object that was selected.
   *
   * @param {Object} $input
   *   The input DOM element, wrapped in jQuery.
   *
   * @param {String} trigger
   *   The event which triggered the highlighting. Must be one of the
   *   following:
   *   <ul><li>
   *     "mouse": A mouseover event triggered the highlighting.
   *   </li><li>
   *     "key": The user pressed an arrow key to navigate amongst the results.
   *   </li><li>
   *     "auto": If options.autoHighlight is set, an automatic highlight of the
   *     first result will occur each time a new result set is rendered.
   *   </li></ul>
   */
    highlight: function(result, $input, trigger) {
    // Does nothing
    },

  /**
   * Given a result object, theme it to HTML.
   *
   * <br /><br /><em>Default behavior: Wraps result.title in an h4 tag, and
   * result.description in a p tag. Note that no sanitization of malicious
   * scripts is done here. Whatever is within the title/description is just
   * printed out. May contain HTML.</em>
   *
   * @param {Object} result
   *   The result object that should be rendered.
   *
   * @returns {String}
   *   HTML output, will be wrapped in a list element.
   */
    themeResult: function(result) {
      var output = [];
      if ($.type(result.title) == 'string') {
        output.push('<h4>', result.title, '</h4>');
      }
      if ($.type(result.description) == 'string') {
        output.push('<p>', result.description, '</p>');
      }
      return output.join('');
    },

  /**
   * Retrieve local results from the local resource by providing a query
   * string.
   *
   * <br /><br /><em>Default behavior: Automatically handles arrays, if the
   * data inside each element is either a plain string or a result object.
   * If it is a result object, it will match the query string against the
   * title and description property. Search is not case sensitive.</em>
   *
   * @param {String} query
   *   The query string, unescaped. May contain any UTF-8 character.
   *   If case insensitive, it already is lowercased.
   *
   * @param {Object} resource
   *   The resource provided in the {@link jQuery.betterAutocomplete} init
   *   constructor.
   *
   * @param {Boolean} caseSensitive
   *   From options.caseSensitive, the searching should be case sensitive.
   *
   * @returns {Array[Object]}
   *   A flat array containing pure result objects. May be an empty array.
   */
    queryLocalResults: function(query, resource, caseSensitive) {
      if (!$.isArray(resource)) {
      // Per default Better Autocomplete only handles arrays
        return [];
      }
      var results = [];
      $.each(resource, function(i, value) {
        switch ($.type(value)) {
        case 'string': // Flat array of strings
          if ((caseSensitive ? value : value.toLowerCase())
            .indexOf(query) >= 0) {
          // Match found
            results.push({ title: value });
          }
          break;
        case 'object': // Array of result objects
          if ($.type(value.title) == 'string' &&
            (caseSensitive ? value.title : value.title.toLowerCase())
            .indexOf(query) >= 0) {
          // Match found in title field
            results.push(value);
          }
          else if ($.type(value.description) == 'string' &&
                 (caseSensitive ? value.description :
                 value.description.toLowerCase()).indexOf(query) >= 0) {
          // Match found in description field
            results.push(value);
          }
          break;
        }
      });
      return results;
    },

  /**
   * Fetch remote result data and return it using completeCallback when
   * fetching is finished. Must be asynchronous in order to not freeze the
   * Better Autocomplete instance.
   *
   * <br /><br /><em>Default behavior: Fetches JSON data from the url, using
   * the jQuery.ajax() method. Errors are ignored.</em>
   *
   * @param {String} url
   *   The URL to fetch data from.
   *
   * @param {Function} completeCallback
   *   This function must be called, even if an error occurs. It takes zero
   *   or one parameter: the data that was fetched.
   *
   * @param {Number} timeout
   *   The preferred timeout for the request. This callback should respect
   *   the timeout.
   *
   * @param {Boolean} crossOrigin
   *   True if a cross origin request should be performed.
   */
    fetchRemoteData: function(url, completeCallback, timeout, crossOrigin) {
      $.ajax({
        url: url,
        dataType: crossOrigin && !$.support.cors ? 'jsonp' : 'json',
        timeout: timeout,
        success: function(data, textStatus) {
          completeCallback(data);
        },
        error: function(jqXHR, textStatus, errorThrown) {
          completeCallback();
        }
      });
    },

  /**
   * Process remote fetched data by extracting an array of result objects
   * from it. This callback is useful if the fetched data is not the plain
   * results array, but a more complicated object which does contain results.
   *
   * <br /><br /><em>Default behavior: If the data is defined and is an
   * array, return it. Otherwise return an empty array.</em>
   *
   * @param {mixed} data
   *   The raw data recieved from the server. Can be undefined.
   *
   * @returns {Array[Object]}
   *   A flat array containing result objects. May be an empty array.
   */
    processRemoteData: function(data) {
      if ($.isArray(data)) {
        return data;
      }
      else {
        return [];
      }
    },

  /**
   * From a given result object, return it's group name (if any). Used for
   * grouping results together.
   *
   * <br /><br /><em>Default behavior: If the result has a "group" property
   * defined, return it.</em>
   *
   * @param {Object} result
   *   The result object.
   *
   * @returns {String}
   *   The group name, may contain HTML. If no group, don't return anything.
   */
    getGroup: function(result) {
      if ($.type(result.group) == 'string') {
        return result.group;
      }
    },

  /**
   * Called when remote fetching begins.
   *
   * <br /><br /><em>Default behavior: Adds the CSS class "fetching" to the
   * input field, for styling purposes.</em>
   *
   * @param {Object} $input
   *   The input DOM element, wrapped in jQuery.
   */
    beginFetching: function($input) {
      $input.addClass('fetching');
    },

  /**
   * Called when fetching is finished. All active requests must finish before
   * this function is called.
   *
   * <br /><br /><em>Default behavior: Removes the "fetching" class.</em>
   *
   * @param {Object} $input
   *   The input DOM element, wrapped in jQuery.
   */
    finishFetching: function($input) {
      $input.removeClass('fetching');
    },

  /**
   * Executed after the suggestion list has been shown.
   *
   * @param {Object} $results
   *   The suggestion list UL element, wrapped in jQuery.
   *
   * <br /><br /><em>Default behavior: Does nothing.</em>
   */
    afterShow: function($results) {},

  /**
   * Executed after the suggestion list has been hidden.
   *
   * @param {Object} $results
   *   The suggestion list UL element, wrapped in jQuery.
   *
   * <br /><br /><em>Default behavior: Does nothing.</em>
   */
    afterHide: function($results) {},

  /**
   * Construct the remote fetching URL.
   *
   * <br /><br /><em>Default behavior: Adds "?q=<query>" or "&q=<query>" to the
   * path. The query string is URL encoded.</em>
   *
   * @param {String} path
   *   The path given in the {@link jQuery.betterAutocomplete} constructor.
   *
   * @param {String} query
   *   The raw query string. Remember to URL encode this to prevent illegal
   *   character errors.
   *
   * @returns {String}
   *   The URL, ready for fetching.
   */
    constructURL: function(path, query) {
      return path + (path.indexOf('?') > -1 ? '&' : '?') + 'q=' + encodeURIComponent(query);
    },

  /**
   * To ease up on server load, treat similar strings the same.
   *
   * <br /><br /><em>Default behavior: Trims the query from leading and
   * trailing whitespace.</em>
   *
   * @param {String} rawQuery
   *   The user's raw input.
   *
   * @param {Boolean} caseSensitive
   *   Case sensitive. Will convert to lowercase if false.
   *
   * @returns {String}
   *   The canonical query associated with this string.
   */
    canonicalQuery: function(rawQuery, caseSensitive) {
      var query = $.trim(rawQuery);
      if (!caseSensitive) {
        query = query.toLowerCase();
      }
      return query;
    },

  /**
   * Insert the results list into the DOM and position it properly.
   *
   * <br /><br /><em>Default behavior: Inserts suggestion list directly
   * after the input element and sets an absolute position using
   * jQuery.position() for determining left/top values. Also adds a nice
   * looking box-shadow to the list.</em>
   *
   * @param {Object} $results
   *   The UL list element to insert, wrapped in jQuery.
   *
   * @param {Object} $input
   *   The text input element, wrapped in jQuery.
   */
    insertSuggestionList: function($results, $input) {
      $results.width($input.outerWidth() - 2) // Subtract border width.
      .css({
        position: 'absolute',
        left: $input.position().left,
        top: $input.position().top + $input.outerHeight()
      })
      .hide()
      .insertAfter($input);
    }
  };

/*
 * jQuery focus selector, required by Better Autocomplete.
 *
 * @see http://stackoverflow.com/questions/967096/using-jquery-to-test-if-an-input-has-focus/2684561#2684561
 */
  var filters = $.expr[':'];
  if (!filters.focus) {
    filters.focus = function(elem) {
      return elem === document.activeElement && (elem.type || elem.href);
    };
  }

})(jQuery);

/**
 * Map Icons created by Scott de Jonge
 *
 * @version 3.0.0
 * @url http://map-icons.com
 *
 */

// Define Marker Shapes

var MAP_PIN = 'M0-48c-9.8 0-17.7 7.8-17.7 17.4 0 15.5 17.7 30.6 17.7 30.6s17.7-15.4 17.7-30.6c0-9.6-7.9-17.4-17.7-17.4z';
var SQUARE_PIN = 'M22-48h-44v43h16l6 5 6-5h16z';
var SHIELD = 'M18.8-31.8c.3-3.4 1.3-6.6 3.2-9.5l-7-6.7c-2.2 1.8-4.8 2.8-7.6 3-2.6.2-5.1-.2-7.5-1.4-2.4 1.1-4.9 1.6-7.5 1.4-2.7-.2-5.1-1.1-7.3-2.7l-7.1 6.7c1.7 2.9 2.7 6 2.9 9.2.1 1.5-.3 3.5-1.3 6.1-.5 1.5-.9 2.7-1.2 3.8-.2 1-.4 1.9-.5 2.5 0 2.8.8 5.3 2.5 7.5 1.3 1.6 3.5 3.4 6.5 5.4 3.3 1.6 5.8 2.6 7.6 3.1.5.2 1 .4 1.5.7l1.5.6c1.2.7 2 1.4 2.4 2.1.5-.8 1.3-1.5 2.4-2.1.7-.3 1.3-.5 1.9-.8.5-.2.9-.4 1.1-.5.4-.1.9-.3 1.5-.6.6-.2 1.3-.5 2.2-.8 1.7-.6 3-1.1 3.8-1.6 2.9-2 5.1-3.8 6.4-5.3 1.7-2.2 2.6-4.8 2.5-7.6-.1-1.3-.7-3.3-1.7-6.1-.9-2.8-1.3-4.9-1.2-6.4z';
var ROUTE = 'M24-28.3c-.2-13.3-7.9-18.5-8.3-18.7l-1.2-.8-1.2.8c-2 1.4-4.1 2-6.1 2-3.4 0-5.8-1.9-5.9-1.9l-1.3-1.1-1.3 1.1c-.1.1-2.5 1.9-5.9 1.9-2.1 0-4.1-.7-6.1-2l-1.2-.8-1.2.8c-.8.6-8 5.9-8.2 18.7-.2 1.1 2.9 22.2 23.9 28.3 22.9-6.7 24.1-26.9 24-28.3z';
var SQUARE = 'M-24-48h48v48h-48z';
var SQUARE_ROUNDED = 'M24-8c0 4.4-3.6 8-8 8h-32c-4.4 0-8-3.6-8-8v-32c0-4.4 3.6-8 8-8h32c4.4 0 8 3.6 8 8v32z';
function map_icons_init() {
// Function to do the inheritance properly
// Inspired by: http://stackoverflow.com/questions/9812783/cannot-inherit-google-maps-map-v3-in-my-custom-class-javascript
var inherits = function(childCtor, parentCtor) {
	/** @constructor */
  function tempCtor() {}
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  childCtor.prototype.constructor = childCtor;
};

Marker = function(options){
  google.maps.Marker.apply(this, arguments);

  if (options.map_icon_label) {
    this.MarkerLabel = new MarkerLabel({
      map: this.map,
      marker: this,
      text: options.map_icon_label
    });
    this.MarkerLabel.bindTo('position', this, 'position');
  }
}

// Apply the inheritance
inherits(Marker, google.maps.Marker);

// Custom Marker SetMap
Marker.prototype.setMap = function() {
  google.maps.Marker.prototype.setMap.apply(this, arguments);
  (this.MarkerLabel) && this.MarkerLabel.setMap.apply(this.MarkerLabel, arguments);
};

// Marker Label Overlay
var MarkerLabel = function(options) {
  var self = this;
  this.setValues(options);

	// Create the label container
  this.div = document.createElement('div');
  this.div.className = 'map-icon-label';

	// Trigger the marker click handler if clicking on the label
  google.maps.event.addDomListener(this.div, 'click', function(e){
    (e.stopPropagation) && e.stopPropagation();
    google.maps.event.trigger(self.marker, 'click');
  });
};

// Create MarkerLabel Object
MarkerLabel.prototype = new google.maps.OverlayView;

// Marker Label onAdd
MarkerLabel.prototype.onAdd = function() {
  var pane = this.getPanes().overlayImage.appendChild(this.div);
  var self = this;

  this.listeners = [
    google.maps.event.addListener(this, 'position_changed', function() { self.draw(); }),
    google.maps.event.addListener(this, 'text_changed', function() { self.draw(); }),
    google.maps.event.addListener(this, 'zindex_changed', function() { self.draw(); })
  ];
};

// Marker Label onRemove
MarkerLabel.prototype.onRemove = function() {
  this.div.parentNode.removeChild(this.div);

  for (var i = 0, I = this.listeners.length; i < I; ++i) {
    google.maps.event.removeListener(this.listeners[i]);
  }
};

// Implement draw
MarkerLabel.prototype.draw = function() {
  var projection = this.getProjection();
  var position = projection.fromLatLngToDivPixel(this.get('position'));
  var div = this.div;

  this.div.innerHTML = this.get('text').toString();

  div.style.zIndex = this.get('zIndex'); // Allow label to overlay marker
  div.style.position = 'absolute';
  div.style.display = 'block';
  div.style.left = (position.x - (div.offsetWidth / 2)) + 'px';
  div.style.top = (position.y - div.offsetHeight) + 'px';

};
}

/**
 * material-design-lite - Material Design Components in CSS, JS and HTML
 * @version v1.3.0
 * @license Apache-2.0
 * @copyright 2015 Google, Inc.
 * @link https://github.com/google/material-design-lite
 */
!function(){"use strict";function e(e,t){if(e){if(t.element_.classList.contains(t.CssClasses_.MDL_JS_RIPPLE_EFFECT)){var s=document.createElement("span");s.classList.add(t.CssClasses_.MDL_RIPPLE_CONTAINER),s.classList.add(t.CssClasses_.MDL_JS_RIPPLE_EFFECT);var i=document.createElement("span");i.classList.add(t.CssClasses_.MDL_RIPPLE),s.appendChild(i),e.appendChild(s)}e.addEventListener("click",function(s){if("#"===e.getAttribute("href").charAt(0)){s.preventDefault();var i=e.href.split("#")[1],n=t.element_.querySelector("#"+i);t.resetTabState_(),t.resetPanelState_(),e.classList.add(t.CssClasses_.ACTIVE_CLASS),n.classList.add(t.CssClasses_.ACTIVE_CLASS)}})}}function t(e,t,s,i){function n(){var n=e.href.split("#")[1],a=i.content_.querySelector("#"+n);i.resetTabState_(t),i.resetPanelState_(s),e.classList.add(i.CssClasses_.IS_ACTIVE),a.classList.add(i.CssClasses_.IS_ACTIVE)}if(i.tabBar_.classList.contains(i.CssClasses_.JS_RIPPLE_EFFECT)){var a=document.createElement("span");a.classList.add(i.CssClasses_.RIPPLE_CONTAINER),a.classList.add(i.CssClasses_.JS_RIPPLE_EFFECT);var l=document.createElement("span");l.classList.add(i.CssClasses_.RIPPLE),a.appendChild(l),e.appendChild(a)}i.tabBar_.classList.contains(i.CssClasses_.TAB_MANUAL_SWITCH)||e.addEventListener("click",function(t){"#"===e.getAttribute("href").charAt(0)&&(t.preventDefault(),n())}),e.show=n}var s={upgradeDom:function(e,t){},upgradeElement:function(e,t){},upgradeElements:function(e){},upgradeAllRegistered:function(){},registerUpgradedCallback:function(e,t){},register:function(e){},downgradeElements:function(e){}};s=function(){function e(e,t){for(var s=0;s<c.length;s++)if(c[s].className===e)return"undefined"!=typeof t&&(c[s]=t),c[s];return!1}function t(e){var t=e.getAttribute("data-upgraded");return null===t?[""]:t.split(",")}function s(e,s){var i=t(e);return i.indexOf(s)!==-1}function i(e,t,s){if("CustomEvent"in window&&"function"==typeof window.CustomEvent)return new CustomEvent(e,{bubbles:t,cancelable:s});var i=document.createEvent("Events");return i.initEvent(e,t,s),i}function n(t,s){if("undefined"==typeof t&&"undefined"==typeof s)for(var i=0;i<c.length;i++)n(c[i].className,c[i].cssClass);else{var l=t;if("undefined"==typeof s){var o=e(l);o&&(s=o.cssClass)}for(var r=document.querySelectorAll("."+s),_=0;_<r.length;_++)a(r[_],l)}}function a(n,a){if(!("object"==typeof n&&n instanceof Element))throw new Error("Invalid argument provided to upgrade MDL element.");var l=i("mdl-componentupgrading",!0,!0);if(n.dispatchEvent(l),!l.defaultPrevented){var o=t(n),r=[];if(a)s(n,a)||r.push(e(a));else{var _=n.classList;c.forEach(function(e){_.contains(e.cssClass)&&r.indexOf(e)===-1&&!s(n,e.className)&&r.push(e)})}for(var d,h=0,u=r.length;h<u;h++){if(d=r[h],!d)throw new Error("Unable to find a registered component for the given class.");o.push(d.className),n.setAttribute("data-upgraded",o.join(","));var E=new d.classConstructor(n);E[C]=d,p.push(E);for(var m=0,L=d.callbacks.length;m<L;m++)d.callbacks[m](n);d.widget&&(n[d.className]=E);var I=i("mdl-componentupgraded",!0,!1);n.dispatchEvent(I)}}}function l(e){Array.isArray(e)||(e=e instanceof Element?[e]:Array.prototype.slice.call(e));for(var t,s=0,i=e.length;s<i;s++)t=e[s],t instanceof HTMLElement&&(a(t),t.children.length>0&&l(t.children))}function o(t){var s="undefined"==typeof t.widget&&"undefined"==typeof t.widget,i=!0;s||(i=t.widget||t.widget);var n={classConstructor:t.constructor||t.constructor,className:t.classAsString||t.classAsString,cssClass:t.cssClass||t.cssClass,widget:i,callbacks:[]};if(c.forEach(function(e){if(e.cssClass===n.cssClass)throw new Error("The provided cssClass has already been registered: "+e.cssClass);if(e.className===n.className)throw new Error("The provided className has already been registered")}),t.constructor.prototype.hasOwnProperty(C))throw new Error("MDL component classes must not have "+C+" defined as a property.");var a=e(t.classAsString,n);a||c.push(n)}function r(t,s){var i=e(t);i&&i.callbacks.push(s)}function _(){for(var e=0;e<c.length;e++)n(c[e].className)}function d(e){if(e){var t=p.indexOf(e);p.splice(t,1);var s=e.element_.getAttribute("data-upgraded").split(","),n=s.indexOf(e[C].classAsString);s.splice(n,1),e.element_.setAttribute("data-upgraded",s.join(","));var a=i("mdl-componentdowngraded",!0,!1);e.element_.dispatchEvent(a)}}function h(e){var t=function(e){p.filter(function(t){return t.element_===e}).forEach(d)};if(e instanceof Array||e instanceof NodeList)for(var s=0;s<e.length;s++)t(e[s]);else{if(!(e instanceof Node))throw new Error("Invalid argument provided to downgrade MDL nodes.");t(e)}}var c=[],p=[],C="mdlComponentConfigInternal_";return{upgradeDom:n,upgradeElement:a,upgradeElements:l,upgradeAllRegistered:_,registerUpgradedCallback:r,register:o,downgradeElements:h}}(),s.ComponentConfigPublic,s.ComponentConfig,s.Component,s.upgradeDom=s.upgradeDom,s.upgradeElement=s.upgradeElement,s.upgradeElements=s.upgradeElements,s.upgradeAllRegistered=s.upgradeAllRegistered,s.registerUpgradedCallback=s.registerUpgradedCallback,s.register=s.register,s.downgradeElements=s.downgradeElements,window.componentHandler=s,window.componentHandler=s,window.addEventListener("load",function(){"classList"in document.createElement("div")&&"querySelector"in document&&"addEventListener"in window&&Array.prototype.forEach?(document.documentElement.classList.add("mdl-js"),s.upgradeAllRegistered()):(s.upgradeElement=function(){},s.register=function(){})}),Date.now||(Date.now=function(){return(new Date).getTime()},Date.now=Date.now);for(var i=["webkit","moz"],n=0;n<i.length&&!window.requestAnimationFrame;++n){var a=i[n];window.requestAnimationFrame=window[a+"RequestAnimationFrame"],window.cancelAnimationFrame=window[a+"CancelAnimationFrame"]||window[a+"CancelRequestAnimationFrame"],window.requestAnimationFrame=window.requestAnimationFrame,window.cancelAnimationFrame=window.cancelAnimationFrame}if(/iP(ad|hone|od).*OS 6/.test(window.navigator.userAgent)||!window.requestAnimationFrame||!window.cancelAnimationFrame){var l=0;window.requestAnimationFrame=function(e){var t=Date.now(),s=Math.max(l+16,t);return setTimeout(function(){e(l=s)},s-t)},window.cancelAnimationFrame=clearTimeout,window.requestAnimationFrame=window.requestAnimationFrame,window.cancelAnimationFrame=window.cancelAnimationFrame}var o=function(e){this.element_=e,this.init()};window.MaterialButton=o,o.prototype.Constant_={},o.prototype.CssClasses_={RIPPLE_EFFECT:"mdl-js-ripple-effect",RIPPLE_CONTAINER:"mdl-button__ripple-container",RIPPLE:"mdl-ripple"},o.prototype.blurHandler_=function(e){e&&this.element_.blur()},o.prototype.disable=function(){this.element_.disabled=!0},o.prototype.disable=o.prototype.disable,o.prototype.enable=function(){this.element_.disabled=!1},o.prototype.enable=o.prototype.enable,o.prototype.init=function(){if(this.element_){if(this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)){var e=document.createElement("span");e.classList.add(this.CssClasses_.RIPPLE_CONTAINER),this.rippleElement_=document.createElement("span"),this.rippleElement_.classList.add(this.CssClasses_.RIPPLE),e.appendChild(this.rippleElement_),this.boundRippleBlurHandler=this.blurHandler_.bind(this),this.rippleElement_.addEventListener("mouseup",this.boundRippleBlurHandler),this.element_.appendChild(e)}this.boundButtonBlurHandler=this.blurHandler_.bind(this),this.element_.addEventListener("mouseup",this.boundButtonBlurHandler),this.element_.addEventListener("mouseleave",this.boundButtonBlurHandler)}},s.register({constructor:o,classAsString:"MaterialButton",cssClass:"mdl-js-button",widget:!0});var r=function(e){this.element_=e,this.init()};window.MaterialCheckbox=r,r.prototype.Constant_={TINY_TIMEOUT:.001},r.prototype.CssClasses_={INPUT:"mdl-checkbox__input",BOX_OUTLINE:"mdl-checkbox__box-outline",FOCUS_HELPER:"mdl-checkbox__focus-helper",TICK_OUTLINE:"mdl-checkbox__tick-outline",RIPPLE_EFFECT:"mdl-js-ripple-effect",RIPPLE_IGNORE_EVENTS:"mdl-js-ripple-effect--ignore-events",RIPPLE_CONTAINER:"mdl-checkbox__ripple-container",RIPPLE_CENTER:"mdl-ripple--center",RIPPLE:"mdl-ripple",IS_FOCUSED:"is-focused",IS_DISABLED:"is-disabled",IS_CHECKED:"is-checked",IS_UPGRADED:"is-upgraded"},r.prototype.onChange_=function(e){this.updateClasses_()},r.prototype.onFocus_=function(e){this.element_.classList.add(this.CssClasses_.IS_FOCUSED)},r.prototype.onBlur_=function(e){this.element_.classList.remove(this.CssClasses_.IS_FOCUSED)},r.prototype.onMouseUp_=function(e){this.blur_()},r.prototype.updateClasses_=function(){this.checkDisabled(),this.checkToggleState()},r.prototype.blur_=function(){window.setTimeout(function(){this.inputElement_.blur()}.bind(this),this.Constant_.TINY_TIMEOUT)},r.prototype.checkToggleState=function(){this.inputElement_.checked?this.element_.classList.add(this.CssClasses_.IS_CHECKED):this.element_.classList.remove(this.CssClasses_.IS_CHECKED)},r.prototype.checkToggleState=r.prototype.checkToggleState,r.prototype.checkDisabled=function(){this.inputElement_.disabled?this.element_.classList.add(this.CssClasses_.IS_DISABLED):this.element_.classList.remove(this.CssClasses_.IS_DISABLED)},r.prototype.checkDisabled=r.prototype.checkDisabled,r.prototype.disable=function(){this.inputElement_.disabled=!0,this.updateClasses_()},r.prototype.disable=r.prototype.disable,r.prototype.enable=function(){this.inputElement_.disabled=!1,this.updateClasses_()},r.prototype.enable=r.prototype.enable,r.prototype.check=function(){this.inputElement_.checked=!0,this.updateClasses_()},r.prototype.check=r.prototype.check,r.prototype.uncheck=function(){this.inputElement_.checked=!1,this.updateClasses_()},r.prototype.uncheck=r.prototype.uncheck,r.prototype.init=function(){if(this.element_){this.inputElement_=this.element_.querySelector("."+this.CssClasses_.INPUT);var e=document.createElement("span");e.classList.add(this.CssClasses_.BOX_OUTLINE);var t=document.createElement("span");t.classList.add(this.CssClasses_.FOCUS_HELPER);var s=document.createElement("span");if(s.classList.add(this.CssClasses_.TICK_OUTLINE),e.appendChild(s),this.element_.appendChild(t),this.element_.appendChild(e),this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)){this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS),this.rippleContainerElement_=document.createElement("span"),this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CONTAINER),this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_EFFECT),this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CENTER),this.boundRippleMouseUp=this.onMouseUp_.bind(this),this.rippleContainerElement_.addEventListener("mouseup",this.boundRippleMouseUp);var i=document.createElement("span");i.classList.add(this.CssClasses_.RIPPLE),this.rippleContainerElement_.appendChild(i),this.element_.appendChild(this.rippleContainerElement_)}this.boundInputOnChange=this.onChange_.bind(this),this.boundInputOnFocus=this.onFocus_.bind(this),this.boundInputOnBlur=this.onBlur_.bind(this),this.boundElementMouseUp=this.onMouseUp_.bind(this),this.inputElement_.addEventListener("change",this.boundInputOnChange),this.inputElement_.addEventListener("focus",this.boundInputOnFocus),this.inputElement_.addEventListener("blur",this.boundInputOnBlur),this.element_.addEventListener("mouseup",this.boundElementMouseUp),this.updateClasses_(),this.element_.classList.add(this.CssClasses_.IS_UPGRADED)}},s.register({constructor:r,classAsString:"MaterialCheckbox",cssClass:"mdl-js-checkbox",widget:!0});var _=function(e){this.element_=e,this.init()};window.MaterialIconToggle=_,_.prototype.Constant_={TINY_TIMEOUT:.001},_.prototype.CssClasses_={INPUT:"mdl-icon-toggle__input",JS_RIPPLE_EFFECT:"mdl-js-ripple-effect",RIPPLE_IGNORE_EVENTS:"mdl-js-ripple-effect--ignore-events",RIPPLE_CONTAINER:"mdl-icon-toggle__ripple-container",RIPPLE_CENTER:"mdl-ripple--center",RIPPLE:"mdl-ripple",IS_FOCUSED:"is-focused",IS_DISABLED:"is-disabled",IS_CHECKED:"is-checked"},_.prototype.onChange_=function(e){this.updateClasses_()},_.prototype.onFocus_=function(e){this.element_.classList.add(this.CssClasses_.IS_FOCUSED)},_.prototype.onBlur_=function(e){this.element_.classList.remove(this.CssClasses_.IS_FOCUSED)},_.prototype.onMouseUp_=function(e){this.blur_()},_.prototype.updateClasses_=function(){this.checkDisabled(),this.checkToggleState()},_.prototype.blur_=function(){window.setTimeout(function(){this.inputElement_.blur()}.bind(this),this.Constant_.TINY_TIMEOUT)},_.prototype.checkToggleState=function(){this.inputElement_.checked?this.element_.classList.add(this.CssClasses_.IS_CHECKED):this.element_.classList.remove(this.CssClasses_.IS_CHECKED)},_.prototype.checkToggleState=_.prototype.checkToggleState,_.prototype.checkDisabled=function(){this.inputElement_.disabled?this.element_.classList.add(this.CssClasses_.IS_DISABLED):this.element_.classList.remove(this.CssClasses_.IS_DISABLED)},_.prototype.checkDisabled=_.prototype.checkDisabled,_.prototype.disable=function(){this.inputElement_.disabled=!0,this.updateClasses_()},_.prototype.disable=_.prototype.disable,_.prototype.enable=function(){this.inputElement_.disabled=!1,this.updateClasses_()},_.prototype.enable=_.prototype.enable,_.prototype.check=function(){this.inputElement_.checked=!0,this.updateClasses_()},_.prototype.check=_.prototype.check,_.prototype.uncheck=function(){this.inputElement_.checked=!1,this.updateClasses_()},_.prototype.uncheck=_.prototype.uncheck,_.prototype.init=function(){if(this.element_){if(this.inputElement_=this.element_.querySelector("."+this.CssClasses_.INPUT),this.element_.classList.contains(this.CssClasses_.JS_RIPPLE_EFFECT)){this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS),this.rippleContainerElement_=document.createElement("span"),this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CONTAINER),this.rippleContainerElement_.classList.add(this.CssClasses_.JS_RIPPLE_EFFECT),this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CENTER),this.boundRippleMouseUp=this.onMouseUp_.bind(this),this.rippleContainerElement_.addEventListener("mouseup",this.boundRippleMouseUp);var e=document.createElement("span");e.classList.add(this.CssClasses_.RIPPLE),this.rippleContainerElement_.appendChild(e),this.element_.appendChild(this.rippleContainerElement_)}this.boundInputOnChange=this.onChange_.bind(this),this.boundInputOnFocus=this.onFocus_.bind(this),this.boundInputOnBlur=this.onBlur_.bind(this),this.boundElementOnMouseUp=this.onMouseUp_.bind(this),this.inputElement_.addEventListener("change",this.boundInputOnChange),this.inputElement_.addEventListener("focus",this.boundInputOnFocus),this.inputElement_.addEventListener("blur",this.boundInputOnBlur),this.element_.addEventListener("mouseup",this.boundElementOnMouseUp),this.updateClasses_(),this.element_.classList.add("is-upgraded")}},s.register({constructor:_,classAsString:"MaterialIconToggle",cssClass:"mdl-js-icon-toggle",widget:!0});var d=function(e){this.element_=e,this.init()};window.MaterialMenu=d,d.prototype.Constant_={TRANSITION_DURATION_SECONDS:.3,TRANSITION_DURATION_FRACTION:.8,CLOSE_TIMEOUT:150},d.prototype.Keycodes_={ENTER:13,ESCAPE:27,SPACE:32,UP_ARROW:38,DOWN_ARROW:40},d.prototype.CssClasses_={CONTAINER:"mdl-menu__container",OUTLINE:"mdl-menu__outline",ITEM:"mdl-menu__item",ITEM_RIPPLE_CONTAINER:"mdl-menu__item-ripple-container",RIPPLE_EFFECT:"mdl-js-ripple-effect",RIPPLE_IGNORE_EVENTS:"mdl-js-ripple-effect--ignore-events",RIPPLE:"mdl-ripple",IS_UPGRADED:"is-upgraded",IS_VISIBLE:"is-visible",IS_ANIMATING:"is-animating",BOTTOM_LEFT:"mdl-menu--bottom-left",BOTTOM_RIGHT:"mdl-menu--bottom-right",TOP_LEFT:"mdl-menu--top-left",TOP_RIGHT:"mdl-menu--top-right",UNALIGNED:"mdl-menu--unaligned"},d.prototype.init=function(){if(this.element_){var e=document.createElement("div");e.classList.add(this.CssClasses_.CONTAINER),this.element_.parentElement.insertBefore(e,this.element_),this.element_.parentElement.removeChild(this.element_),e.appendChild(this.element_),this.container_=e;var t=document.createElement("div");t.classList.add(this.CssClasses_.OUTLINE),this.outline_=t,e.insertBefore(t,this.element_);var s=this.element_.getAttribute("for")||this.element_.getAttribute("data-mdl-for"),i=null;s&&(i=document.getElementById(s),i&&(this.forElement_=i,i.addEventListener("click",this.handleForClick_.bind(this)),i.addEventListener("keydown",this.handleForKeyboardEvent_.bind(this))));var n=this.element_.querySelectorAll("."+this.CssClasses_.ITEM);this.boundItemKeydown_=this.handleItemKeyboardEvent_.bind(this),this.boundItemClick_=this.handleItemClick_.bind(this);for(var a=0;a<n.length;a++)n[a].addEventListener("click",this.boundItemClick_),n[a].tabIndex="-1",n[a].addEventListener("keydown",this.boundItemKeydown_);if(this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT))for(this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS),a=0;a<n.length;a++){var l=n[a],o=document.createElement("span");o.classList.add(this.CssClasses_.ITEM_RIPPLE_CONTAINER);var r=document.createElement("span");r.classList.add(this.CssClasses_.RIPPLE),o.appendChild(r),l.appendChild(o),l.classList.add(this.CssClasses_.RIPPLE_EFFECT)}this.element_.classList.contains(this.CssClasses_.BOTTOM_LEFT)&&this.outline_.classList.add(this.CssClasses_.BOTTOM_LEFT),this.element_.classList.contains(this.CssClasses_.BOTTOM_RIGHT)&&this.outline_.classList.add(this.CssClasses_.BOTTOM_RIGHT),this.element_.classList.contains(this.CssClasses_.TOP_LEFT)&&this.outline_.classList.add(this.CssClasses_.TOP_LEFT),this.element_.classList.contains(this.CssClasses_.TOP_RIGHT)&&this.outline_.classList.add(this.CssClasses_.TOP_RIGHT),this.element_.classList.contains(this.CssClasses_.UNALIGNED)&&this.outline_.classList.add(this.CssClasses_.UNALIGNED),e.classList.add(this.CssClasses_.IS_UPGRADED)}},d.prototype.handleForClick_=function(e){if(this.element_&&this.forElement_){var t=this.forElement_.getBoundingClientRect(),s=this.forElement_.parentElement.getBoundingClientRect();this.element_.classList.contains(this.CssClasses_.UNALIGNED)||(this.element_.classList.contains(this.CssClasses_.BOTTOM_RIGHT)?(this.container_.style.right=s.right-t.right+"px",this.container_.style.top=this.forElement_.offsetTop+this.forElement_.offsetHeight+"px"):this.element_.classList.contains(this.CssClasses_.TOP_LEFT)?(this.container_.style.left=this.forElement_.offsetLeft+"px",this.container_.style.bottom=s.bottom-t.top+"px"):this.element_.classList.contains(this.CssClasses_.TOP_RIGHT)?(this.container_.style.right=s.right-t.right+"px",this.container_.style.bottom=s.bottom-t.top+"px"):(this.container_.style.left=this.forElement_.offsetLeft+"px",this.container_.style.top=this.forElement_.offsetTop+this.forElement_.offsetHeight+"px"))}this.toggle(e)},d.prototype.handleForKeyboardEvent_=function(e){if(this.element_&&this.container_&&this.forElement_){var t=this.element_.querySelectorAll("."+this.CssClasses_.ITEM+":not([disabled])");t&&t.length>0&&this.container_.classList.contains(this.CssClasses_.IS_VISIBLE)&&(e.keyCode===this.Keycodes_.UP_ARROW?(e.preventDefault(),t[t.length-1].focus()):e.keyCode===this.Keycodes_.DOWN_ARROW&&(e.preventDefault(),t[0].focus()))}},d.prototype.handleItemKeyboardEvent_=function(e){if(this.element_&&this.container_){var t=this.element_.querySelectorAll("."+this.CssClasses_.ITEM+":not([disabled])");if(t&&t.length>0&&this.container_.classList.contains(this.CssClasses_.IS_VISIBLE)){var s=Array.prototype.slice.call(t).indexOf(e.target);if(e.keyCode===this.Keycodes_.UP_ARROW)e.preventDefault(),s>0?t[s-1].focus():t[t.length-1].focus();else if(e.keyCode===this.Keycodes_.DOWN_ARROW)e.preventDefault(),t.length>s+1?t[s+1].focus():t[0].focus();else if(e.keyCode===this.Keycodes_.SPACE||e.keyCode===this.Keycodes_.ENTER){e.preventDefault();var i=new MouseEvent("mousedown");e.target.dispatchEvent(i),i=new MouseEvent("mouseup"),e.target.dispatchEvent(i),e.target.click()}else e.keyCode===this.Keycodes_.ESCAPE&&(e.preventDefault(),this.hide())}}},d.prototype.handleItemClick_=function(e){e.target.hasAttribute("disabled")?e.stopPropagation():(this.closing_=!0,window.setTimeout(function(e){this.hide(),this.closing_=!1}.bind(this),this.Constant_.CLOSE_TIMEOUT))},d.prototype.applyClip_=function(e,t){this.element_.classList.contains(this.CssClasses_.UNALIGNED)?this.element_.style.clip="":this.element_.classList.contains(this.CssClasses_.BOTTOM_RIGHT)?this.element_.style.clip="rect(0 "+t+"px 0 "+t+"px)":this.element_.classList.contains(this.CssClasses_.TOP_LEFT)?this.element_.style.clip="rect("+e+"px 0 "+e+"px 0)":this.element_.classList.contains(this.CssClasses_.TOP_RIGHT)?this.element_.style.clip="rect("+e+"px "+t+"px "+e+"px "+t+"px)":this.element_.style.clip=""},d.prototype.removeAnimationEndListener_=function(e){e.target.classList.remove(d.prototype.CssClasses_.IS_ANIMATING)},d.prototype.addAnimationEndListener_=function(){this.element_.addEventListener("transitionend",this.removeAnimationEndListener_),this.element_.addEventListener("webkitTransitionEnd",this.removeAnimationEndListener_)},d.prototype.show=function(e){if(this.element_&&this.container_&&this.outline_){var t=this.element_.getBoundingClientRect().height,s=this.element_.getBoundingClientRect().width;this.container_.style.width=s+"px",this.container_.style.height=t+"px",this.outline_.style.width=s+"px",this.outline_.style.height=t+"px";for(var i=this.Constant_.TRANSITION_DURATION_SECONDS*this.Constant_.TRANSITION_DURATION_FRACTION,n=this.element_.querySelectorAll("."+this.CssClasses_.ITEM),a=0;a<n.length;a++){var l=null;l=this.element_.classList.contains(this.CssClasses_.TOP_LEFT)||this.element_.classList.contains(this.CssClasses_.TOP_RIGHT)?(t-n[a].offsetTop-n[a].offsetHeight)/t*i+"s":n[a].offsetTop/t*i+"s",n[a].style.transitionDelay=l}this.applyClip_(t,s),window.requestAnimationFrame(function(){this.element_.classList.add(this.CssClasses_.IS_ANIMATING),this.element_.style.clip="rect(0 "+s+"px "+t+"px 0)",this.container_.classList.add(this.CssClasses_.IS_VISIBLE)}.bind(this)),this.addAnimationEndListener_();var o=function(t){t===e||this.closing_||t.target.parentNode===this.element_||(document.removeEventListener("click",o),this.hide())}.bind(this);document.addEventListener("click",o)}},d.prototype.show=d.prototype.show,d.prototype.hide=function(){if(this.element_&&this.container_&&this.outline_){for(var e=this.element_.querySelectorAll("."+this.CssClasses_.ITEM),t=0;t<e.length;t++)e[t].style.removeProperty("transition-delay");var s=this.element_.getBoundingClientRect(),i=s.height,n=s.width;this.element_.classList.add(this.CssClasses_.IS_ANIMATING),this.applyClip_(i,n),this.container_.classList.remove(this.CssClasses_.IS_VISIBLE),this.addAnimationEndListener_()}},d.prototype.hide=d.prototype.hide,d.prototype.toggle=function(e){this.container_.classList.contains(this.CssClasses_.IS_VISIBLE)?this.hide():this.show(e)},d.prototype.toggle=d.prototype.toggle,s.register({constructor:d,classAsString:"MaterialMenu",cssClass:"mdl-js-menu",widget:!0});var h=function(e){this.element_=e,this.init()};window.MaterialProgress=h,h.prototype.Constant_={},h.prototype.CssClasses_={INDETERMINATE_CLASS:"mdl-progress__indeterminate"},h.prototype.setProgress=function(e){this.element_.classList.contains(this.CssClasses_.INDETERMINATE_CLASS)||(this.progressbar_.style.width=e+"%")},h.prototype.setProgress=h.prototype.setProgress,h.prototype.setBuffer=function(e){this.bufferbar_.style.width=e+"%",this.auxbar_.style.width=100-e+"%"},h.prototype.setBuffer=h.prototype.setBuffer,h.prototype.init=function(){if(this.element_){var e=document.createElement("div");e.className="progressbar bar bar1",this.element_.appendChild(e),this.progressbar_=e,e=document.createElement("div"),e.className="bufferbar bar bar2",this.element_.appendChild(e),this.bufferbar_=e,e=document.createElement("div"),e.className="auxbar bar bar3",this.element_.appendChild(e),this.auxbar_=e,this.progressbar_.style.width="0%",this.bufferbar_.style.width="100%",this.auxbar_.style.width="0%",this.element_.classList.add("is-upgraded")}},s.register({constructor:h,classAsString:"MaterialProgress",cssClass:"mdl-js-progress",widget:!0});var c=function(e){this.element_=e,this.init()};window.MaterialRadio=c,c.prototype.Constant_={TINY_TIMEOUT:.001},c.prototype.CssClasses_={IS_FOCUSED:"is-focused",IS_DISABLED:"is-disabled",IS_CHECKED:"is-checked",IS_UPGRADED:"is-upgraded",JS_RADIO:"mdl-js-radio",RADIO_BTN:"mdl-radio__button",RADIO_OUTER_CIRCLE:"mdl-radio__outer-circle",RADIO_INNER_CIRCLE:"mdl-radio__inner-circle",RIPPLE_EFFECT:"mdl-js-ripple-effect",RIPPLE_IGNORE_EVENTS:"mdl-js-ripple-effect--ignore-events",RIPPLE_CONTAINER:"mdl-radio__ripple-container",RIPPLE_CENTER:"mdl-ripple--center",RIPPLE:"mdl-ripple"},c.prototype.onChange_=function(e){for(var t=document.getElementsByClassName(this.CssClasses_.JS_RADIO),s=0;s<t.length;s++){var i=t[s].querySelector("."+this.CssClasses_.RADIO_BTN);i.getAttribute("name")===this.btnElement_.getAttribute("name")&&"undefined"!=typeof t[s].MaterialRadio&&t[s].MaterialRadio.updateClasses_()}},c.prototype.onFocus_=function(e){this.element_.classList.add(this.CssClasses_.IS_FOCUSED)},c.prototype.onBlur_=function(e){this.element_.classList.remove(this.CssClasses_.IS_FOCUSED)},c.prototype.onMouseup_=function(e){this.blur_()},c.prototype.updateClasses_=function(){this.checkDisabled(),this.checkToggleState()},c.prototype.blur_=function(){window.setTimeout(function(){this.btnElement_.blur()}.bind(this),this.Constant_.TINY_TIMEOUT)},c.prototype.checkDisabled=function(){this.btnElement_.disabled?this.element_.classList.add(this.CssClasses_.IS_DISABLED):this.element_.classList.remove(this.CssClasses_.IS_DISABLED)},c.prototype.checkDisabled=c.prototype.checkDisabled,c.prototype.checkToggleState=function(){this.btnElement_.checked?this.element_.classList.add(this.CssClasses_.IS_CHECKED):this.element_.classList.remove(this.CssClasses_.IS_CHECKED)},c.prototype.checkToggleState=c.prototype.checkToggleState,c.prototype.disable=function(){this.btnElement_.disabled=!0,this.updateClasses_()},c.prototype.disable=c.prototype.disable,c.prototype.enable=function(){this.btnElement_.disabled=!1,this.updateClasses_()},c.prototype.enable=c.prototype.enable,c.prototype.check=function(){this.btnElement_.checked=!0,this.onChange_(null)},c.prototype.check=c.prototype.check,c.prototype.uncheck=function(){this.btnElement_.checked=!1,this.onChange_(null)},c.prototype.uncheck=c.prototype.uncheck,c.prototype.init=function(){if(this.element_){this.btnElement_=this.element_.querySelector("."+this.CssClasses_.RADIO_BTN),this.boundChangeHandler_=this.onChange_.bind(this),this.boundFocusHandler_=this.onChange_.bind(this),this.boundBlurHandler_=this.onBlur_.bind(this),this.boundMouseUpHandler_=this.onMouseup_.bind(this);var e=document.createElement("span");e.classList.add(this.CssClasses_.RADIO_OUTER_CIRCLE);var t=document.createElement("span");t.classList.add(this.CssClasses_.RADIO_INNER_CIRCLE),this.element_.appendChild(e),this.element_.appendChild(t);var s;if(this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)){this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS),s=document.createElement("span"),s.classList.add(this.CssClasses_.RIPPLE_CONTAINER),s.classList.add(this.CssClasses_.RIPPLE_EFFECT),s.classList.add(this.CssClasses_.RIPPLE_CENTER),s.addEventListener("mouseup",this.boundMouseUpHandler_);var i=document.createElement("span");i.classList.add(this.CssClasses_.RIPPLE),s.appendChild(i),this.element_.appendChild(s)}this.btnElement_.addEventListener("change",this.boundChangeHandler_),this.btnElement_.addEventListener("focus",this.boundFocusHandler_),this.btnElement_.addEventListener("blur",this.boundBlurHandler_),this.element_.addEventListener("mouseup",this.boundMouseUpHandler_),this.updateClasses_(),this.element_.classList.add(this.CssClasses_.IS_UPGRADED)}},s.register({constructor:c,classAsString:"MaterialRadio",cssClass:"mdl-js-radio",widget:!0});var p=function(e){this.element_=e,this.isIE_=window.navigator.msPointerEnabled,this.init()};window.MaterialSlider=p,p.prototype.Constant_={},p.prototype.CssClasses_={IE_CONTAINER:"mdl-slider__ie-container",SLIDER_CONTAINER:"mdl-slider__container",BACKGROUND_FLEX:"mdl-slider__background-flex",BACKGROUND_LOWER:"mdl-slider__background-lower",BACKGROUND_UPPER:"mdl-slider__background-upper",IS_LOWEST_VALUE:"is-lowest-value",IS_UPGRADED:"is-upgraded"},p.prototype.onInput_=function(e){this.updateValueStyles_()},p.prototype.onChange_=function(e){this.updateValueStyles_()},p.prototype.onMouseUp_=function(e){e.target.blur()},p.prototype.onContainerMouseDown_=function(e){if(e.target===this.element_.parentElement){e.preventDefault();var t=new MouseEvent("mousedown",{target:e.target,buttons:e.buttons,clientX:e.clientX,clientY:this.element_.getBoundingClientRect().y});this.element_.dispatchEvent(t)}},p.prototype.updateValueStyles_=function(){var e=(this.element_.value-this.element_.min)/(this.element_.max-this.element_.min);0===e?this.element_.classList.add(this.CssClasses_.IS_LOWEST_VALUE):this.element_.classList.remove(this.CssClasses_.IS_LOWEST_VALUE),this.isIE_||(this.backgroundLower_.style.flex=e,this.backgroundLower_.style.webkitFlex=e,this.backgroundUpper_.style.flex=1-e,this.backgroundUpper_.style.webkitFlex=1-e)},p.prototype.disable=function(){this.element_.disabled=!0},p.prototype.disable=p.prototype.disable,p.prototype.enable=function(){this.element_.disabled=!1},p.prototype.enable=p.prototype.enable,p.prototype.change=function(e){"undefined"!=typeof e&&(this.element_.value=e),this.updateValueStyles_()},p.prototype.change=p.prototype.change,p.prototype.init=function(){if(this.element_){if(this.isIE_){var e=document.createElement("div");e.classList.add(this.CssClasses_.IE_CONTAINER),this.element_.parentElement.insertBefore(e,this.element_),this.element_.parentElement.removeChild(this.element_),e.appendChild(this.element_)}else{var t=document.createElement("div");t.classList.add(this.CssClasses_.SLIDER_CONTAINER),this.element_.parentElement.insertBefore(t,this.element_),this.element_.parentElement.removeChild(this.element_),t.appendChild(this.element_);var s=document.createElement("div");s.classList.add(this.CssClasses_.BACKGROUND_FLEX),t.appendChild(s),this.backgroundLower_=document.createElement("div"),this.backgroundLower_.classList.add(this.CssClasses_.BACKGROUND_LOWER),s.appendChild(this.backgroundLower_),this.backgroundUpper_=document.createElement("div"),this.backgroundUpper_.classList.add(this.CssClasses_.BACKGROUND_UPPER),s.appendChild(this.backgroundUpper_)}this.boundInputHandler=this.onInput_.bind(this),this.boundChangeHandler=this.onChange_.bind(this),this.boundMouseUpHandler=this.onMouseUp_.bind(this),this.boundContainerMouseDownHandler=this.onContainerMouseDown_.bind(this),this.element_.addEventListener("input",this.boundInputHandler),this.element_.addEventListener("change",this.boundChangeHandler),this.element_.addEventListener("mouseup",this.boundMouseUpHandler),this.element_.parentElement.addEventListener("mousedown",this.boundContainerMouseDownHandler),this.updateValueStyles_(),this.element_.classList.add(this.CssClasses_.IS_UPGRADED)}},s.register({constructor:p,classAsString:"MaterialSlider",cssClass:"mdl-js-slider",widget:!0});var C=function(e){if(this.element_=e,this.textElement_=this.element_.querySelector("."+this.cssClasses_.MESSAGE),this.actionElement_=this.element_.querySelector("."+this.cssClasses_.ACTION),!this.textElement_)throw new Error("There must be a message element for a snackbar.");if(!this.actionElement_)throw new Error("There must be an action element for a snackbar.");this.active=!1,this.actionHandler_=void 0,this.message_=void 0,this.actionText_=void 0,this.queuedNotifications_=[],this.setActionHidden_(!0)};window.MaterialSnackbar=C,C.prototype.Constant_={ANIMATION_LENGTH:250},C.prototype.cssClasses_={SNACKBAR:"mdl-snackbar",MESSAGE:"mdl-snackbar__text",ACTION:"mdl-snackbar__action",ACTIVE:"mdl-snackbar--active"},C.prototype.displaySnackbar_=function(){this.element_.setAttribute("aria-hidden","true"),
this.actionHandler_&&(this.actionElement_.textContent=this.actionText_,this.actionElement_.addEventListener("click",this.actionHandler_),this.setActionHidden_(!1)),this.textElement_.textContent=this.message_,this.element_.classList.add(this.cssClasses_.ACTIVE),this.element_.setAttribute("aria-hidden","false"),setTimeout(this.cleanup_.bind(this),this.timeout_)},C.prototype.showSnackbar=function(e){if(void 0===e)throw new Error("Please provide a data object with at least a message to display.");if(void 0===e.message)throw new Error("Please provide a message to be displayed.");if(e.actionHandler&&!e.actionText)throw new Error("Please provide action text with the handler.");this.active?this.queuedNotifications_.push(e):(this.active=!0,this.message_=e.message,e.timeout?this.timeout_=e.timeout:this.timeout_=2750,e.actionHandler&&(this.actionHandler_=e.actionHandler),e.actionText&&(this.actionText_=e.actionText),this.displaySnackbar_())},C.prototype.showSnackbar=C.prototype.showSnackbar,C.prototype.checkQueue_=function(){this.queuedNotifications_.length>0&&this.showSnackbar(this.queuedNotifications_.shift())},C.prototype.cleanup_=function(){this.element_.classList.remove(this.cssClasses_.ACTIVE),setTimeout(function(){this.element_.setAttribute("aria-hidden","true"),this.textElement_.textContent="",Boolean(this.actionElement_.getAttribute("aria-hidden"))||(this.setActionHidden_(!0),this.actionElement_.textContent="",this.actionElement_.removeEventListener("click",this.actionHandler_)),this.actionHandler_=void 0,this.message_=void 0,this.actionText_=void 0,this.active=!1,this.checkQueue_()}.bind(this),this.Constant_.ANIMATION_LENGTH)},C.prototype.setActionHidden_=function(e){e?this.actionElement_.setAttribute("aria-hidden","true"):this.actionElement_.removeAttribute("aria-hidden")},s.register({constructor:C,classAsString:"MaterialSnackbar",cssClass:"mdl-js-snackbar",widget:!0});var u=function(e){this.element_=e,this.init()};window.MaterialSpinner=u,u.prototype.Constant_={MDL_SPINNER_LAYER_COUNT:4},u.prototype.CssClasses_={MDL_SPINNER_LAYER:"mdl-spinner__layer",MDL_SPINNER_CIRCLE_CLIPPER:"mdl-spinner__circle-clipper",MDL_SPINNER_CIRCLE:"mdl-spinner__circle",MDL_SPINNER_GAP_PATCH:"mdl-spinner__gap-patch",MDL_SPINNER_LEFT:"mdl-spinner__left",MDL_SPINNER_RIGHT:"mdl-spinner__right"},u.prototype.createLayer=function(e){var t=document.createElement("div");t.classList.add(this.CssClasses_.MDL_SPINNER_LAYER),t.classList.add(this.CssClasses_.MDL_SPINNER_LAYER+"-"+e);var s=document.createElement("div");s.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE_CLIPPER),s.classList.add(this.CssClasses_.MDL_SPINNER_LEFT);var i=document.createElement("div");i.classList.add(this.CssClasses_.MDL_SPINNER_GAP_PATCH);var n=document.createElement("div");n.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE_CLIPPER),n.classList.add(this.CssClasses_.MDL_SPINNER_RIGHT);for(var a=[s,i,n],l=0;l<a.length;l++){var o=document.createElement("div");o.classList.add(this.CssClasses_.MDL_SPINNER_CIRCLE),a[l].appendChild(o)}t.appendChild(s),t.appendChild(i),t.appendChild(n),this.element_.appendChild(t)},u.prototype.createLayer=u.prototype.createLayer,u.prototype.stop=function(){this.element_.classList.remove("is-active")},u.prototype.stop=u.prototype.stop,u.prototype.start=function(){this.element_.classList.add("is-active")},u.prototype.start=u.prototype.start,u.prototype.init=function(){if(this.element_){for(var e=1;e<=this.Constant_.MDL_SPINNER_LAYER_COUNT;e++)this.createLayer(e);this.element_.classList.add("is-upgraded")}},s.register({constructor:u,classAsString:"MaterialSpinner",cssClass:"mdl-js-spinner",widget:!0});var E=function(e){this.element_=e,this.init()};window.MaterialSwitch=E,E.prototype.Constant_={TINY_TIMEOUT:.001},E.prototype.CssClasses_={INPUT:"mdl-switch__input",TRACK:"mdl-switch__track",THUMB:"mdl-switch__thumb",FOCUS_HELPER:"mdl-switch__focus-helper",RIPPLE_EFFECT:"mdl-js-ripple-effect",RIPPLE_IGNORE_EVENTS:"mdl-js-ripple-effect--ignore-events",RIPPLE_CONTAINER:"mdl-switch__ripple-container",RIPPLE_CENTER:"mdl-ripple--center",RIPPLE:"mdl-ripple",IS_FOCUSED:"is-focused",IS_DISABLED:"is-disabled",IS_CHECKED:"is-checked"},E.prototype.onChange_=function(e){this.updateClasses_()},E.prototype.onFocus_=function(e){this.element_.classList.add(this.CssClasses_.IS_FOCUSED)},E.prototype.onBlur_=function(e){this.element_.classList.remove(this.CssClasses_.IS_FOCUSED)},E.prototype.onMouseUp_=function(e){this.blur_()},E.prototype.updateClasses_=function(){this.checkDisabled(),this.checkToggleState()},E.prototype.blur_=function(){window.setTimeout(function(){this.inputElement_.blur()}.bind(this),this.Constant_.TINY_TIMEOUT)},E.prototype.checkDisabled=function(){this.inputElement_.disabled?this.element_.classList.add(this.CssClasses_.IS_DISABLED):this.element_.classList.remove(this.CssClasses_.IS_DISABLED)},E.prototype.checkDisabled=E.prototype.checkDisabled,E.prototype.checkToggleState=function(){this.inputElement_.checked?this.element_.classList.add(this.CssClasses_.IS_CHECKED):this.element_.classList.remove(this.CssClasses_.IS_CHECKED)},E.prototype.checkToggleState=E.prototype.checkToggleState,E.prototype.disable=function(){this.inputElement_.disabled=!0,this.updateClasses_()},E.prototype.disable=E.prototype.disable,E.prototype.enable=function(){this.inputElement_.disabled=!1,this.updateClasses_()},E.prototype.enable=E.prototype.enable,E.prototype.on=function(){this.inputElement_.checked=!0,this.updateClasses_()},E.prototype.on=E.prototype.on,E.prototype.off=function(){this.inputElement_.checked=!1,this.updateClasses_()},E.prototype.off=E.prototype.off,E.prototype.init=function(){if(this.element_){this.inputElement_=this.element_.querySelector("."+this.CssClasses_.INPUT);var e=document.createElement("div");e.classList.add(this.CssClasses_.TRACK);var t=document.createElement("div");t.classList.add(this.CssClasses_.THUMB);var s=document.createElement("span");if(s.classList.add(this.CssClasses_.FOCUS_HELPER),t.appendChild(s),this.element_.appendChild(e),this.element_.appendChild(t),this.boundMouseUpHandler=this.onMouseUp_.bind(this),this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT)){this.element_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS),this.rippleContainerElement_=document.createElement("span"),this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CONTAINER),this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_EFFECT),this.rippleContainerElement_.classList.add(this.CssClasses_.RIPPLE_CENTER),this.rippleContainerElement_.addEventListener("mouseup",this.boundMouseUpHandler);var i=document.createElement("span");i.classList.add(this.CssClasses_.RIPPLE),this.rippleContainerElement_.appendChild(i),this.element_.appendChild(this.rippleContainerElement_)}this.boundChangeHandler=this.onChange_.bind(this),this.boundFocusHandler=this.onFocus_.bind(this),this.boundBlurHandler=this.onBlur_.bind(this),this.inputElement_.addEventListener("change",this.boundChangeHandler),this.inputElement_.addEventListener("focus",this.boundFocusHandler),this.inputElement_.addEventListener("blur",this.boundBlurHandler),this.element_.addEventListener("mouseup",this.boundMouseUpHandler),this.updateClasses_(),this.element_.classList.add("is-upgraded")}},s.register({constructor:E,classAsString:"MaterialSwitch",cssClass:"mdl-js-switch",widget:!0});var m=function(e){this.element_=e,this.init()};window.MaterialTabs=m,m.prototype.Constant_={},m.prototype.CssClasses_={TAB_CLASS:"mdl-tabs__tab",PANEL_CLASS:"mdl-tabs__panel",ACTIVE_CLASS:"is-active",UPGRADED_CLASS:"is-upgraded",MDL_JS_RIPPLE_EFFECT:"mdl-js-ripple-effect",MDL_RIPPLE_CONTAINER:"mdl-tabs__ripple-container",MDL_RIPPLE:"mdl-ripple",MDL_JS_RIPPLE_EFFECT_IGNORE_EVENTS:"mdl-js-ripple-effect--ignore-events"},m.prototype.initTabs_=function(){this.element_.classList.contains(this.CssClasses_.MDL_JS_RIPPLE_EFFECT)&&this.element_.classList.add(this.CssClasses_.MDL_JS_RIPPLE_EFFECT_IGNORE_EVENTS),this.tabs_=this.element_.querySelectorAll("."+this.CssClasses_.TAB_CLASS),this.panels_=this.element_.querySelectorAll("."+this.CssClasses_.PANEL_CLASS);for(var t=0;t<this.tabs_.length;t++)new e(this.tabs_[t],this);this.element_.classList.add(this.CssClasses_.UPGRADED_CLASS)},m.prototype.resetTabState_=function(){for(var e=0;e<this.tabs_.length;e++)this.tabs_[e].classList.remove(this.CssClasses_.ACTIVE_CLASS)},m.prototype.resetPanelState_=function(){for(var e=0;e<this.panels_.length;e++)this.panels_[e].classList.remove(this.CssClasses_.ACTIVE_CLASS)},m.prototype.init=function(){this.element_&&this.initTabs_()},s.register({constructor:m,classAsString:"MaterialTabs",cssClass:"mdl-js-tabs"});var L=function(e){this.element_=e,this.maxRows=this.Constant_.NO_MAX_ROWS,this.init()};window.MaterialTextfield=L,L.prototype.Constant_={NO_MAX_ROWS:-1,MAX_ROWS_ATTRIBUTE:"maxrows"},L.prototype.CssClasses_={LABEL:"mdl-textfield__label",INPUT:"mdl-textfield__input",IS_DIRTY:"is-dirty",IS_FOCUSED:"is-focused",IS_DISABLED:"is-disabled",IS_INVALID:"is-invalid",IS_UPGRADED:"is-upgraded",HAS_PLACEHOLDER:"has-placeholder"},L.prototype.onKeyDown_=function(e){var t=e.target.value.split("\n").length;13===e.keyCode&&t>=this.maxRows&&e.preventDefault()},L.prototype.onFocus_=function(e){this.element_.classList.add(this.CssClasses_.IS_FOCUSED)},L.prototype.onBlur_=function(e){this.element_.classList.remove(this.CssClasses_.IS_FOCUSED)},L.prototype.onReset_=function(e){this.updateClasses_()},L.prototype.updateClasses_=function(){this.checkDisabled(),this.checkValidity(),this.checkDirty(),this.checkFocus()},L.prototype.checkDisabled=function(){this.input_.disabled?this.element_.classList.add(this.CssClasses_.IS_DISABLED):this.element_.classList.remove(this.CssClasses_.IS_DISABLED)},L.prototype.checkDisabled=L.prototype.checkDisabled,L.prototype.checkFocus=function(){Boolean(this.element_.querySelector(":focus"))?this.element_.classList.add(this.CssClasses_.IS_FOCUSED):this.element_.classList.remove(this.CssClasses_.IS_FOCUSED)},L.prototype.checkFocus=L.prototype.checkFocus,L.prototype.checkValidity=function(){this.input_.validity&&(this.input_.validity.valid?this.element_.classList.remove(this.CssClasses_.IS_INVALID):this.element_.classList.add(this.CssClasses_.IS_INVALID))},L.prototype.checkValidity=L.prototype.checkValidity,L.prototype.checkDirty=function(){this.input_.value&&this.input_.value.length>0?this.element_.classList.add(this.CssClasses_.IS_DIRTY):this.element_.classList.remove(this.CssClasses_.IS_DIRTY)},L.prototype.checkDirty=L.prototype.checkDirty,L.prototype.disable=function(){this.input_.disabled=!0,this.updateClasses_()},L.prototype.disable=L.prototype.disable,L.prototype.enable=function(){this.input_.disabled=!1,this.updateClasses_()},L.prototype.enable=L.prototype.enable,L.prototype.change=function(e){this.input_.value=e||"",this.updateClasses_()},L.prototype.change=L.prototype.change,L.prototype.init=function(){if(this.element_&&(this.label_=this.element_.querySelector("."+this.CssClasses_.LABEL),this.input_=this.element_.querySelector("."+this.CssClasses_.INPUT),this.input_)){this.input_.hasAttribute(this.Constant_.MAX_ROWS_ATTRIBUTE)&&(this.maxRows=parseInt(this.input_.getAttribute(this.Constant_.MAX_ROWS_ATTRIBUTE),10),isNaN(this.maxRows)&&(this.maxRows=this.Constant_.NO_MAX_ROWS)),this.input_.hasAttribute("placeholder")&&this.element_.classList.add(this.CssClasses_.HAS_PLACEHOLDER),this.boundUpdateClassesHandler=this.updateClasses_.bind(this),this.boundFocusHandler=this.onFocus_.bind(this),this.boundBlurHandler=this.onBlur_.bind(this),this.boundResetHandler=this.onReset_.bind(this),this.input_.addEventListener("input",this.boundUpdateClassesHandler),this.input_.addEventListener("focus",this.boundFocusHandler),this.input_.addEventListener("blur",this.boundBlurHandler),this.input_.addEventListener("reset",this.boundResetHandler),this.maxRows!==this.Constant_.NO_MAX_ROWS&&(this.boundKeyDownHandler=this.onKeyDown_.bind(this),this.input_.addEventListener("keydown",this.boundKeyDownHandler));var e=this.element_.classList.contains(this.CssClasses_.IS_INVALID);this.updateClasses_(),this.element_.classList.add(this.CssClasses_.IS_UPGRADED),e&&this.element_.classList.add(this.CssClasses_.IS_INVALID),this.input_.hasAttribute("autofocus")&&(this.element_.focus(),this.checkFocus())}},s.register({constructor:L,classAsString:"MaterialTextfield",cssClass:"mdl-js-textfield",widget:!0});var I=function(e){this.element_=e,this.init()};window.MaterialTooltip=I,I.prototype.Constant_={},I.prototype.CssClasses_={IS_ACTIVE:"is-active",BOTTOM:"mdl-tooltip--bottom",LEFT:"mdl-tooltip--left",RIGHT:"mdl-tooltip--right",TOP:"mdl-tooltip--top"},I.prototype.handleMouseEnter_=function(e){var t=e.target.getBoundingClientRect(),s=t.left+t.width/2,i=t.top+t.height/2,n=-1*(this.element_.offsetWidth/2),a=-1*(this.element_.offsetHeight/2);this.element_.classList.contains(this.CssClasses_.LEFT)||this.element_.classList.contains(this.CssClasses_.RIGHT)?(s=t.width/2,i+a<0?(this.element_.style.top="0",this.element_.style.marginTop="0"):(this.element_.style.top=i+"px",this.element_.style.marginTop=a+"px")):s+n<0?(this.element_.style.left="0",this.element_.style.marginLeft="0"):(this.element_.style.left=s+"px",this.element_.style.marginLeft=n+"px"),this.element_.classList.contains(this.CssClasses_.TOP)?this.element_.style.top=t.top-this.element_.offsetHeight-10+"px":this.element_.classList.contains(this.CssClasses_.RIGHT)?this.element_.style.left=t.left+t.width+10+"px":this.element_.classList.contains(this.CssClasses_.LEFT)?this.element_.style.left=t.left-this.element_.offsetWidth-10+"px":this.element_.style.top=t.top+t.height+10+"px",this.element_.classList.add(this.CssClasses_.IS_ACTIVE)},I.prototype.hideTooltip_=function(){this.element_.classList.remove(this.CssClasses_.IS_ACTIVE)},I.prototype.init=function(){if(this.element_){var e=this.element_.getAttribute("for")||this.element_.getAttribute("data-mdl-for");e&&(this.forElement_=document.getElementById(e)),this.forElement_&&(this.forElement_.hasAttribute("tabindex")||this.forElement_.setAttribute("tabindex","0"),this.boundMouseEnterHandler=this.handleMouseEnter_.bind(this),this.boundMouseLeaveAndScrollHandler=this.hideTooltip_.bind(this),this.forElement_.addEventListener("mouseenter",this.boundMouseEnterHandler,!1),this.forElement_.addEventListener("touchend",this.boundMouseEnterHandler,!1),this.forElement_.addEventListener("mouseleave",this.boundMouseLeaveAndScrollHandler,!1),window.addEventListener("scroll",this.boundMouseLeaveAndScrollHandler,!0),window.addEventListener("touchstart",this.boundMouseLeaveAndScrollHandler))}},s.register({constructor:I,classAsString:"MaterialTooltip",cssClass:"mdl-tooltip"});var f=function(e){this.element_=e,this.init()};window.MaterialLayout=f,f.prototype.Constant_={MAX_WIDTH:"(max-width: 1024px)",TAB_SCROLL_PIXELS:100,RESIZE_TIMEOUT:100,MENU_ICON:"&#xE5D2;",CHEVRON_LEFT:"chevron_left",CHEVRON_RIGHT:"chevron_right"},f.prototype.Keycodes_={ENTER:13,ESCAPE:27,SPACE:32},f.prototype.Mode_={STANDARD:0,SEAMED:1,WATERFALL:2,SCROLL:3},f.prototype.CssClasses_={CONTAINER:"mdl-layout__container",HEADER:"mdl-layout__header",DRAWER:"mdl-layout__drawer",CONTENT:"mdl-layout__content",DRAWER_BTN:"mdl-layout__drawer-button",ICON:"material-icons",JS_RIPPLE_EFFECT:"mdl-js-ripple-effect",RIPPLE_CONTAINER:"mdl-layout__tab-ripple-container",RIPPLE:"mdl-ripple",RIPPLE_IGNORE_EVENTS:"mdl-js-ripple-effect--ignore-events",HEADER_SEAMED:"mdl-layout__header--seamed",HEADER_WATERFALL:"mdl-layout__header--waterfall",HEADER_SCROLL:"mdl-layout__header--scroll",FIXED_HEADER:"mdl-layout--fixed-header",OBFUSCATOR:"mdl-layout__obfuscator",TAB_BAR:"mdl-layout__tab-bar",TAB_CONTAINER:"mdl-layout__tab-bar-container",TAB:"mdl-layout__tab",TAB_BAR_BUTTON:"mdl-layout__tab-bar-button",TAB_BAR_LEFT_BUTTON:"mdl-layout__tab-bar-left-button",TAB_BAR_RIGHT_BUTTON:"mdl-layout__tab-bar-right-button",TAB_MANUAL_SWITCH:"mdl-layout__tab-manual-switch",PANEL:"mdl-layout__tab-panel",HAS_DRAWER:"has-drawer",HAS_TABS:"has-tabs",HAS_SCROLLING_HEADER:"has-scrolling-header",CASTING_SHADOW:"is-casting-shadow",IS_COMPACT:"is-compact",IS_SMALL_SCREEN:"is-small-screen",IS_DRAWER_OPEN:"is-visible",IS_ACTIVE:"is-active",IS_UPGRADED:"is-upgraded",IS_ANIMATING:"is-animating",ON_LARGE_SCREEN:"mdl-layout--large-screen-only",ON_SMALL_SCREEN:"mdl-layout--small-screen-only"},f.prototype.contentScrollHandler_=function(){if(!this.header_.classList.contains(this.CssClasses_.IS_ANIMATING)){var e=!this.element_.classList.contains(this.CssClasses_.IS_SMALL_SCREEN)||this.element_.classList.contains(this.CssClasses_.FIXED_HEADER);this.content_.scrollTop>0&&!this.header_.classList.contains(this.CssClasses_.IS_COMPACT)?(this.header_.classList.add(this.CssClasses_.CASTING_SHADOW),this.header_.classList.add(this.CssClasses_.IS_COMPACT),e&&this.header_.classList.add(this.CssClasses_.IS_ANIMATING)):this.content_.scrollTop<=0&&this.header_.classList.contains(this.CssClasses_.IS_COMPACT)&&(this.header_.classList.remove(this.CssClasses_.CASTING_SHADOW),this.header_.classList.remove(this.CssClasses_.IS_COMPACT),e&&this.header_.classList.add(this.CssClasses_.IS_ANIMATING))}},f.prototype.keyboardEventHandler_=function(e){e.keyCode===this.Keycodes_.ESCAPE&&this.drawer_.classList.contains(this.CssClasses_.IS_DRAWER_OPEN)&&this.toggleDrawer()},f.prototype.screenSizeHandler_=function(){this.screenSizeMediaQuery_.matches?this.element_.classList.add(this.CssClasses_.IS_SMALL_SCREEN):(this.element_.classList.remove(this.CssClasses_.IS_SMALL_SCREEN),this.drawer_&&(this.drawer_.classList.remove(this.CssClasses_.IS_DRAWER_OPEN),this.obfuscator_.classList.remove(this.CssClasses_.IS_DRAWER_OPEN)))},f.prototype.drawerToggleHandler_=function(e){if(e&&"keydown"===e.type){if(e.keyCode!==this.Keycodes_.SPACE&&e.keyCode!==this.Keycodes_.ENTER)return;e.preventDefault()}this.toggleDrawer()},f.prototype.headerTransitionEndHandler_=function(){this.header_.classList.remove(this.CssClasses_.IS_ANIMATING)},f.prototype.headerClickHandler_=function(){this.header_.classList.contains(this.CssClasses_.IS_COMPACT)&&(this.header_.classList.remove(this.CssClasses_.IS_COMPACT),this.header_.classList.add(this.CssClasses_.IS_ANIMATING))},f.prototype.resetTabState_=function(e){for(var t=0;t<e.length;t++)e[t].classList.remove(this.CssClasses_.IS_ACTIVE)},f.prototype.resetPanelState_=function(e){for(var t=0;t<e.length;t++)e[t].classList.remove(this.CssClasses_.IS_ACTIVE)},f.prototype.toggleDrawer=function(){var e=this.element_.querySelector("."+this.CssClasses_.DRAWER_BTN);this.drawer_.classList.toggle(this.CssClasses_.IS_DRAWER_OPEN),this.obfuscator_.classList.toggle(this.CssClasses_.IS_DRAWER_OPEN),this.drawer_.classList.contains(this.CssClasses_.IS_DRAWER_OPEN)?(this.drawer_.setAttribute("aria-hidden","false"),e.setAttribute("aria-expanded","true")):(this.drawer_.setAttribute("aria-hidden","true"),e.setAttribute("aria-expanded","false"))},f.prototype.toggleDrawer=f.prototype.toggleDrawer,f.prototype.init=function(){if(this.element_){var e=document.createElement("div");e.classList.add(this.CssClasses_.CONTAINER);var s=this.element_.querySelector(":focus");this.element_.parentElement.insertBefore(e,this.element_),this.element_.parentElement.removeChild(this.element_),e.appendChild(this.element_),s&&s.focus();for(var i=this.element_.childNodes,n=i.length,a=0;a<n;a++){var l=i[a];l.classList&&l.classList.contains(this.CssClasses_.HEADER)&&(this.header_=l),l.classList&&l.classList.contains(this.CssClasses_.DRAWER)&&(this.drawer_=l),l.classList&&l.classList.contains(this.CssClasses_.CONTENT)&&(this.content_=l)}window.addEventListener("pageshow",function(e){e.persisted&&(this.element_.style.overflowY="hidden",requestAnimationFrame(function(){this.element_.style.overflowY=""}.bind(this)))}.bind(this),!1),this.header_&&(this.tabBar_=this.header_.querySelector("."+this.CssClasses_.TAB_BAR));var o=this.Mode_.STANDARD;if(this.header_&&(this.header_.classList.contains(this.CssClasses_.HEADER_SEAMED)?o=this.Mode_.SEAMED:this.header_.classList.contains(this.CssClasses_.HEADER_WATERFALL)?(o=this.Mode_.WATERFALL,this.header_.addEventListener("transitionend",this.headerTransitionEndHandler_.bind(this)),this.header_.addEventListener("click",this.headerClickHandler_.bind(this))):this.header_.classList.contains(this.CssClasses_.HEADER_SCROLL)&&(o=this.Mode_.SCROLL,e.classList.add(this.CssClasses_.HAS_SCROLLING_HEADER)),o===this.Mode_.STANDARD?(this.header_.classList.add(this.CssClasses_.CASTING_SHADOW),this.tabBar_&&this.tabBar_.classList.add(this.CssClasses_.CASTING_SHADOW)):o===this.Mode_.SEAMED||o===this.Mode_.SCROLL?(this.header_.classList.remove(this.CssClasses_.CASTING_SHADOW),this.tabBar_&&this.tabBar_.classList.remove(this.CssClasses_.CASTING_SHADOW)):o===this.Mode_.WATERFALL&&(this.content_.addEventListener("scroll",this.contentScrollHandler_.bind(this)),this.contentScrollHandler_())),this.drawer_){var r=this.element_.querySelector("."+this.CssClasses_.DRAWER_BTN);if(!r){r=document.createElement("div"),r.setAttribute("aria-expanded","false"),r.setAttribute("role","button"),r.setAttribute("tabindex","0"),r.classList.add(this.CssClasses_.DRAWER_BTN);var _=document.createElement("i");_.classList.add(this.CssClasses_.ICON),_.innerHTML=this.Constant_.MENU_ICON,r.appendChild(_)}this.drawer_.classList.contains(this.CssClasses_.ON_LARGE_SCREEN)?r.classList.add(this.CssClasses_.ON_LARGE_SCREEN):this.drawer_.classList.contains(this.CssClasses_.ON_SMALL_SCREEN)&&r.classList.add(this.CssClasses_.ON_SMALL_SCREEN),r.addEventListener("click",this.drawerToggleHandler_.bind(this)),r.addEventListener("keydown",this.drawerToggleHandler_.bind(this)),this.element_.classList.add(this.CssClasses_.HAS_DRAWER),this.element_.classList.contains(this.CssClasses_.FIXED_HEADER)?this.header_.insertBefore(r,this.header_.firstChild):this.element_.insertBefore(r,this.content_);var d=document.createElement("div");d.classList.add(this.CssClasses_.OBFUSCATOR),this.element_.appendChild(d),d.addEventListener("click",this.drawerToggleHandler_.bind(this)),this.obfuscator_=d,this.drawer_.addEventListener("keydown",this.keyboardEventHandler_.bind(this)),this.drawer_.setAttribute("aria-hidden","true")}if(this.screenSizeMediaQuery_=window.matchMedia(this.Constant_.MAX_WIDTH),this.screenSizeMediaQuery_.addListener(this.screenSizeHandler_.bind(this)),this.screenSizeHandler_(),this.header_&&this.tabBar_){this.element_.classList.add(this.CssClasses_.HAS_TABS);var h=document.createElement("div");h.classList.add(this.CssClasses_.TAB_CONTAINER),this.header_.insertBefore(h,this.tabBar_),this.header_.removeChild(this.tabBar_);var c=document.createElement("div");c.classList.add(this.CssClasses_.TAB_BAR_BUTTON),c.classList.add(this.CssClasses_.TAB_BAR_LEFT_BUTTON);var p=document.createElement("i");p.classList.add(this.CssClasses_.ICON),p.textContent=this.Constant_.CHEVRON_LEFT,c.appendChild(p),c.addEventListener("click",function(){this.tabBar_.scrollLeft-=this.Constant_.TAB_SCROLL_PIXELS}.bind(this));var C=document.createElement("div");C.classList.add(this.CssClasses_.TAB_BAR_BUTTON),C.classList.add(this.CssClasses_.TAB_BAR_RIGHT_BUTTON);var u=document.createElement("i");u.classList.add(this.CssClasses_.ICON),u.textContent=this.Constant_.CHEVRON_RIGHT,C.appendChild(u),C.addEventListener("click",function(){this.tabBar_.scrollLeft+=this.Constant_.TAB_SCROLL_PIXELS}.bind(this)),h.appendChild(c),h.appendChild(this.tabBar_),h.appendChild(C);var E=function(){this.tabBar_.scrollLeft>0?c.classList.add(this.CssClasses_.IS_ACTIVE):c.classList.remove(this.CssClasses_.IS_ACTIVE),this.tabBar_.scrollLeft<this.tabBar_.scrollWidth-this.tabBar_.offsetWidth?C.classList.add(this.CssClasses_.IS_ACTIVE):C.classList.remove(this.CssClasses_.IS_ACTIVE)}.bind(this);this.tabBar_.addEventListener("scroll",E),E();var m=function(){this.resizeTimeoutId_&&clearTimeout(this.resizeTimeoutId_),this.resizeTimeoutId_=setTimeout(function(){E(),this.resizeTimeoutId_=null}.bind(this),this.Constant_.RESIZE_TIMEOUT)}.bind(this);window.addEventListener("resize",m),this.tabBar_.classList.contains(this.CssClasses_.JS_RIPPLE_EFFECT)&&this.tabBar_.classList.add(this.CssClasses_.RIPPLE_IGNORE_EVENTS);for(var L=this.tabBar_.querySelectorAll("."+this.CssClasses_.TAB),I=this.content_.querySelectorAll("."+this.CssClasses_.PANEL),f=0;f<L.length;f++)new t(L[f],L,I,this)}this.element_.classList.add(this.CssClasses_.IS_UPGRADED)}},window.MaterialLayoutTab=t,s.register({constructor:f,classAsString:"MaterialLayout",cssClass:"mdl-js-layout"});var b=function(e){this.element_=e,this.init()};window.MaterialDataTable=b,b.prototype.Constant_={},b.prototype.CssClasses_={DATA_TABLE:"mdl-data-table",SELECTABLE:"mdl-data-table--selectable",SELECT_ELEMENT:"mdl-data-table__select",IS_SELECTED:"is-selected",IS_UPGRADED:"is-upgraded"},b.prototype.selectRow_=function(e,t,s){return t?function(){e.checked?t.classList.add(this.CssClasses_.IS_SELECTED):t.classList.remove(this.CssClasses_.IS_SELECTED)}.bind(this):s?function(){var t,i;if(e.checked)for(t=0;t<s.length;t++)i=s[t].querySelector("td").querySelector(".mdl-checkbox"),i.MaterialCheckbox.check(),s[t].classList.add(this.CssClasses_.IS_SELECTED);else for(t=0;t<s.length;t++)i=s[t].querySelector("td").querySelector(".mdl-checkbox"),i.MaterialCheckbox.uncheck(),s[t].classList.remove(this.CssClasses_.IS_SELECTED)}.bind(this):void 0},b.prototype.createCheckbox_=function(e,t){var i=document.createElement("label"),n=["mdl-checkbox","mdl-js-checkbox","mdl-js-ripple-effect",this.CssClasses_.SELECT_ELEMENT];i.className=n.join(" ");var a=document.createElement("input");return a.type="checkbox",a.classList.add("mdl-checkbox__input"),e?(a.checked=e.classList.contains(this.CssClasses_.IS_SELECTED),a.addEventListener("change",this.selectRow_(a,e))):t&&a.addEventListener("change",this.selectRow_(a,null,t)),i.appendChild(a),s.upgradeElement(i,"MaterialCheckbox"),i},b.prototype.init=function(){if(this.element_){var e=this.element_.querySelector("th"),t=Array.prototype.slice.call(this.element_.querySelectorAll("tbody tr")),s=Array.prototype.slice.call(this.element_.querySelectorAll("tfoot tr")),i=t.concat(s);if(this.element_.classList.contains(this.CssClasses_.SELECTABLE)){var n=document.createElement("th"),a=this.createCheckbox_(null,i);n.appendChild(a),e.parentElement.insertBefore(n,e);for(var l=0;l<i.length;l++){var o=i[l].querySelector("td");if(o){var r=document.createElement("td");if("TBODY"===i[l].parentNode.nodeName.toUpperCase()){var _=this.createCheckbox_(i[l]);r.appendChild(_)}i[l].insertBefore(r,o)}}this.element_.classList.add(this.CssClasses_.IS_UPGRADED)}}},s.register({constructor:b,classAsString:"MaterialDataTable",cssClass:"mdl-js-data-table"});var S=function(e){this.element_=e,this.init()};window.MaterialRipple=S,S.prototype.Constant_={INITIAL_SCALE:"scale(0.0001, 0.0001)",INITIAL_SIZE:"1px",INITIAL_OPACITY:"0.4",FINAL_OPACITY:"0",FINAL_SCALE:""},S.prototype.CssClasses_={RIPPLE_CENTER:"mdl-ripple--center",RIPPLE_EFFECT_IGNORE_EVENTS:"mdl-js-ripple-effect--ignore-events",RIPPLE:"mdl-ripple",IS_ANIMATING:"is-animating",IS_VISIBLE:"is-visible"},S.prototype.downHandler_=function(e){if(!this.rippleElement_.style.width&&!this.rippleElement_.style.height){var t=this.element_.getBoundingClientRect();this.boundHeight=t.height,this.boundWidth=t.width,this.rippleSize_=2*Math.sqrt(t.width*t.width+t.height*t.height)+2,this.rippleElement_.style.width=this.rippleSize_+"px",this.rippleElement_.style.height=this.rippleSize_+"px"}if(this.rippleElement_.classList.add(this.CssClasses_.IS_VISIBLE),"mousedown"===e.type&&this.ignoringMouseDown_)this.ignoringMouseDown_=!1;else{"touchstart"===e.type&&(this.ignoringMouseDown_=!0);var s=this.getFrameCount();if(s>0)return;this.setFrameCount(1);var i,n,a=e.currentTarget.getBoundingClientRect();if(0===e.clientX&&0===e.clientY)i=Math.round(a.width/2),n=Math.round(a.height/2);else{var l=void 0!==e.clientX?e.clientX:e.touches[0].clientX,o=void 0!==e.clientY?e.clientY:e.touches[0].clientY;i=Math.round(l-a.left),n=Math.round(o-a.top)}this.setRippleXY(i,n),this.setRippleStyles(!0),window.requestAnimationFrame(this.animFrameHandler.bind(this))}},S.prototype.upHandler_=function(e){e&&2!==e.detail&&window.setTimeout(function(){this.rippleElement_.classList.remove(this.CssClasses_.IS_VISIBLE)}.bind(this),0)},S.prototype.init=function(){if(this.element_){var e=this.element_.classList.contains(this.CssClasses_.RIPPLE_CENTER);this.element_.classList.contains(this.CssClasses_.RIPPLE_EFFECT_IGNORE_EVENTS)||(this.rippleElement_=this.element_.querySelector("."+this.CssClasses_.RIPPLE),this.frameCount_=0,this.rippleSize_=0,this.x_=0,this.y_=0,this.ignoringMouseDown_=!1,this.boundDownHandler=this.downHandler_.bind(this),this.element_.addEventListener("mousedown",this.boundDownHandler),this.element_.addEventListener("touchstart",this.boundDownHandler),this.boundUpHandler=this.upHandler_.bind(this),this.element_.addEventListener("mouseup",this.boundUpHandler),this.element_.addEventListener("mouseleave",this.boundUpHandler),this.element_.addEventListener("touchend",this.boundUpHandler),this.element_.addEventListener("blur",this.boundUpHandler),this.getFrameCount=function(){return this.frameCount_},this.setFrameCount=function(e){this.frameCount_=e},this.getRippleElement=function(){return this.rippleElement_},this.setRippleXY=function(e,t){this.x_=e,this.y_=t},this.setRippleStyles=function(t){if(null!==this.rippleElement_){var s,i,n,a="translate("+this.x_+"px, "+this.y_+"px)";t?(i=this.Constant_.INITIAL_SCALE,n=this.Constant_.INITIAL_SIZE):(i=this.Constant_.FINAL_SCALE,n=this.rippleSize_+"px",e&&(a="translate("+this.boundWidth/2+"px, "+this.boundHeight/2+"px)")),s="translate(-50%, -50%) "+a+i,this.rippleElement_.style.webkitTransform=s,this.rippleElement_.style.msTransform=s,this.rippleElement_.style.transform=s,t?this.rippleElement_.classList.remove(this.CssClasses_.IS_ANIMATING):this.rippleElement_.classList.add(this.CssClasses_.IS_ANIMATING)}},this.animFrameHandler=function(){this.frameCount_-- >0?window.requestAnimationFrame(this.animFrameHandler.bind(this)):this.setRippleStyles(!1)})}},s.register({constructor:S,classAsString:"MaterialRipple",cssClass:"mdl-js-ripple-effect",widget:!1})}();
//# sourceMappingURL=material.min.js.map

function showLoading() {
    // remove existing loaders
  $('.loading-container').remove();
  $('<div id="orrsLoader" class="loading-container"><div><div class="mdl-spinner mdl-js-spinner is-active"></div></div></div>').appendTo('body');

  componentHandler.upgradeElements($('.mdl-spinner').get());
  setTimeout(function () {
    $('#orrsLoader').css({opacity: 1});
  }, 1);
}

function hideLoading() {
  $('#orrsLoader').css({opacity: 0});
  setTimeout(function () {
    $('#orrsLoader').remove();
  }, 400);
}

function showDialog(options) {
  options = $.extend({
    id: 'orrsDiag',
    title: null,
    text: null,
    neutral: false,
    negative: false,
    positive: false,
    cancelable: true,
    contentStyle: null,
    onLoaded: false,
    hideOther: true
  }, options);

  if (options.hideOther) {
        // remove existing dialogs
    $('.dialog-container').remove();
    $(document).unbind('keyup.dialog');
  }

  $('<div id="' + options.id + '" class="dialog-container"><div class="mdl-card mdl-shadow--16dp" id="' + options.id + '_content"></div></div>').appendTo('body');
  var dialog = $('#' + options.id);
  var content = dialog.find('.mdl-card');
  if (options.contentStyle != null) content.css(options.contentStyle);
  if (options.title != null) {
    $('<h5>' + options.title + '</h5>').appendTo(content);
  }
  if (options.text != null) {
    $('<p>' + options.text + '</p>').appendTo(content);
  }
  if (options.neutral || options.negative || options.positive) {
    var buttonBar = $('<div class="mdl-card__actions dialog-button-bar"></div>');
    if (options.neutral) {
      options.neutral = $.extend({
        id: 'neutral',
        title: 'Neutral',
        onClick: null
      }, options.neutral);
      var neuButton = $('<button class="mdl-button mdl-js-button mdl-js-ripple-effect" id="' + options.neutral.id + '">' + options.neutral.title + '</button>');
      neuButton.click(function (e) {
        e.preventDefault();
        if (options.neutral.onClick == null || !options.neutral.onClick(e))
          hideDialog(dialog);
      });
      neuButton.appendTo(buttonBar);
    }
    if (options.negative) {
      options.negative = $.extend({
        id: 'negative',
        title: 'Cancel',
        onClick: null
      }, options.negative);
      var negButton = $('<button class="mdl-button mdl-js-button mdl-js-ripple-effect" id="' + options.negative.id + '">' + options.negative.title + '</button>');
      negButton.click(function (e) {
        e.preventDefault();
        if (options.negative.onClick == null || !options.negative.onClick(e))
          hideDialog(dialog);
      });
      negButton.appendTo(buttonBar);
    }
    if (options.positive) {
      options.positive = $.extend({
        id: 'positive',
        title: 'OK',
        onClick: null
      }, options.positive);
      var posButton = $('<button class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect" id="' + options.positive.id + '">' + options.positive.title + '</button>');
      posButton.click(function (e) {
        e.preventDefault();
        if (options.positive.onClick == null || !options.positive.onClick(e))
          hideDialog(dialog);
      });
      posButton.appendTo(buttonBar);
    }
    buttonBar.appendTo(content);
  }
  componentHandler.upgradeDom();
  if (options.cancelable) {
    dialog.click(function () {
      hideDialog(dialog);
    });
    $(document).bind('keyup.dialog', function (e) {
      if (e.which == 27)
        hideDialog(dialog);
    });
    content.click(function (e) {
      e.stopPropagation();
    });
  }
  setTimeout(function () {
    dialog.css({opacity: 1});
    if (options.onLoaded)
      options.onLoaded();
  }, 1);
}

function hideDialog(dialog) {
  $(document).unbind('keyup.dialog');
  dialog.css({opacity: 0});
  setTimeout(function () {
    dialog.remove();
  }, 400);
}
(function(){/*
 OverlappingMarkerSpiderfier
https://github.com/jawj/OverlappingMarkerSpiderfier
Copyright (c) 2011 - 2012 George MacKerron
Released under the MIT licence: http://opensource.org/licenses/mit-license
Note: The Google Maps API v3 must be included *before* this code
*/
  var h=!0,u=null,v=!1;
  (function(){var A,B={}.hasOwnProperty,C=[].slice;if(((A=this.google)!=u?A.maps:void 0)!=u)this.OverlappingMarkerSpiderfier=function(){function w(b,d){var a,g,f,e,c=this;this.map=b;d==u&&(d={});for(a in d)B.call(d,a)&&(g=d[a],this[a]=g);this.e=new this.constructor.g(this.map);this.n();this.b={};e=['click','zoom_changed','maptypeid_changed'];g=0;for(f=e.length;g<f;g++)a=e[g],p.addListener(this.map,a,function(){return c.unspiderfy();});}var p,s,t,q,k,c,y,z;c=w.prototype;z=[w,c];q=0;for(k=z.length;q<k;q++)t=
z[q],t.VERSION='0.3.3';s=google.maps;p=s.event;k=s.MapTypeId;y=2*Math.PI;c.keepSpiderfied=v;c.markersWontHide=v;c.markersWontMove=v;c.nearbyDistance=20;c.circleSpiralSwitchover=9;c.circleFootSeparation=23;c.circleStartAngle=y/12;c.spiralFootSeparation=26;c.spiralLengthStart=11;c.spiralLengthFactor=4;c.spiderfiedZIndex=1E3;c.usualLegZIndex=10;c.highlightedLegZIndex=20;c.legWeight=1.5;c.legColors={usual:{},highlighted:{}};q=c.legColors.usual;t=c.legColors.highlighted;q[k.HYBRID]=q[k.SATELLITE]='#fff';
    t[k.HYBRID]=t[k.SATELLITE]='#f00';q[k.TERRAIN]=q[k.ROADMAP]='#444';t[k.TERRAIN]=t[k.ROADMAP]='#f00';c.n=function(){this.a=[];this.j=[];};c.addMarker=function(b){var d,a=this;if(b._oms!=u)return this;b._oms=h;d=[p.addListener(b,'click',function(d){return a.F(b,d);})];this.markersWontHide||d.push(p.addListener(b,'visible_changed',function(){return a.o(b,v);}));this.markersWontMove||d.push(p.addListener(b,'position_changed',function(){return a.o(b,h);}));this.j.push(d);this.a.push(b);return this;};c.o=function(b,
d){if(b._omsData!=u&&(d||!b.getVisible())&&!(this.s!=u||this.t!=u))return this.unspiderfy(d?b:u);};c.getMarkers=function(){return this.a.slice(0);};c.removeMarker=function(b){var d,a,g,f,e;b._omsData!=u&&this.unspiderfy();d=this.m(this.a,b);if(0>d)return this;g=this.j.splice(d,1)[0];f=0;for(e=g.length;f<e;f++)a=g[f],p.removeListener(a);delete b._oms;this.a.splice(d,1);return this;};c.clearMarkers=function(){var b,d,a,g,f,e,c,m;this.unspiderfy();m=this.a;b=g=0;for(e=m.length;g<e;b=++g){a=m[b];d=this.j[b];
  f=0;for(c=d.length;f<c;f++)b=d[f],p.removeListener(b);delete a._oms;}this.n();return this;};c.addListener=function(b,d){var a,g;((g=(a=this.b)[b])!=u?g:a[b]=[]).push(d);return this;};c.removeListener=function(b,d){var a;a=this.m(this.b[b],d);0>a||this.b[b].splice(a,1);return this;};c.clearListeners=function(b){this.b[b]=[];return this;};c.trigger=function(){var b,d,a,g,f,e;d=arguments[0];b=2<=arguments.length?C.call(arguments,1):[];d=(a=this.b[d])!=u?a:[];e=[];g=0;for(f=d.length;g<f;g++)a=d[g],e.push(a.apply(u,
b));return e;};c.u=function(b,d){var a,g,f,e,c;f=this.circleFootSeparation*(2+b)/y;g=y/b;c=[];for(a=e=0;0<=b?e<b:e>b;a=0<=b?++e:--e)a=this.circleStartAngle+a*g,c.push(new s.Point(d.x+f*Math.cos(a),d.y+f*Math.sin(a)));return c;};c.v=function(b,d){var a,g,f,e,c;f=this.spiralLengthStart;a=0;c=[];for(g=e=0;0<=b?e<b:e>b;g=0<=b?++e:--e)a+=this.spiralFootSeparation/f+5E-4*g,g=new s.Point(d.x+f*Math.cos(a),d.y+f*Math.sin(a)),f+=y*this.spiralLengthFactor/a,c.push(g);return c;};c.F=function(b,d){var a,g,f,e,c,
  m,l,x,n;e=b._omsData!=u;(!e||!this.keepSpiderfied)&&this.unspiderfy();if(e||this.map.getStreetView().getVisible()||'GoogleEarthAPI'===this.map.getMapTypeId())return this.trigger('click',b,d);e=[];c=[];a=this.nearbyDistance;m=a*a;f=this.c(b.position);n=this.a;l=0;for(x=n.length;l<x;l++)a=n[l],a.map!=u&&a.getVisible()&&(g=this.c(a.position),this.f(g,f)<m?e.push({A:a,p:g}):c.push(a));return 1===e.length?this.trigger('click',b,d):this.G(e,c);};c.markersNearMarker=function(b,d){var a,g,f,e,c,m,l,x,n,p;
    d==u&&(d=v);if(this.e.getProjection()==u)throw'Must wait for \'idle\' event on map before calling markersNearMarker';a=this.nearbyDistance;c=a*a;f=this.c(b.position);e=[];x=this.a;m=0;for(l=x.length;m<l;m++)if(a=x[m],!(a===b||a.map==u||!a.getVisible()))if(g=this.c((n=(p=a._omsData)!=u?p.l:void 0)!=u?n:a.position),this.f(g,f)<c&&(e.push(a),d))break;return e;};c.markersNearAnyOtherMarker=function(){var b,d,a,g,c,e,r,m,l,p,n,k;if(this.e.getProjection()==u)throw'Must wait for \'idle\' event on map before calling markersNearAnyOtherMarker';
      e=this.nearbyDistance;b=e*e;g=this.a;e=[];n=0;for(a=g.length;n<a;n++)d=g[n],e.push({q:this.c((r=(l=d._omsData)!=u?l.l:void 0)!=u?r:d.position),d:v});n=this.a;d=r=0;for(l=n.length;r<l;d=++r)if(a=n[d],a.map!=u&&a.getVisible()&&(g=e[d],!g.d)){k=this.a;a=m=0;for(p=k.length;m<p;a=++m)if(c=k[a],a!==d&&(c.map!=u&&c.getVisible())&&(c=e[a],(!(a<d)||c.d)&&this.f(g.q,c.q)<b)){g.d=c.d=h;break;}}n=this.a;a=[];b=r=0;for(l=n.length;r<l;b=++r)d=n[b],e[b].d&&a.push(d);return a;};c.z=function(b){var d=this;return{h:function(){return b._omsData.i.setOptions({strokeColor:d.legColors.highlighted[d.map.mapTypeId],
zIndex:d.highlightedLegZIndex});},k:function(){return b._omsData.i.setOptions({strokeColor:d.legColors.usual[d.map.mapTypeId],zIndex:d.usualLegZIndex});}};};c.G=function(b,d){var a,c,f,e,r,m,l,k,n,q;this.s=h;q=b.length;a=this.C(function(){var a,d,c;c=[];a=0;for(d=b.length;a<d;a++)k=b[a],c.push(k.p);return c;}());e=q>=this.circleSpiralSwitchover?this.v(q,a).reverse():this.u(q,a);a=function(){var a,d,k,q=this;k=[];a=0;for(d=e.length;a<d;a++)f=e[a],c=this.D(f),n=this.B(b,function(a){return q.f(a.p,f);}),
l=n.A,m=new s.Polyline({map:this.map,path:[l.position,c],strokeColor:this.legColors.usual[this.map.mapTypeId],strokeWeight:this.legWeight,zIndex:this.usualLegZIndex}),l._omsData={l:l.position,i:m},this.legColors.highlighted[this.map.mapTypeId]!==this.legColors.usual[this.map.mapTypeId]&&(r=this.z(l),l._omsData.w={h:p.addListener(l,'mouseover',r.h),k:p.addListener(l,'mouseout',r.k)}),l.setPosition(c),l.setZIndex(Math.round(this.spiderfiedZIndex+f.y)),k.push(l);return k;}.call(this);delete this.s;this.r=
h;return this.trigger('spiderfy',a,d);};c.unspiderfy=function(b){var d,a,c,f,e,k,m;b==u&&(b=u);if(this.r==u)return this;this.t=h;f=[];c=[];m=this.a;e=0;for(k=m.length;e<k;e++)a=m[e],a._omsData!=u?(a._omsData.i.setMap(u),a!==b&&a.setPosition(a._omsData.l),a.setZIndex(u),d=a._omsData.w,d!=u&&(p.removeListener(d.h),p.removeListener(d.k)),delete a._omsData,f.push(a)):c.push(a);delete this.t;delete this.r;this.trigger('unspiderfy',f,c);return this;};c.f=function(b,d){var a,c;a=b.x-d.x;c=b.y-d.y;return a*
a+c*c;};c.C=function(b){var d,a,c,f,e;f=a=c=0;for(e=b.length;f<e;f++)d=b[f],a+=d.x,c+=d.y;b=b.length;return new s.Point(a/b,c/b);};c.c=function(b){return this.e.getProjection().fromLatLngToDivPixel(b);};c.D=function(b){return this.e.getProjection().fromDivPixelToLatLng(b);};c.B=function(b,c){var a,g,f,e,k,m;f=k=0;for(m=b.length;k<m;f=++k)if(e=b[f],e=c(e),'undefined'===typeof a||a===u||e<g)g=e,a=f;return b.splice(a,1)[0];};c.m=function(b,c){var a,g,f,e;if(b.indexOf!=u)return b.indexOf(c);a=f=0;for(e=b.length;f<
e;a=++f)if(g=b[a],g===c)return a;return-1;};w.g=function(b){return this.setMap(b);};w.g.prototype=new s.OverlayView;w.g.prototype.draw=function(){};return w;}();}).call(this);}).call(this);
/* Tue 7 May 2013 14:56:02 BST */

(function(f){if(typeof exports==='object'&&typeof module!=='undefined'){module.exports=f();}else if(typeof define==='function'&&define.amd){define([],f);}else{var g;if(typeof window!=='undefined'){g=window;}else if(typeof global!=='undefined'){g=global;}else if(typeof self!=='undefined'){g=self;}else{g=this;}g.Recorder = f();}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=='function'&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error('Cannot find module \''+o+'\'');throw f.code='MODULE_NOT_FOUND',f;}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e);},l,l.exports,e,t,n,r);}return n[o].exports;}var i=typeof require=='function'&&require;for(var o=0;o<r.length;o++)s(r[o]);return s;})({1:[function(require,module,exports){
  'use strict';

  module.exports = require('./recorder').Recorder;

},{'./recorder':2}],2:[function(require,module,exports){
  'use strict';

  var _createClass = (function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ('value' in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
      }
    }return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
    };
  })();

  Object.defineProperty(exports, '__esModule', {
    value: true
  });
  exports.Recorder = undefined;

  var _inlineWorker = require('inline-worker');

  var _inlineWorker2 = _interopRequireDefault(_inlineWorker);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError('Cannot call a class as a function');
    }
  }

  var Recorder = exports.Recorder = (function () {
    function Recorder(source, cfg) {
      var _this = this;

      _classCallCheck(this, Recorder);

      this.config = {
        bufferLen: 4096,
        numChannels: 2,
        mimeType: 'audio/wav'
      };
      this.recording = false;
      this.callbacks = {
        getBuffer: [],
        exportWAV: []
      };

      Object.assign(this.config, cfg);
      this.context = source.context;
      this.node = (this.context.createScriptProcessor || this.context.createJavaScriptNode).call(this.context, this.config.bufferLen, this.config.numChannels, this.config.numChannels);

      this.node.onaudioprocess = function (e) {
        if (!_this.recording) return;

        var buffer = [];
        for (var channel = 0; channel < _this.config.numChannels; channel++) {
          buffer.push(e.inputBuffer.getChannelData(channel));
        }
        _this.worker.postMessage({
          command: 'record',
          buffer: buffer
        });
      };

      source.connect(this.node);
      this.node.connect(this.context.destination); //this should not be necessary

      var self = {};
      this.worker = new _inlineWorker2.default(function () {
        var recLength = 0,
          recBuffers = [],
          sampleRate = undefined,
          numChannels = undefined;

        self.onmessage = function (e) {
          switch (e.data.command) {
          case 'init':
            init(e.data.config);
            break;
          case 'record':
            record(e.data.buffer);
            break;
          case 'exportWAV':
            exportWAV(e.data.type);
            break;
          case 'getBuffer':
            getBuffer();
            break;
          case 'clear':
            clear();
            break;
          }
        };

        function init(config) {
          sampleRate = config.sampleRate;
          numChannels = config.numChannels;
          initBuffers();
        }

        function record(inputBuffer) {
          for (var channel = 0; channel < numChannels; channel++) {
            recBuffers[channel].push(inputBuffer[channel]);
          }
          recLength += inputBuffer[0].length;
        }

        function exportWAV(type) {
          var buffers = [];
          for (var channel = 0; channel < numChannels; channel++) {
            buffers.push(mergeBuffers(recBuffers[channel], recLength));
          }
          var interleaved = undefined;
          if (numChannels === 2) {
            interleaved = interleave(buffers[0], buffers[1]);
          } else {
            interleaved = buffers[0];
          }
          var dataview = encodeWAV(interleaved);
          var audioBlob = new Blob([dataview], { type: type });

          self.postMessage({ command: 'exportWAV', data: audioBlob });
        }

        function getBuffer() {
          var buffers = [];
          for (var channel = 0; channel < numChannels; channel++) {
            buffers.push(mergeBuffers(recBuffers[channel], recLength));
          }
          self.postMessage({ command: 'getBuffer', data: buffers });
        }

        function clear() {
          recLength = 0;
          recBuffers = [];
          initBuffers();
        }

        function initBuffers() {
          for (var channel = 0; channel < numChannels; channel++) {
            recBuffers[channel] = [];
          }
        }

        function mergeBuffers(recBuffers, recLength) {
          var result = new Float32Array(recLength);
          var offset = 0;
          for (var i = 0; i < recBuffers.length; i++) {
            result.set(recBuffers[i], offset);
            offset += recBuffers[i].length;
          }
          return result;
        }

        function interleave(inputL, inputR) {
          var length = inputL.length + inputR.length;
          var result = new Float32Array(length);

          var index = 0,
            inputIndex = 0;

          while (index < length) {
            result[index++] = inputL[inputIndex];
            result[index++] = inputR[inputIndex];
            inputIndex++;
          }
          return result;
        }

        function floatTo16BitPCM(output, offset, input) {
          for (var i = 0; i < input.length; i++, offset += 2) {
            var s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          }
        }

        function writeString(view, offset, string) {
          for (var i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        }

        function encodeWAV(samples) {
          var buffer = new ArrayBuffer(44 + samples.length * 2);
          var view = new DataView(buffer);

                /* RIFF identifier */
          writeString(view, 0, 'RIFF');
                /* RIFF chunk length */
          view.setUint32(4, 36 + samples.length * 2, true);
                /* RIFF type */
          writeString(view, 8, 'WAVE');
                /* format chunk identifier */
          writeString(view, 12, 'fmt ');
                /* format chunk length */
          view.setUint32(16, 16, true);
                /* sample format (raw) */
          view.setUint16(20, 1, true);
                /* channel count */
          view.setUint16(22, numChannels, true);
                /* sample rate */
          view.setUint32(24, sampleRate, true);
                /* byte rate (sample rate * block align) */
          view.setUint32(28, sampleRate * 4, true);
                /* block align (channel count * bytes per sample) */
          view.setUint16(32, numChannels * 2, true);
                /* bits per sample */
          view.setUint16(34, 16, true);
                /* data chunk identifier */
          writeString(view, 36, 'data');
                /* data chunk length */
          view.setUint32(40, samples.length * 2, true);

          floatTo16BitPCM(view, 44, samples);

          return view;
        }
      }, self);

      this.worker.postMessage({
        command: 'init',
        config: {
          sampleRate: this.context.sampleRate,
          numChannels: this.config.numChannels
        }
      });

      this.worker.onmessage = function (e) {
        var cb = _this.callbacks[e.data.command].pop();
        if (typeof cb == 'function') {
          cb(e.data.data);
        }
      };
    }

    _createClass(Recorder, [{
      key: 'record',
      value: function record() {
        this.recording = true;
      }
    }, {
      key: 'stop',
      value: function stop() {
        this.recording = false;
      }
    }, {
      key: 'clear',
      value: function clear() {
        this.worker.postMessage({ command: 'clear' });
      }
    }, {
      key: 'getBuffer',
      value: function getBuffer(cb) {
        cb = cb || this.config.callback;
        if (!cb) throw new Error('Callback not set');

        this.callbacks.getBuffer.push(cb);

        this.worker.postMessage({ command: 'getBuffer' });
      }
    }, {
      key: 'exportWAV',
      value: function exportWAV(cb, mimeType) {
        mimeType = mimeType || this.config.mimeType;
        cb = cb || this.config.callback;
        if (!cb) throw new Error('Callback not set');

        this.callbacks.exportWAV.push(cb);

        this.worker.postMessage({
          command: 'exportWAV',
          type: mimeType
        });
      }
    }], [{
      key: 'forceDownload',
      value: function forceDownload(blob, filename) {
        var url = (window.URL || window.webkitURL).createObjectURL(blob);
        var link = window.document.createElement('a');
        link.href = url;
        link.download = filename || 'output.wav';
        var click = document.createEvent('Event');
        click.initEvent('click', true, true);
        link.dispatchEvent(click);
      }
    }]);

    return Recorder;
  })();

  exports.default = Recorder;

},{'inline-worker':3}],3:[function(require,module,exports){
  'use strict';

  module.exports = require('./inline-worker');
},{'./inline-worker':4}],4:[function(require,module,exports){
  (function (global){
    'use strict';

    var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

    var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

    var WORKER_ENABLED = !!(global === global.window && global.URL && global.Blob && global.Worker);

    var InlineWorker = (function () {
      function InlineWorker(func, self) {
        var _this = this;

        _classCallCheck(this, InlineWorker);

        if (WORKER_ENABLED) {
          var functionBody = func.toString().trim().match(/^function\s*\w*\s*\([\w\s,]*\)\s*{([\w\W]*?)}$/)[1];
          var url = global.URL.createObjectURL(new global.Blob([functionBody], { type: 'text/javascript' }));

          return new global.Worker(url);
        }

        this.self = self;
        this.self.postMessage = function (data) {
          setTimeout(function () {
            _this.onmessage({ data: data });
          }, 0);
        };

        setTimeout(function () {
          func.call(self);
        }, 0);
      }

      _createClass(InlineWorker, {
        postMessage: {
          value: function postMessage(data) {
            var _this = this;

            setTimeout(function () {
              _this.self.onmessage({ data: data });
            }, 0);
          }
        }
      });

      return InlineWorker;
    })();

    module.exports = InlineWorker;
  }).call(this,typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : {});
},{}]},{},[1])(1);
});
/**
 * Created by Denis Radin aka PixelsCommander
 * http://pixelscommander.com
 *
 * Polyfill is build around the principe that janks are most harmful to UX when user is continously interacting with app.
 * So we are basically preventing operation from being executed while user interacts with interface.
 * Currently this implies scrolls, taps, clicks, mouse and touch movements.
 * The condition is pretty simple - if there were no interactions for 300 msec there is a huge chance that we are in idle.
 */

var applyPolyfill = function () {
    //By default we may assume that user stopped interaction if we are idle for 300 miliseconds
  var IDLE_ENOUGH_DELAY = 300;
  var timeoutId = null;
  var callbacks = [];
  var lastInteractionTime = Date.now();
  var deadline = {
    timeRemaining: IDLE_ENOUGH_DELAY
  };
  
  var isFree = function () {
    return timeoutId === null;
  };

  var onContinousInteractionStarts = function (interactionName) {
    deadline.timeRemaining = 0;
    lastInteractionTime = Date.now();

    if (!timeoutId) {
      timeoutId = setTimeout(timeoutCompleted, IDLE_ENOUGH_DELAY);
    }
  };

  var onContinousInteractionEnds = function (interactionName) {
    clearTimeout(timeoutId);
    timeoutId = null;

    for (var i = 0; i < callbacks.length; i++) {
      executeCallback(callbacks[i]);
    }
  };

    //Consider categorizing last interaction timestamp in order to add cancelling events like touchend, touchleave, touchcancel, mouseup, mouseout, mouseleave
  document.addEventListener('keydown', onContinousInteractionStarts.bind(this, 'keydown'));
  document.addEventListener('mousedown', onContinousInteractionStarts.bind(this, 'mousedown'));
  document.addEventListener('touchstart', onContinousInteractionStarts.bind(this, 'touchstart'));
  document.addEventListener('touchmove', onContinousInteractionStarts.bind(this, 'touchmove'));
  document.addEventListener('mousemove', onContinousInteractionStarts.bind(this, 'mousemove'));
  document.addEventListener('scroll', onContinousInteractionStarts.bind(this, 'scroll'), true);


  var timeoutCompleted = function () {
    var expectedEndTime = lastInteractionTime + IDLE_ENOUGH_DELAY;
    var delta = expectedEndTime - Date.now();

    if (delta > 0) {
      timeoutId = setTimeout(timeoutCompleted, delta);
    } else {
      onContinousInteractionEnds();
    }
  };

  var createCallbackObject = function (callback, timeout) {
    var callbackObject = {
      callback: callback,
      timeoutId: null
    };

    callbackObject.timeoutId = timeout !== null ? setTimeout(executeCallback.bind(this, callbackObject), timeout) : null;

    return callbackObject;
  };

  var addCallback = function (callbackObject, timeout) {
    callbacks.push(callbackObject);
  };

  var executeCallback = function (callbackObject) {
    var callbackIndex = callbacks.indexOf(callbackObject);

    if (callbackIndex !== -1) {
      callbacks.splice(callbacks.indexOf(callbackObject), 1);
    }

    callbackObject.callback(deadline);

    if (callbackObject.timeoutId) {
      clearTimeout(callbackObject.timeoutId);
      callbackObject.timeoutId = null;
    }
  };

  return function (callback, options) {
    var timeout = (options && options.timeout) || null;
    var callbackObject = createCallbackObject(callback, timeout);

    if (isFree()) {
      executeCallback(callbackObject);
    } else {
      addCallback(callbackObject);
    }
  };
};

if (!window.requestIdleCallback) {
  window.ricActivated = true;
  window.requestIdleCallback = applyPolyfill();
}

window.requestUserIdle = window.ricActivated && window.requestIdleCallback || applyPolyfill();

// Spectrum Colorpicker v1.8.0
// https://github.com/bgrins/spectrum
// Author: Brian Grinstead
// License: MIT

(function (factory) {
  'use strict';

  if (typeof define === 'function' && define.amd) { // AMD
    define(['jquery'], factory);
  }
  else if (typeof exports == 'object' && typeof module == 'object') { // CommonJS
    module.exports = factory(require('jquery'));
  }
  else { // Browser
    factory(jQuery);
  }
})(function($, undefined) {
  'use strict';

  var defaultOpts = {

        // Callbacks
      beforeShow: noop,
      move: noop,
      change: noop,
      show: noop,
      hide: noop,

        // Options
      color: false,
      flat: false,
      showInput: false,
      allowEmpty: false,
      showButtons: true,
      clickoutFiresChange: true,
      showInitial: false,
      showPalette: false,
      showPaletteOnly: false,
      hideAfterPaletteSelect: false,
      togglePaletteOnly: false,
      showSelectionPalette: true,
      localStorageKey: false,
      appendTo: 'body',
      maxSelectionSize: 7,
      cancelText: 'cancel',
      chooseText: 'choose',
      togglePaletteMoreText: 'more',
      togglePaletteLessText: 'less',
      clearText: 'Clear Color Selection',
      noColorSelectedText: 'No Color Selected',
      preferredFormat: false,
      className: '', // Deprecated - use containerClassName and replacerClassName instead.
      containerClassName: '',
      replacerClassName: '',
      showAlpha: false,
      theme: 'sp-light',
      palette: [['#ffffff', '#000000', '#ff0000', '#ff8000', '#ffff00', '#008000', '#0000ff', '#4b0082', '#9400d3']],
      selectionPalette: [],
      disabled: false,
      offset: null
    },
    spectrums = [],
    IE = !!/msie/i.exec( window.navigator.userAgent ),
    rgbaSupport = (function() {
      function contains( str, substr ) {
        return !!~('' + str).indexOf(substr);
      }

      var elem = document.createElement('div');
      var style = elem.style;
      style.cssText = 'background-color:rgba(0,0,0,.5)';
      return contains(style.backgroundColor, 'rgba') || contains(style.backgroundColor, 'hsla');
    })(),
    replaceInput = [
      '<div class=\'sp-replacer\'>',
      '<div class=\'sp-preview\'><div class=\'sp-preview-inner\'></div></div>',
      '<div class=\'sp-dd\'>&#9660;</div>',
      '</div>'
    ].join(''),
    markup = (function () {

        // IE does not support gradients with multiple stops, so we need to simulate
        //  that for the rainbow slider with 8 divs that each have a single gradient
      var gradientFix = '';
      if (IE) {
        for (var i = 1; i <= 6; i++) {
          gradientFix += '<div class=\'sp-' + i + '\'></div>';
        }
      }

      return [
        '<div class=\'sp-container sp-hidden\'>',
        '<div class=\'sp-palette-container\'>',
        '<div class=\'sp-palette sp-thumb sp-cf\'></div>',
        '<div class=\'sp-palette-button-container sp-cf\'>',
        '<button type=\'button\' class=\'sp-palette-toggle\'></button>',
        '</div>',
        '</div>',
        '<div class=\'sp-picker-container\'>',
        '<div class=\'sp-top sp-cf\'>',
        '<div class=\'sp-fill\'></div>',
        '<div class=\'sp-top-inner\'>',
        '<div class=\'sp-color\'>',
        '<div class=\'sp-sat\'>',
        '<div class=\'sp-val\'>',
        '<div class=\'sp-dragger\'></div>',
        '</div>',
        '</div>',
        '</div>',
        '<div class=\'sp-clear sp-clear-display\'>',
        '</div>',
        '<div class=\'sp-hue\'>',
        '<div class=\'sp-slider\'></div>',
        gradientFix,
        '</div>',
        '</div>',
        '<div class=\'sp-alpha\'><div class=\'sp-alpha-inner\'><div class=\'sp-alpha-handle\'></div></div></div>',
        '</div>',
        '<div class=\'sp-input-container sp-cf\'>',
        '<input class=\'sp-input\' type=\'text\' spellcheck=\'false\'  />',
        '</div>',
        '<div class=\'sp-initial sp-thumb sp-cf\'></div>',
        '<div class=\'sp-button-container sp-cf\'>',
        '<a class=\'sp-cancel\' href=\'#\'></a>',
        '<button type=\'button\' class=\'sp-choose\'></button>',
        '</div>',
        '</div>',
        '</div>'
      ].join('');
    })();

  function paletteTemplate (p, color, className, opts) {
    var html = [];
    for (var i = 0; i < p.length; i++) {
      var current = p[i];
      if(current) {
        var tiny = tinycolor(current);
        var c = tiny.toHsl().l < 0.5 ? 'sp-thumb-el sp-thumb-dark' : 'sp-thumb-el sp-thumb-light';
        c += (tinycolor.equals(color, current)) ? ' sp-thumb-active' : '';
        var formattedString = tiny.toString(opts.preferredFormat || 'rgb');
        var swatchStyle = rgbaSupport ? ('background-color:' + tiny.toRgbString()) : 'filter:' + tiny.toFilter();
        html.push('<span title="' + formattedString + '" data-color="' + tiny.toRgbString() + '" class="' + c + '"><span class="sp-thumb-inner" style="' + swatchStyle + ';" /></span>');
      } else {
        var cls = 'sp-clear-display';
        html.push($('<div />')
                    .append($('<span data-color="" style="background-color:transparent;" class="' + cls + '"></span>')
                        .attr('title', opts.noColorSelectedText)
                    )
                    .html()
                );
      }
    }
    return '<div class=\'sp-cf ' + className + '\'>' + html.join('') + '</div>';
  }

  function hideAll() {
    for (var i = 0; i < spectrums.length; i++) {
      if (spectrums[i]) {
        spectrums[i].hide();
      }
    }
  }

  function instanceOptions(o, callbackContext) {
    var opts = $.extend({}, defaultOpts, o);
    opts.callbacks = {
      'move': bind(opts.move, callbackContext),
      'change': bind(opts.change, callbackContext),
      'show': bind(opts.show, callbackContext),
      'hide': bind(opts.hide, callbackContext),
      'beforeShow': bind(opts.beforeShow, callbackContext)
    };

    return opts;
  }

  function spectrum(element, o) {

    var opts = instanceOptions(o, element),
      flat = opts.flat,
      showSelectionPalette = opts.showSelectionPalette,
      localStorageKey = opts.localStorageKey,
      theme = opts.theme,
      callbacks = opts.callbacks,
      resize = throttle(reflow, 10),
      visible = false,
      isDragging = false,
      dragWidth = 0,
      dragHeight = 0,
      dragHelperHeight = 0,
      slideHeight = 0,
      slideWidth = 0,
      alphaWidth = 0,
      alphaSlideHelperWidth = 0,
      slideHelperHeight = 0,
      currentHue = 0,
      currentSaturation = 0,
      currentValue = 0,
      currentAlpha = 1,
      palette = [],
      paletteArray = [],
      paletteLookup = {},
      selectionPalette = opts.selectionPalette.slice(0),
      maxSelectionSize = opts.maxSelectionSize,
      draggingClass = 'sp-dragging',
      shiftMovementDirection = null;

    var doc = element.ownerDocument,
      body = doc.body,
      boundElement = $(element),
      disabled = false,
      container = $(markup, doc).addClass(theme),
      pickerContainer = container.find('.sp-picker-container'),
      dragger = container.find('.sp-color'),
      dragHelper = container.find('.sp-dragger'),
      slider = container.find('.sp-hue'),
      slideHelper = container.find('.sp-slider'),
      alphaSliderInner = container.find('.sp-alpha-inner'),
      alphaSlider = container.find('.sp-alpha'),
      alphaSlideHelper = container.find('.sp-alpha-handle'),
      textInput = container.find('.sp-input'),
      paletteContainer = container.find('.sp-palette'),
      initialColorContainer = container.find('.sp-initial'),
      cancelButton = container.find('.sp-cancel'),
      clearButton = container.find('.sp-clear'),
      chooseButton = container.find('.sp-choose'),
      toggleButton = container.find('.sp-palette-toggle'),
      isInput = boundElement.is('input'),
      isInputTypeColor = isInput && boundElement.attr('type') === 'color' && inputTypeColorSupport(),
      shouldReplace = isInput && !flat,
      replacer = (shouldReplace) ? $(replaceInput).addClass(theme).addClass(opts.className).addClass(opts.replacerClassName) : $([]),
      offsetElement = (shouldReplace) ? replacer : boundElement,
      previewElement = replacer.find('.sp-preview-inner'),
      initialColor = opts.color || (isInput && boundElement.val()),
      colorOnShow = false,
      currentPreferredFormat = opts.preferredFormat,
      clickoutFiresChange = !opts.showButtons || opts.clickoutFiresChange,
      isEmpty = !initialColor,
      allowEmpty = opts.allowEmpty && !isInputTypeColor;

    function applyOptions() {

      if (opts.showPaletteOnly) {
        opts.showPalette = true;
      }

      toggleButton.text(opts.showPaletteOnly ? opts.togglePaletteMoreText : opts.togglePaletteLessText);

      if (opts.palette) {
        palette = opts.palette.slice(0);
        paletteArray = $.isArray(palette[0]) ? palette : [palette];
        paletteLookup = {};
        for (var i = 0; i < paletteArray.length; i++) {
          for (var j = 0; j < paletteArray[i].length; j++) {
            var rgb = tinycolor(paletteArray[i][j]).toRgbString();
            paletteLookup[rgb] = true;
          }
        }
      }

      container.toggleClass('sp-flat', flat);
      container.toggleClass('sp-input-disabled', !opts.showInput);
      container.toggleClass('sp-alpha-enabled', opts.showAlpha);
      container.toggleClass('sp-clear-enabled', allowEmpty);
      container.toggleClass('sp-buttons-disabled', !opts.showButtons);
      container.toggleClass('sp-palette-buttons-disabled', !opts.togglePaletteOnly);
      container.toggleClass('sp-palette-disabled', !opts.showPalette);
      container.toggleClass('sp-palette-only', opts.showPaletteOnly);
      container.toggleClass('sp-initial-disabled', !opts.showInitial);
      container.addClass(opts.className).addClass(opts.containerClassName);

      reflow();
    }

    function initialize() {

      if (IE) {
        container.find('*:not(input)').attr('unselectable', 'on');
      }

      applyOptions();

      if (shouldReplace) {
        boundElement.after(replacer).hide();
      }

      if (!allowEmpty) {
        clearButton.hide();
      }

      if (flat) {
        boundElement.after(container).hide();
      }
      else {

        var appendTo = opts.appendTo === 'parent' ? boundElement.parent() : $(opts.appendTo);
        if (appendTo.length !== 1) {
          appendTo = $('body');
        }

        appendTo.append(container);
      }

      updateSelectionPaletteFromStorage();

      offsetElement.bind('click.spectrum touchstart.spectrum', function (e) {
        if (!disabled) {
          toggle();
        }

        e.stopPropagation();

        if (!$(e.target).is('input')) {
          e.preventDefault();
        }
      });

      if(boundElement.is(':disabled') || (opts.disabled === true)) {
        disable();
      }

            // Prevent clicks from bubbling up to document.  This would cause it to be hidden.
      container.click(stopPropagation);

            // Handle user typed input
      textInput.change(setFromTextInput);
      textInput.bind('paste', function () {
        setTimeout(setFromTextInput, 1);
      });
      textInput.keydown(function (e) { if (e.keyCode == 13) { setFromTextInput(); } });

      cancelButton.text(opts.cancelText);
      cancelButton.bind('click.spectrum', function (e) {
        e.stopPropagation();
        e.preventDefault();
        revert();
        hide();
      });

      clearButton.attr('title', opts.clearText);
      clearButton.bind('click.spectrum', function (e) {
        e.stopPropagation();
        e.preventDefault();
        isEmpty = true;
        move();

        if(flat) {
                    //for the flat style, this is a change event
          updateOriginalInput(true);
        }
      });

      chooseButton.text(opts.chooseText);
      chooseButton.bind('click.spectrum', function (e) {
        e.stopPropagation();
        e.preventDefault();

        if (IE && textInput.is(':focus')) {
          textInput.trigger('change');
        }

        if (isValid()) {
          updateOriginalInput(true);
          hide();
        }
      });

      toggleButton.text(opts.showPaletteOnly ? opts.togglePaletteMoreText : opts.togglePaletteLessText);
      toggleButton.bind('click.spectrum', function (e) {
        e.stopPropagation();
        e.preventDefault();

        opts.showPaletteOnly = !opts.showPaletteOnly;

                // To make sure the Picker area is drawn on the right, next to the
                // Palette area (and not below the palette), first move the Palette
                // to the left to make space for the picker, plus 5px extra.
                // The 'applyOptions' function puts the whole container back into place
                // and takes care of the button-text and the sp-palette-only CSS class.
        if (!opts.showPaletteOnly && !flat) {
          container.css('left', '-=' + (pickerContainer.outerWidth(true) + 5));
        }
        applyOptions();
      });

      draggable(alphaSlider, function (dragX, dragY, e) {
        currentAlpha = (dragX / alphaWidth);
        isEmpty = false;
        if (e.shiftKey) {
          currentAlpha = Math.round(currentAlpha * 10) / 10;
        }

        move();
      }, dragStart, dragStop);

      draggable(slider, function (dragX, dragY) {
        currentHue = parseFloat(dragY / slideHeight);
        isEmpty = false;
        if (!opts.showAlpha) {
          currentAlpha = 1;
        }
        move();
      }, dragStart, dragStop);

      draggable(dragger, function (dragX, dragY, e) {

                // shift+drag should snap the movement to either the x or y axis.
        if (!e.shiftKey) {
          shiftMovementDirection = null;
        }
        else if (!shiftMovementDirection) {
          var oldDragX = currentSaturation * dragWidth;
          var oldDragY = dragHeight - (currentValue * dragHeight);
          var furtherFromX = Math.abs(dragX - oldDragX) > Math.abs(dragY - oldDragY);

          shiftMovementDirection = furtherFromX ? 'x' : 'y';
        }

        var setSaturation = !shiftMovementDirection || shiftMovementDirection === 'x';
        var setValue = !shiftMovementDirection || shiftMovementDirection === 'y';

        if (setSaturation) {
          currentSaturation = parseFloat(dragX / dragWidth);
        }
        if (setValue) {
          currentValue = parseFloat((dragHeight - dragY) / dragHeight);
        }

        isEmpty = false;
        if (!opts.showAlpha) {
          currentAlpha = 1;
        }

        move();

      }, dragStart, dragStop);

      if (!!initialColor) {
        set(initialColor);

                // In case color was black - update the preview UI and set the format
                // since the set function will not run (default color is black).
        updateUI();
        currentPreferredFormat = opts.preferredFormat || tinycolor(initialColor).format;

        addColorToSelectionPalette(initialColor);
      }
      else {
        updateUI();
      }

      if (flat) {
        show();
      }

      function paletteElementClick(e) {
        if (e.data && e.data.ignore) {
          set($(e.target).closest('.sp-thumb-el').data('color'));
          move();
        }
        else {
          set($(e.target).closest('.sp-thumb-el').data('color'));
          move();
          updateOriginalInput(true);
          if (opts.hideAfterPaletteSelect) {
            hide();
          }
        }

        return false;
      }

      var paletteEvent = IE ? 'mousedown.spectrum' : 'click.spectrum touchstart.spectrum';
      paletteContainer.delegate('.sp-thumb-el', paletteEvent, paletteElementClick);
      initialColorContainer.delegate('.sp-thumb-el:nth-child(1)', paletteEvent, { ignore: true }, paletteElementClick);
    }

    function updateSelectionPaletteFromStorage() {

      if (localStorageKey && window.localStorage) {

                // Migrate old palettes over to new format.  May want to remove this eventually.
        try {
          var oldPalette = window.localStorage[localStorageKey].split(',#');
          if (oldPalette.length > 1) {
            delete window.localStorage[localStorageKey];
            $.each(oldPalette, function(i, c) {
              addColorToSelectionPalette(c);
            });
          }
        }
                catch(e) { }

        try {
          selectionPalette = window.localStorage[localStorageKey].split(';');
        }
                catch (e) { }
      }
    }

    function addColorToSelectionPalette(color) {
      if (showSelectionPalette) {
        var rgb = tinycolor(color).toRgbString();
        if (!paletteLookup[rgb] && $.inArray(rgb, selectionPalette) === -1) {
          selectionPalette.push(rgb);
          while(selectionPalette.length > maxSelectionSize) {
            selectionPalette.shift();
          }
        }

        if (localStorageKey && window.localStorage) {
          try {
            window.localStorage[localStorageKey] = selectionPalette.join(';');
          }
                    catch(e) { }
        }
      }
    }

    function getUniqueSelectionPalette() {
      var unique = [];
      if (opts.showPalette) {
        for (var i = 0; i < selectionPalette.length; i++) {
          var rgb = tinycolor(selectionPalette[i]).toRgbString();

          if (!paletteLookup[rgb]) {
            unique.push(selectionPalette[i]);
          }
        }
      }

      return unique.reverse().slice(0, opts.maxSelectionSize);
    }

    function drawPalette() {

      var currentColor = get();

      var html = $.map(paletteArray, function (palette, i) {
        return paletteTemplate(palette, currentColor, 'sp-palette-row sp-palette-row-' + i, opts);
      });

      updateSelectionPaletteFromStorage();

      if (selectionPalette) {
        html.push(paletteTemplate(getUniqueSelectionPalette(), currentColor, 'sp-palette-row sp-palette-row-selection', opts));
      }

      paletteContainer.html(html.join(''));
    }

    function drawInitial() {
      if (opts.showInitial) {
        var initial = colorOnShow;
        var current = get();
        initialColorContainer.html(paletteTemplate([initial, current], current, 'sp-palette-row-initial', opts));
      }
    }

    function dragStart() {
      if (dragHeight <= 0 || dragWidth <= 0 || slideHeight <= 0) {
        reflow();
      }
      isDragging = true;
      container.addClass(draggingClass);
      shiftMovementDirection = null;
      boundElement.trigger('dragstart.spectrum', [ get() ]);
    }

    function dragStop() {
      isDragging = false;
      container.removeClass(draggingClass);
      boundElement.trigger('dragstop.spectrum', [ get() ]);
    }

    function setFromTextInput() {

      var value = textInput.val();

      if ((value === null || value === '') && allowEmpty) {
        set(null);
        updateOriginalInput(true);
      }
      else {
        var tiny = tinycolor(value);
        if (tiny.isValid()) {
          set(tiny);
          updateOriginalInput(true);
        }
        else {
          textInput.addClass('sp-validation-error');
        }
      }
    }

    function toggle() {
      if (visible) {
        hide();
      }
      else {
        show();
      }
    }

    function show() {
      var event = $.Event('beforeShow.spectrum');

      if (visible) {
        reflow();
        return;
      }

      boundElement.trigger(event, [ get() ]);

      if (callbacks.beforeShow(get()) === false || event.isDefaultPrevented()) {
        return;
      }

      hideAll();
      visible = true;

      $(doc).bind('keydown.spectrum', onkeydown);
      $(doc).bind('click.spectrum', clickout);
      $(window).bind('resize.spectrum', resize);
      replacer.addClass('sp-active');
      container.removeClass('sp-hidden');

      reflow();
      updateUI();

      colorOnShow = get();

      drawInitial();
      callbacks.show(colorOnShow);
      boundElement.trigger('show.spectrum', [ colorOnShow ]);
    }

    function onkeydown(e) {
            // Close on ESC
      if (e.keyCode === 27) {
        hide();
      }
    }

    function clickout(e) {
            // Return on right click.
      if (e.button == 2) { return; }

            // If a drag event was happening during the mouseup, don't hide
            // on click.
      if (isDragging) { return; }

      if (clickoutFiresChange) {
        updateOriginalInput(true);
      }
      else {
        revert();
      }
      hide();
    }

    function hide() {
            // Return if hiding is unnecessary
      if (!visible || flat) { return; }
      visible = false;

      $(doc).unbind('keydown.spectrum', onkeydown);
      $(doc).unbind('click.spectrum', clickout);
      $(window).unbind('resize.spectrum', resize);

      replacer.removeClass('sp-active');
      container.addClass('sp-hidden');

      callbacks.hide(get());
      boundElement.trigger('hide.spectrum', [ get() ]);
    }

    function revert() {
      set(colorOnShow, true);
    }

    function set(color, ignoreFormatChange) {
      if (tinycolor.equals(color, get())) {
                // Update UI just in case a validation error needs
                // to be cleared.
        updateUI();
        return;
      }

      var newColor, newHsv;
      if (!color && allowEmpty) {
        isEmpty = true;
      } else {
        isEmpty = false;
        newColor = tinycolor(color);
        newHsv = newColor.toHsv();

        currentHue = (newHsv.h % 360) / 360;
        currentSaturation = newHsv.s;
        currentValue = newHsv.v;
        currentAlpha = newHsv.a;
      }
      updateUI();

      if (newColor && newColor.isValid() && !ignoreFormatChange) {
        currentPreferredFormat = opts.preferredFormat || newColor.getFormat();
      }
    }

    function get(opts) {
      opts = opts || { };

      if (allowEmpty && isEmpty) {
        return null;
      }

      return tinycolor.fromRatio({
        h: currentHue,
        s: currentSaturation,
        v: currentValue,
        a: Math.round(currentAlpha * 100) / 100
      }, { format: opts.format || currentPreferredFormat });
    }

    function isValid() {
      return !textInput.hasClass('sp-validation-error');
    }

    function move() {
      updateUI();

      callbacks.move(get());
      boundElement.trigger('move.spectrum', [ get() ]);
    }

    function updateUI() {

      textInput.removeClass('sp-validation-error');

      updateHelperLocations();

            // Update dragger background color (gradients take care of saturation and value).
      var flatColor = tinycolor.fromRatio({ h: currentHue, s: 1, v: 1 });
      dragger.css('background-color', flatColor.toHexString());

            // Get a format that alpha will be included in (hex and names ignore alpha)
      var format = currentPreferredFormat;
      if (currentAlpha < 1 && !(currentAlpha === 0 && format === 'name')) {
        if (format === 'hex' || format === 'hex3' || format === 'hex6' || format === 'name') {
          format = 'rgb';
        }
      }

      var realColor = get({ format: format }),
        displayColor = '';

             //reset background info for preview element
      previewElement.removeClass('sp-clear-display');
      previewElement.css('background-color', 'transparent');

      if (!realColor && allowEmpty) {
                // Update the replaced elements background with icon indicating no color selection
        previewElement.addClass('sp-clear-display');
      }
      else {
        var realHex = realColor.toHexString(),
          realRgb = realColor.toRgbString();

                // Update the replaced elements background color (with actual selected color)
        if (rgbaSupport || realColor.alpha === 1) {
          previewElement.css('background-color', realRgb);
        }
        else {
          previewElement.css('background-color', 'transparent');
          previewElement.css('filter', realColor.toFilter());
        }

        if (opts.showAlpha) {
          var rgb = realColor.toRgb();
          rgb.a = 0;
          var realAlpha = tinycolor(rgb).toRgbString();
          var gradient = 'linear-gradient(left, ' + realAlpha + ', ' + realHex + ')';

          if (IE) {
            alphaSliderInner.css('filter', tinycolor(realAlpha).toFilter({ gradientType: 1 }, realHex));
          }
          else {
            alphaSliderInner.css('background', '-webkit-' + gradient);
            alphaSliderInner.css('background', '-moz-' + gradient);
            alphaSliderInner.css('background', '-ms-' + gradient);
                        // Use current syntax gradient on unprefixed property.
            alphaSliderInner.css('background',
                            'linear-gradient(to right, ' + realAlpha + ', ' + realHex + ')');
          }
        }

        displayColor = realColor.toString(format);
      }

            // Update the text entry input as it changes happen
      if (opts.showInput) {
        textInput.val(displayColor);
      }

      if (opts.showPalette) {
        drawPalette();
      }

      drawInitial();
    }

    function updateHelperLocations() {
      var s = currentSaturation;
      var v = currentValue;

      if(allowEmpty && isEmpty) {
                //if selected color is empty, hide the helpers
        alphaSlideHelper.hide();
        slideHelper.hide();
        dragHelper.hide();
      }
      else {
                //make sure helpers are visible
        alphaSlideHelper.show();
        slideHelper.show();
        dragHelper.show();

                // Where to show the little circle in that displays your current selected color
        var dragX = s * dragWidth;
        var dragY = dragHeight - (v * dragHeight);
        dragX = Math.max(
                    -dragHelperHeight,
                    Math.min(dragWidth - dragHelperHeight, dragX - dragHelperHeight)
                );
        dragY = Math.max(
                    -dragHelperHeight,
                    Math.min(dragHeight - dragHelperHeight, dragY - dragHelperHeight)
                );
        dragHelper.css({
          'top': dragY + 'px',
          'left': dragX + 'px'
        });

        var alphaX = currentAlpha * alphaWidth;
        alphaSlideHelper.css({
          'left': (alphaX - (alphaSlideHelperWidth / 2)) + 'px'
        });

                // Where to show the bar that displays your current selected hue
        var slideY = (currentHue) * slideHeight;
        slideHelper.css({
          'top': (slideY - slideHelperHeight) + 'px'
        });
      }
    }

    function updateOriginalInput(fireCallback) {
      var color = get(),
        displayColor = '',
        hasChanged = !tinycolor.equals(color, colorOnShow);

      if (color) {
        displayColor = color.toString(currentPreferredFormat);
                // Update the selection palette with the current color
        addColorToSelectionPalette(color);
      }

      if (isInput) {
        boundElement.val(displayColor);
      }

      if (fireCallback && hasChanged) {
        callbacks.change(color);
        boundElement.trigger('change', [ color ]);
      }
    }

    function reflow() {
      if (!visible) {
        return; // Calculations would be useless and wouldn't be reliable anyways
      }
      dragWidth = dragger.width();
      dragHeight = dragger.height();
      dragHelperHeight = dragHelper.height();
      slideWidth = slider.width();
      slideHeight = slider.height();
      slideHelperHeight = slideHelper.height();
      alphaWidth = alphaSlider.width();
      alphaSlideHelperWidth = alphaSlideHelper.width();

      if (!flat) {
        container.css('position', 'absolute');
        if (opts.offset) {
          container.offset(opts.offset);
        } else {
          container.offset(getOffset(container, offsetElement));
        }
      }

      updateHelperLocations();

      if (opts.showPalette) {
        drawPalette();
      }

      boundElement.trigger('reflow.spectrum');
    }

    function destroy() {
      boundElement.show();
      offsetElement.unbind('click.spectrum touchstart.spectrum');
      container.remove();
      replacer.remove();
      spectrums[spect.id] = null;
    }

    function option(optionName, optionValue) {
      if (optionName === undefined) {
        return $.extend({}, opts);
      }
      if (optionValue === undefined) {
        return opts[optionName];
      }

      opts[optionName] = optionValue;

      if (optionName === 'preferredFormat') {
        currentPreferredFormat = opts.preferredFormat;
      }
      applyOptions();
    }

    function enable() {
      disabled = false;
      boundElement.attr('disabled', false);
      offsetElement.removeClass('sp-disabled');
    }

    function disable() {
      hide();
      disabled = true;
      boundElement.attr('disabled', true);
      offsetElement.addClass('sp-disabled');
    }

    function setOffset(coord) {
      opts.offset = coord;
      reflow();
    }

    initialize();

    var spect = {
      show: show,
      hide: hide,
      toggle: toggle,
      reflow: reflow,
      option: option,
      enable: enable,
      disable: disable,
      offset: setOffset,
      set: function (c) {
        set(c);
        updateOriginalInput();
      },
      get: get,
      destroy: destroy,
      container: container
    };

    spect.id = spectrums.push(spect) - 1;

    return spect;
  }

    /**
    * checkOffset - get the offset below/above and left/right element depending on screen position
    * Thanks https://github.com/jquery/jquery-ui/blob/master/ui/jquery.ui.datepicker.js
    */
  function getOffset(picker, input) {
    var extraY = 0;
    var dpWidth = picker.outerWidth();
    var dpHeight = picker.outerHeight();
    var inputHeight = input.outerHeight();
    var doc = picker[0].ownerDocument;
    var docElem = doc.documentElement;
    var viewWidth = docElem.clientWidth + $(doc).scrollLeft();
    var viewHeight = docElem.clientHeight + $(doc).scrollTop();
    var offset = input.offset();
    offset.top += inputHeight;

    offset.left -=
            Math.min(offset.left, (offset.left + dpWidth > viewWidth && viewWidth > dpWidth) ?
            Math.abs(offset.left + dpWidth - viewWidth) : 0);

    offset.top -=
            Math.min(offset.top, ((offset.top + dpHeight > viewHeight && viewHeight > dpHeight) ?
            Math.abs(dpHeight + inputHeight - extraY) : extraY));

    return offset;
  }

    /**
    * noop - do nothing
    */
  function noop() {

  }

    /**
    * stopPropagation - makes the code only doing this a little easier to read in line
    */
  function stopPropagation(e) {
    e.stopPropagation();
  }

    /**
    * Create a function bound to a given object
    * Thanks to underscore.js
    */
  function bind(func, obj) {
    var slice = Array.prototype.slice;
    var args = slice.call(arguments, 2);
    return function () {
      return func.apply(obj, args.concat(slice.call(arguments)));
    };
  }

    /**
    * Lightweight drag helper.  Handles containment within the element, so that
    * when dragging, the x is within [0,element.width] and y is within [0,element.height]
    */
  function draggable(element, onmove, onstart, onstop) {
    onmove = onmove || function () { };
    onstart = onstart || function () { };
    onstop = onstop || function () { };
    var doc = document;
    var dragging = false;
    var offset = {};
    var maxHeight = 0;
    var maxWidth = 0;
    var hasTouch = ('ontouchstart' in window);

    var duringDragEvents = {};
    duringDragEvents['selectstart'] = prevent;
    duringDragEvents['dragstart'] = prevent;
    duringDragEvents['touchmove mousemove'] = move;
    duringDragEvents['touchend mouseup'] = stop;

    function prevent(e) {
      if (e.stopPropagation) {
        e.stopPropagation();
      }
      if (e.preventDefault) {
        e.preventDefault();
      }
      e.returnValue = false;
    }

    function move(e) {
      if (dragging) {
                // Mouseup happened outside of window
        if (IE && doc.documentMode < 9 && !e.button) {
          return stop();
        }

        var t0 = e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0];
        var pageX = t0 && t0.pageX || e.pageX;
        var pageY = t0 && t0.pageY || e.pageY;

        var dragX = Math.max(0, Math.min(pageX - offset.left, maxWidth));
        var dragY = Math.max(0, Math.min(pageY - offset.top, maxHeight));

        if (hasTouch) {
                    // Stop scrolling in iOS
          prevent(e);
        }

        onmove.apply(element, [dragX, dragY, e]);
      }
    }

    function start(e) {
      var rightclick = (e.which) ? (e.which == 3) : (e.button == 2);

      if (!rightclick && !dragging) {
        if (onstart.apply(element, arguments) !== false) {
          dragging = true;
          maxHeight = $(element).height();
          maxWidth = $(element).width();
          offset = $(element).offset();

          $(doc).bind(duringDragEvents);
          $(doc.body).addClass('sp-dragging');

          move(e);

          prevent(e);
        }
      }
    }

    function stop() {
      if (dragging) {
        $(doc).unbind(duringDragEvents);
        $(doc.body).removeClass('sp-dragging');

                // Wait a tick before notifying observers to allow the click event
                // to fire in Chrome.
        setTimeout(function() {
          onstop.apply(element, arguments);
        }, 0);
      }
      dragging = false;
    }

    $(element).bind('touchstart mousedown', start);
  }

  function throttle(func, wait, debounce) {
    var timeout;
    return function () {
      var context = this, args = arguments;
      var throttler = function () {
        timeout = null;
        func.apply(context, args);
      };
      if (debounce) clearTimeout(timeout);
      if (debounce || !timeout) timeout = setTimeout(throttler, wait);
    };
  }

  function inputTypeColorSupport() {
    return $.fn.spectrum.inputTypeColorSupport();
  }

    /**
    * Define a jQuery plugin
    */
  var dataID = 'spectrum.id';
  $.fn.spectrum = function (opts, extra) {

    if (typeof opts == 'string') {

      var returnValue = this;
      var args = Array.prototype.slice.call( arguments, 1 );

      this.each(function () {
        var spect = spectrums[$(this).data(dataID)];
        if (spect) {
          var method = spect[opts];
          if (!method) {
            throw new Error( 'Spectrum: no such method: \'' + opts + '\'' );
          }

          if (opts == 'get') {
            returnValue = spect.get();
          }
          else if (opts == 'container') {
            returnValue = spect.container;
          }
          else if (opts == 'option') {
            returnValue = spect.option.apply(spect, args);
          }
          else if (opts == 'destroy') {
            spect.destroy();
            $(this).removeData(dataID);
          }
          else {
            method.apply(spect, args);
          }
        }
      });

      return returnValue;
    }

        // Initializing a new instance of spectrum
    return this.spectrum('destroy').each(function () {
      var options = $.extend({}, opts, $(this).data());
      var spect = spectrum(this, options);
      $(this).data(dataID, spect.id);
    });
  };

  $.fn.spectrum.load = true;
  $.fn.spectrum.loadOpts = {};
  $.fn.spectrum.draggable = draggable;
  $.fn.spectrum.defaults = defaultOpts;
  $.fn.spectrum.inputTypeColorSupport = function inputTypeColorSupport() {
    if (typeof inputTypeColorSupport._cachedResult === 'undefined') {
      var colorInput = $('<input type=\'color\'/>')[0]; // if color element is supported, value will default to not null
      inputTypeColorSupport._cachedResult = colorInput.type === 'color' && colorInput.value !== '';
    }
    return inputTypeColorSupport._cachedResult;
  };

  $.spectrum = { };
  $.spectrum.localization = { };
  $.spectrum.palettes = { };

  $.fn.spectrum.processNativeColorInputs = function () {
    var colorInputs = $('input[type=color]');
    if (colorInputs.length && !inputTypeColorSupport()) {
      colorInputs.spectrum({
        preferredFormat: 'hex6'
      });
    }
  };

    // TinyColor v1.1.2
    // https://github.com/bgrins/TinyColor
    // Brian Grinstead, MIT License

  (function() {

    var trimLeft = /^[\s,#]+/,
      trimRight = /\s+$/,
      tinyCounter = 0,
      math = Math,
      mathRound = math.round,
      mathMin = math.min,
      mathMax = math.max,
      mathRandom = math.random;

    var tinycolor = function(color, opts) {

      color = (color) ? color : '';
      opts = opts || { };

        // If input is already a tinycolor, return itself
      if (color instanceof tinycolor) {
        return color;
      }
        // If we are called as a function, call using new instead
      if (!(this instanceof tinycolor)) {
        return new tinycolor(color, opts);
      }

      var rgb = inputToRGB(color);
      this._originalInput = color,
        this._r = rgb.r,
        this._g = rgb.g,
        this._b = rgb.b,
        this._a = rgb.a,
        this._roundA = mathRound(100*this._a) / 100,
        this._format = opts.format || rgb.format;
      this._gradientType = opts.gradientType;

        // Don't let the range of [0,255] come back in [0,1].
        // Potentially lose a little bit of precision here, but will fix issues where
        // .5 gets interpreted as half of the total, instead of half of 1
        // If it was supposed to be 128, this was already taken care of by `inputToRgb`
      if (this._r < 1) { this._r = mathRound(this._r); }
      if (this._g < 1) { this._g = mathRound(this._g); }
      if (this._b < 1) { this._b = mathRound(this._b); }

      this._ok = rgb.ok;
      this._tc_id = tinyCounter++;
    };

    tinycolor.prototype = {
      isDark: function() {
        return this.getBrightness() < 128;
      },
      isLight: function() {
        return !this.isDark();
      },
      isValid: function() {
        return this._ok;
      },
      getOriginalInput: function() {
        return this._originalInput;
      },
      getFormat: function() {
        return this._format;
      },
      getAlpha: function() {
        return this._a;
      },
      getBrightness: function() {
        var rgb = this.toRgb();
        return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
      },
      setAlpha: function(value) {
        this._a = boundAlpha(value);
        this._roundA = mathRound(100*this._a) / 100;
        return this;
      },
      toHsv: function() {
        var hsv = rgbToHsv(this._r, this._g, this._b);
        return { h: hsv.h * 360, s: hsv.s, v: hsv.v, a: this._a };
      },
      toHsvString: function() {
        var hsv = rgbToHsv(this._r, this._g, this._b);
        var h = mathRound(hsv.h * 360), s = mathRound(hsv.s * 100), v = mathRound(hsv.v * 100);
        return (this._a == 1) ?
              'hsv('  + h + ', ' + s + '%, ' + v + '%)' :
              'hsva(' + h + ', ' + s + '%, ' + v + '%, '+ this._roundA + ')';
      },
      toHsl: function() {
        var hsl = rgbToHsl(this._r, this._g, this._b);
        return { h: hsl.h * 360, s: hsl.s, l: hsl.l, a: this._a };
      },
      toHslString: function() {
        var hsl = rgbToHsl(this._r, this._g, this._b);
        var h = mathRound(hsl.h * 360), s = mathRound(hsl.s * 100), l = mathRound(hsl.l * 100);
        return (this._a == 1) ?
              'hsl('  + h + ', ' + s + '%, ' + l + '%)' :
              'hsla(' + h + ', ' + s + '%, ' + l + '%, '+ this._roundA + ')';
      },
      toHex: function(allow3Char) {
        return rgbToHex(this._r, this._g, this._b, allow3Char);
      },
      toHexString: function(allow3Char) {
        return '#' + this.toHex(allow3Char);
      },
      toHex8: function() {
        return rgbaToHex(this._r, this._g, this._b, this._a);
      },
      toHex8String: function() {
        return '#' + this.toHex8();
      },
      toRgb: function() {
        return { r: mathRound(this._r), g: mathRound(this._g), b: mathRound(this._b), a: this._a };
      },
      toRgbString: function() {
        return (this._a == 1) ?
              'rgb('  + mathRound(this._r) + ', ' + mathRound(this._g) + ', ' + mathRound(this._b) + ')' :
              'rgba(' + mathRound(this._r) + ', ' + mathRound(this._g) + ', ' + mathRound(this._b) + ', ' + this._roundA + ')';
      },
      toPercentageRgb: function() {
        return { r: mathRound(bound01(this._r, 255) * 100) + '%', g: mathRound(bound01(this._g, 255) * 100) + '%', b: mathRound(bound01(this._b, 255) * 100) + '%', a: this._a };
      },
      toPercentageRgbString: function() {
        return (this._a == 1) ?
              'rgb('  + mathRound(bound01(this._r, 255) * 100) + '%, ' + mathRound(bound01(this._g, 255) * 100) + '%, ' + mathRound(bound01(this._b, 255) * 100) + '%)' :
              'rgba(' + mathRound(bound01(this._r, 255) * 100) + '%, ' + mathRound(bound01(this._g, 255) * 100) + '%, ' + mathRound(bound01(this._b, 255) * 100) + '%, ' + this._roundA + ')';
      },
      toName: function() {
        if (this._a === 0) {
          return 'transparent';
        }

        if (this._a < 1) {
          return false;
        }

        return hexNames[rgbToHex(this._r, this._g, this._b, true)] || false;
      },
      toFilter: function(secondColor) {
        var hex8String = '#' + rgbaToHex(this._r, this._g, this._b, this._a);
        var secondHex8String = hex8String;
        var gradientType = this._gradientType ? 'GradientType = 1, ' : '';

        if (secondColor) {
          var s = tinycolor(secondColor);
          secondHex8String = s.toHex8String();
        }

        return 'progid:DXImageTransform.Microsoft.gradient('+gradientType+'startColorstr='+hex8String+',endColorstr='+secondHex8String+')';
      },
      toString: function(format) {
        var formatSet = !!format;
        format = format || this._format;

        var formattedString = false;
        var hasAlpha = this._a < 1 && this._a >= 0;
        var needsAlphaFormat = !formatSet && hasAlpha && (format === 'hex' || format === 'hex6' || format === 'hex3' || format === 'name');

        if (needsAlphaFormat) {
                // Special case for "transparent", all other non-alpha formats
                // will return rgba when there is transparency.
          if (format === 'name' && this._a === 0) {
            return this.toName();
          }
          return this.toRgbString();
        }
        if (format === 'rgb') {
          formattedString = this.toRgbString();
        }
        if (format === 'prgb') {
          formattedString = this.toPercentageRgbString();
        }
        if (format === 'hex' || format === 'hex6') {
          formattedString = this.toHexString();
        }
        if (format === 'hex3') {
          formattedString = this.toHexString(true);
        }
        if (format === 'hex8') {
          formattedString = this.toHex8String();
        }
        if (format === 'name') {
          formattedString = this.toName();
        }
        if (format === 'hsl') {
          formattedString = this.toHslString();
        }
        if (format === 'hsv') {
          formattedString = this.toHsvString();
        }

        return formattedString || this.toHexString();
      },

      _applyModification: function(fn, args) {
        var color = fn.apply(null, [this].concat([].slice.call(args)));
        this._r = color._r;
        this._g = color._g;
        this._b = color._b;
        this.setAlpha(color._a);
        return this;
      },
      lighten: function() {
        return this._applyModification(lighten, arguments);
      },
      brighten: function() {
        return this._applyModification(brighten, arguments);
      },
      darken: function() {
        return this._applyModification(darken, arguments);
      },
      desaturate: function() {
        return this._applyModification(desaturate, arguments);
      },
      saturate: function() {
        return this._applyModification(saturate, arguments);
      },
      greyscale: function() {
        return this._applyModification(greyscale, arguments);
      },
      spin: function() {
        return this._applyModification(spin, arguments);
      },

      _applyCombination: function(fn, args) {
        return fn.apply(null, [this].concat([].slice.call(args)));
      },
      analogous: function() {
        return this._applyCombination(analogous, arguments);
      },
      complement: function() {
        return this._applyCombination(complement, arguments);
      },
      monochromatic: function() {
        return this._applyCombination(monochromatic, arguments);
      },
      splitcomplement: function() {
        return this._applyCombination(splitcomplement, arguments);
      },
      triad: function() {
        return this._applyCombination(triad, arguments);
      },
      tetrad: function() {
        return this._applyCombination(tetrad, arguments);
      }
    };

    // If input is an object, force 1 into "1.0" to handle ratios properly
    // String input requires "1.0" as input, so 1 will be treated as 1
    tinycolor.fromRatio = function(color, opts) {
      if (typeof color == 'object') {
        var newColor = {};
        for (var i in color) {
          if (color.hasOwnProperty(i)) {
            if (i === 'a') {
              newColor[i] = color[i];
            }
            else {
              newColor[i] = convertToPercentage(color[i]);
            }
          }
        }
        color = newColor;
      }

      return tinycolor(color, opts);
    };

    // Given a string or object, convert that input to RGB
    // Possible string inputs:
    //
    //     "red"
    //     "#f00" or "f00"
    //     "#ff0000" or "ff0000"
    //     "#ff000000" or "ff000000"
    //     "rgb 255 0 0" or "rgb (255, 0, 0)"
    //     "rgb 1.0 0 0" or "rgb (1, 0, 0)"
    //     "rgba (255, 0, 0, 1)" or "rgba 255, 0, 0, 1"
    //     "rgba (1.0, 0, 0, 1)" or "rgba 1.0, 0, 0, 1"
    //     "hsl(0, 100%, 50%)" or "hsl 0 100% 50%"
    //     "hsla(0, 100%, 50%, 1)" or "hsla 0 100% 50%, 1"
    //     "hsv(0, 100%, 100%)" or "hsv 0 100% 100%"
    //
    function inputToRGB(color) {

      var rgb = { r: 0, g: 0, b: 0 };
      var a = 1;
      var ok = false;
      var format = false;

      if (typeof color == 'string') {
        color = stringInputToObject(color);
      }

      if (typeof color == 'object') {
        if (color.hasOwnProperty('r') && color.hasOwnProperty('g') && color.hasOwnProperty('b')) {
          rgb = rgbToRgb(color.r, color.g, color.b);
          ok = true;
          format = String(color.r).substr(-1) === '%' ? 'prgb' : 'rgb';
        }
        else if (color.hasOwnProperty('h') && color.hasOwnProperty('s') && color.hasOwnProperty('v')) {
          color.s = convertToPercentage(color.s);
          color.v = convertToPercentage(color.v);
          rgb = hsvToRgb(color.h, color.s, color.v);
          ok = true;
          format = 'hsv';
        }
        else if (color.hasOwnProperty('h') && color.hasOwnProperty('s') && color.hasOwnProperty('l')) {
          color.s = convertToPercentage(color.s);
          color.l = convertToPercentage(color.l);
          rgb = hslToRgb(color.h, color.s, color.l);
          ok = true;
          format = 'hsl';
        }

        if (color.hasOwnProperty('a')) {
          a = color.a;
        }
      }

      a = boundAlpha(a);

      return {
        ok: ok,
        format: color.format || format,
        r: mathMin(255, mathMax(rgb.r, 0)),
        g: mathMin(255, mathMax(rgb.g, 0)),
        b: mathMin(255, mathMax(rgb.b, 0)),
        a: a
      };
    }


    // Conversion Functions
    // --------------------

    // `rgbToHsl`, `rgbToHsv`, `hslToRgb`, `hsvToRgb` modified from:
    // <http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript>

    // `rgbToRgb`
    // Handle bounds / percentage checking to conform to CSS color spec
    // <http://www.w3.org/TR/css3-color/>
    // *Assumes:* r, g, b in [0, 255] or [0, 1]
    // *Returns:* { r, g, b } in [0, 255]
    function rgbToRgb(r, g, b){
      return {
        r: bound01(r, 255) * 255,
        g: bound01(g, 255) * 255,
        b: bound01(b, 255) * 255
      };
    }

    // `rgbToHsl`
    // Converts an RGB color value to HSL.
    // *Assumes:* r, g, and b are contained in [0, 255] or [0, 1]
    // *Returns:* { h, s, l } in [0,1]
    function rgbToHsl(r, g, b) {

      r = bound01(r, 255);
      g = bound01(g, 255);
      b = bound01(b, 255);

      var max = mathMax(r, g, b), min = mathMin(r, g, b);
      var h, s, l = (max + min) / 2;

      if(max == min) {
        h = s = 0; // achromatic
      }
      else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        }

        h /= 6;
      }

      return { h: h, s: s, l: l };
    }

    // `hslToRgb`
    // Converts an HSL color value to RGB.
    // *Assumes:* h is contained in [0, 1] or [0, 360] and s and l are contained [0, 1] or [0, 100]
    // *Returns:* { r, g, b } in the set [0, 255]
    function hslToRgb(h, s, l) {
      var r, g, b;

      h = bound01(h, 360);
      s = bound01(s, 100);
      l = bound01(l, 100);

      function hue2rgb(p, q, t) {
        if(t < 0) t += 1;
        if(t > 1) t -= 1;
        if(t < 1/6) return p + (q - p) * 6 * t;
        if(t < 1/2) return q;
        if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      }

      if(s === 0) {
        r = g = b = l; // achromatic
      }
      else {
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }

      return { r: r * 255, g: g * 255, b: b * 255 };
    }

    // `rgbToHsv`
    // Converts an RGB color value to HSV
    // *Assumes:* r, g, and b are contained in the set [0, 255] or [0, 1]
    // *Returns:* { h, s, v } in [0,1]
    function rgbToHsv(r, g, b) {

      r = bound01(r, 255);
      g = bound01(g, 255);
      b = bound01(b, 255);

      var max = mathMax(r, g, b), min = mathMin(r, g, b);
      var h, s, v = max;

      var d = max - min;
      s = max === 0 ? 0 : d / max;

      if(max == min) {
        h = 0; // achromatic
      }
      else {
        switch(max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return { h: h, s: s, v: v };
    }

    // `hsvToRgb`
    // Converts an HSV color value to RGB.
    // *Assumes:* h is contained in [0, 1] or [0, 360] and s and v are contained in [0, 1] or [0, 100]
    // *Returns:* { r, g, b } in the set [0, 255]
    function hsvToRgb(h, s, v) {

      h = bound01(h, 360) * 6;
      s = bound01(s, 100);
      v = bound01(v, 100);

      var i = math.floor(h),
        f = h - i,
        p = v * (1 - s),
        q = v * (1 - f * s),
        t = v * (1 - (1 - f) * s),
        mod = i % 6,
        r = [v, q, p, p, t, v][mod],
        g = [t, v, v, q, p, p][mod],
        b = [p, p, t, v, v, q][mod];

      return { r: r * 255, g: g * 255, b: b * 255 };
    }

    // `rgbToHex`
    // Converts an RGB color to hex
    // Assumes r, g, and b are contained in the set [0, 255]
    // Returns a 3 or 6 character hex
    function rgbToHex(r, g, b, allow3Char) {

      var hex = [
        pad2(mathRound(r).toString(16)),
        pad2(mathRound(g).toString(16)),
        pad2(mathRound(b).toString(16))
      ];

        // Return a 3 character hex if possible
      if (allow3Char && hex[0].charAt(0) == hex[0].charAt(1) && hex[1].charAt(0) == hex[1].charAt(1) && hex[2].charAt(0) == hex[2].charAt(1)) {
        return hex[0].charAt(0) + hex[1].charAt(0) + hex[2].charAt(0);
      }

      return hex.join('');
    }
        // `rgbaToHex`
        // Converts an RGBA color plus alpha transparency to hex
        // Assumes r, g, b and a are contained in the set [0, 255]
        // Returns an 8 character hex
    function rgbaToHex(r, g, b, a) {

      var hex = [
        pad2(convertDecimalToHex(a)),
        pad2(mathRound(r).toString(16)),
        pad2(mathRound(g).toString(16)),
        pad2(mathRound(b).toString(16))
      ];

      return hex.join('');
    }

    // `equals`
    // Can be called with any tinycolor input
    tinycolor.equals = function (color1, color2) {
      if (!color1 || !color2) { return false; }
      return tinycolor(color1).toRgbString() == tinycolor(color2).toRgbString();
    };
    tinycolor.random = function() {
      return tinycolor.fromRatio({
        r: mathRandom(),
        g: mathRandom(),
        b: mathRandom()
      });
    };


    // Modification Functions
    // ----------------------
    // Thanks to less.js for some of the basics here
    // <https://github.com/cloudhead/less.js/blob/master/lib/less/functions.js>

    function desaturate(color, amount) {
      amount = (amount === 0) ? 0 : (amount || 10);
      var hsl = tinycolor(color).toHsl();
      hsl.s -= amount / 100;
      hsl.s = clamp01(hsl.s);
      return tinycolor(hsl);
    }

    function saturate(color, amount) {
      amount = (amount === 0) ? 0 : (amount || 10);
      var hsl = tinycolor(color).toHsl();
      hsl.s += amount / 100;
      hsl.s = clamp01(hsl.s);
      return tinycolor(hsl);
    }

    function greyscale(color) {
      return tinycolor(color).desaturate(100);
    }

    function lighten (color, amount) {
      amount = (amount === 0) ? 0 : (amount || 10);
      var hsl = tinycolor(color).toHsl();
      hsl.l += amount / 100;
      hsl.l = clamp01(hsl.l);
      return tinycolor(hsl);
    }

    function brighten(color, amount) {
      amount = (amount === 0) ? 0 : (amount || 10);
      var rgb = tinycolor(color).toRgb();
      rgb.r = mathMax(0, mathMin(255, rgb.r - mathRound(255 * - (amount / 100))));
      rgb.g = mathMax(0, mathMin(255, rgb.g - mathRound(255 * - (amount / 100))));
      rgb.b = mathMax(0, mathMin(255, rgb.b - mathRound(255 * - (amount / 100))));
      return tinycolor(rgb);
    }

    function darken (color, amount) {
      amount = (amount === 0) ? 0 : (amount || 10);
      var hsl = tinycolor(color).toHsl();
      hsl.l -= amount / 100;
      hsl.l = clamp01(hsl.l);
      return tinycolor(hsl);
    }

    // Spin takes a positive or negative amount within [-360, 360] indicating the change of hue.
    // Values outside of this range will be wrapped into this range.
    function spin(color, amount) {
      var hsl = tinycolor(color).toHsl();
      var hue = (mathRound(hsl.h) + amount) % 360;
      hsl.h = hue < 0 ? 360 + hue : hue;
      return tinycolor(hsl);
    }

    // Combination Functions
    // ---------------------
    // Thanks to jQuery xColor for some of the ideas behind these
    // <https://github.com/infusion/jQuery-xcolor/blob/master/jquery.xcolor.js>

    function complement(color) {
      var hsl = tinycolor(color).toHsl();
      hsl.h = (hsl.h + 180) % 360;
      return tinycolor(hsl);
    }

    function triad(color) {
      var hsl = tinycolor(color).toHsl();
      var h = hsl.h;
      return [
        tinycolor(color),
        tinycolor({ h: (h + 120) % 360, s: hsl.s, l: hsl.l }),
        tinycolor({ h: (h + 240) % 360, s: hsl.s, l: hsl.l })
      ];
    }

    function tetrad(color) {
      var hsl = tinycolor(color).toHsl();
      var h = hsl.h;
      return [
        tinycolor(color),
        tinycolor({ h: (h + 90) % 360, s: hsl.s, l: hsl.l }),
        tinycolor({ h: (h + 180) % 360, s: hsl.s, l: hsl.l }),
        tinycolor({ h: (h + 270) % 360, s: hsl.s, l: hsl.l })
      ];
    }

    function splitcomplement(color) {
      var hsl = tinycolor(color).toHsl();
      var h = hsl.h;
      return [
        tinycolor(color),
        tinycolor({ h: (h + 72) % 360, s: hsl.s, l: hsl.l}),
        tinycolor({ h: (h + 216) % 360, s: hsl.s, l: hsl.l})
      ];
    }

    function analogous(color, results, slices) {
      results = results || 6;
      slices = slices || 30;

      var hsl = tinycolor(color).toHsl();
      var part = 360 / slices;
      var ret = [tinycolor(color)];

      for (hsl.h = ((hsl.h - (part * results >> 1)) + 720) % 360; --results; ) {
        hsl.h = (hsl.h + part) % 360;
        ret.push(tinycolor(hsl));
      }
      return ret;
    }

    function monochromatic(color, results) {
      results = results || 6;
      var hsv = tinycolor(color).toHsv();
      var h = hsv.h, s = hsv.s, v = hsv.v;
      var ret = [];
      var modification = 1 / results;

      while (results--) {
        ret.push(tinycolor({ h: h, s: s, v: v}));
        v = (v + modification) % 1;
      }

      return ret;
    }

    // Utility Functions
    // ---------------------

    tinycolor.mix = function(color1, color2, amount) {
      amount = (amount === 0) ? 0 : (amount || 50);

      var rgb1 = tinycolor(color1).toRgb();
      var rgb2 = tinycolor(color2).toRgb();

      var p = amount / 100;
      var w = p * 2 - 1;
      var a = rgb2.a - rgb1.a;

      var w1;

      if (w * a == -1) {
        w1 = w;
      } else {
        w1 = (w + a) / (1 + w * a);
      }

      w1 = (w1 + 1) / 2;

      var w2 = 1 - w1;

      var rgba = {
        r: rgb2.r * w1 + rgb1.r * w2,
        g: rgb2.g * w1 + rgb1.g * w2,
        b: rgb2.b * w1 + rgb1.b * w2,
        a: rgb2.a * p  + rgb1.a * (1 - p)
      };

      return tinycolor(rgba);
    };


    // Readability Functions
    // ---------------------
    // <http://www.w3.org/TR/AERT#color-contrast>

    // `readability`
    // Analyze the 2 colors and returns an object with the following properties:
    //    `brightness`: difference in brightness between the two colors
    //    `color`: difference in color/hue between the two colors
    tinycolor.readability = function(color1, color2) {
      var c1 = tinycolor(color1);
      var c2 = tinycolor(color2);
      var rgb1 = c1.toRgb();
      var rgb2 = c2.toRgb();
      var brightnessA = c1.getBrightness();
      var brightnessB = c2.getBrightness();
      var colorDiff = (
            Math.max(rgb1.r, rgb2.r) - Math.min(rgb1.r, rgb2.r) +
            Math.max(rgb1.g, rgb2.g) - Math.min(rgb1.g, rgb2.g) +
            Math.max(rgb1.b, rgb2.b) - Math.min(rgb1.b, rgb2.b)
        );

      return {
        brightness: Math.abs(brightnessA - brightnessB),
        color: colorDiff
      };
    };

    // `readable`
    // http://www.w3.org/TR/AERT#color-contrast
    // Ensure that foreground and background color combinations provide sufficient contrast.
    // *Example*
    //    tinycolor.isReadable("#000", "#111") => false
    tinycolor.isReadable = function(color1, color2) {
      var readability = tinycolor.readability(color1, color2);
      return readability.brightness > 125 && readability.color > 500;
    };

    // `mostReadable`
    // Given a base color and a list of possible foreground or background
    // colors for that base, returns the most readable color.
    // *Example*
    //    tinycolor.mostReadable("#123", ["#fff", "#000"]) => "#000"
    tinycolor.mostReadable = function(baseColor, colorList) {
      var bestColor = null;
      var bestScore = 0;
      var bestIsReadable = false;
      for (var i=0; i < colorList.length; i++) {

            // We normalize both around the "acceptable" breaking point,
            // but rank brightness constrast higher than hue.

        var readability = tinycolor.readability(baseColor, colorList[i]);
        var readable = readability.brightness > 125 && readability.color > 500;
        var score = 3 * (readability.brightness / 125) + (readability.color / 500);

        if ((readable && ! bestIsReadable) ||
                (readable && bestIsReadable && score > bestScore) ||
                ((! readable) && (! bestIsReadable) && score > bestScore)) {
          bestIsReadable = readable;
          bestScore = score;
          bestColor = tinycolor(colorList[i]);
        }
      }
      return bestColor;
    };


    // Big List of Colors
    // ------------------
    // <http://www.w3.org/TR/css3-color/#svg-color>
    var names = tinycolor.names = {
      aliceblue: 'f0f8ff',
      antiquewhite: 'faebd7',
      aqua: '0ff',
      aquamarine: '7fffd4',
      azure: 'f0ffff',
      beige: 'f5f5dc',
      bisque: 'ffe4c4',
      black: '000',
      blanchedalmond: 'ffebcd',
      blue: '00f',
      blueviolet: '8a2be2',
      brown: 'a52a2a',
      burlywood: 'deb887',
      burntsienna: 'ea7e5d',
      cadetblue: '5f9ea0',
      chartreuse: '7fff00',
      chocolate: 'd2691e',
      coral: 'ff7f50',
      cornflowerblue: '6495ed',
      cornsilk: 'fff8dc',
      crimson: 'dc143c',
      cyan: '0ff',
      darkblue: '00008b',
      darkcyan: '008b8b',
      darkgoldenrod: 'b8860b',
      darkgray: 'a9a9a9',
      darkgreen: '006400',
      darkgrey: 'a9a9a9',
      darkkhaki: 'bdb76b',
      darkmagenta: '8b008b',
      darkolivegreen: '556b2f',
      darkorange: 'ff8c00',
      darkorchid: '9932cc',
      darkred: '8b0000',
      darksalmon: 'e9967a',
      darkseagreen: '8fbc8f',
      darkslateblue: '483d8b',
      darkslategray: '2f4f4f',
      darkslategrey: '2f4f4f',
      darkturquoise: '00ced1',
      darkviolet: '9400d3',
      deeppink: 'ff1493',
      deepskyblue: '00bfff',
      dimgray: '696969',
      dimgrey: '696969',
      dodgerblue: '1e90ff',
      firebrick: 'b22222',
      floralwhite: 'fffaf0',
      forestgreen: '228b22',
      fuchsia: 'f0f',
      gainsboro: 'dcdcdc',
      ghostwhite: 'f8f8ff',
      gold: 'ffd700',
      goldenrod: 'daa520',
      gray: '808080',
      green: '008000',
      greenyellow: 'adff2f',
      grey: '808080',
      honeydew: 'f0fff0',
      hotpink: 'ff69b4',
      indianred: 'cd5c5c',
      indigo: '4b0082',
      ivory: 'fffff0',
      khaki: 'f0e68c',
      lavender: 'e6e6fa',
      lavenderblush: 'fff0f5',
      lawngreen: '7cfc00',
      lemonchiffon: 'fffacd',
      lightblue: 'add8e6',
      lightcoral: 'f08080',
      lightcyan: 'e0ffff',
      lightgoldenrodyellow: 'fafad2',
      lightgray: 'd3d3d3',
      lightgreen: '90ee90',
      lightgrey: 'd3d3d3',
      lightpink: 'ffb6c1',
      lightsalmon: 'ffa07a',
      lightseagreen: '20b2aa',
      lightskyblue: '87cefa',
      lightslategray: '789',
      lightslategrey: '789',
      lightsteelblue: 'b0c4de',
      lightyellow: 'ffffe0',
      lime: '0f0',
      limegreen: '32cd32',
      linen: 'faf0e6',
      magenta: 'f0f',
      maroon: '800000',
      mediumaquamarine: '66cdaa',
      mediumblue: '0000cd',
      mediumorchid: 'ba55d3',
      mediumpurple: '9370db',
      mediumseagreen: '3cb371',
      mediumslateblue: '7b68ee',
      mediumspringgreen: '00fa9a',
      mediumturquoise: '48d1cc',
      mediumvioletred: 'c71585',
      midnightblue: '191970',
      mintcream: 'f5fffa',
      mistyrose: 'ffe4e1',
      moccasin: 'ffe4b5',
      navajowhite: 'ffdead',
      navy: '000080',
      oldlace: 'fdf5e6',
      olive: '808000',
      olivedrab: '6b8e23',
      orange: 'ffa500',
      orangered: 'ff4500',
      orchid: 'da70d6',
      palegoldenrod: 'eee8aa',
      palegreen: '98fb98',
      paleturquoise: 'afeeee',
      palevioletred: 'db7093',
      papayawhip: 'ffefd5',
      peachpuff: 'ffdab9',
      peru: 'cd853f',
      pink: 'ffc0cb',
      plum: 'dda0dd',
      powderblue: 'b0e0e6',
      purple: '800080',
      rebeccapurple: '663399',
      red: 'f00',
      rosybrown: 'bc8f8f',
      royalblue: '4169e1',
      saddlebrown: '8b4513',
      salmon: 'fa8072',
      sandybrown: 'f4a460',
      seagreen: '2e8b57',
      seashell: 'fff5ee',
      sienna: 'a0522d',
      silver: 'c0c0c0',
      skyblue: '87ceeb',
      slateblue: '6a5acd',
      slategray: '708090',
      slategrey: '708090',
      snow: 'fffafa',
      springgreen: '00ff7f',
      steelblue: '4682b4',
      tan: 'd2b48c',
      teal: '008080',
      thistle: 'd8bfd8',
      tomato: 'ff6347',
      turquoise: '40e0d0',
      violet: 'ee82ee',
      wheat: 'f5deb3',
      white: 'fff',
      whitesmoke: 'f5f5f5',
      yellow: 'ff0',
      yellowgreen: '9acd32'
    };

    // Make it easy to access colors via `hexNames[hex]`
    var hexNames = tinycolor.hexNames = flip(names);


    // Utilities
    // ---------

    // `{ 'name1': 'val1' }` becomes `{ 'val1': 'name1' }`
    function flip(o) {
      var flipped = { };
      for (var i in o) {
        if (o.hasOwnProperty(i)) {
          flipped[o[i]] = i;
        }
      }
      return flipped;
    }

    // Return a valid alpha value [0,1] with all invalid values being set to 1
    function boundAlpha(a) {
      a = parseFloat(a);

      if (isNaN(a) || a < 0 || a > 1) {
        a = 1;
      }

      return a;
    }

    // Take input from [0, n] and return it as [0, 1]
    function bound01(n, max) {
      if (isOnePointZero(n)) { n = '100%'; }

      var processPercent = isPercentage(n);
      n = mathMin(max, mathMax(0, parseFloat(n)));

        // Automatically convert percentage into number
      if (processPercent) {
        n = parseInt(n * max, 10) / 100;
      }

        // Handle floating point rounding errors
      if ((math.abs(n - max) < 0.000001)) {
        return 1;
      }

        // Convert into [0, 1] range if it isn't already
      return (n % max) / parseFloat(max);
    }

    // Force a number between 0 and 1
    function clamp01(val) {
      return mathMin(1, mathMax(0, val));
    }

    // Parse a base-16 hex value into a base-10 integer
    function parseIntFromHex(val) {
      return parseInt(val, 16);
    }

    // Need to handle 1.0 as 100%, since once it is a number, there is no difference between it and 1
    // <http://stackoverflow.com/questions/7422072/javascript-how-to-detect-number-as-a-decimal-including-1-0>
    function isOnePointZero(n) {
      return typeof n == 'string' && n.indexOf('.') != -1 && parseFloat(n) === 1;
    }

    // Check to see if string passed in is a percentage
    function isPercentage(n) {
      return typeof n === 'string' && n.indexOf('%') != -1;
    }

    // Force a hex value to have 2 characters
    function pad2(c) {
      return c.length == 1 ? '0' + c : '' + c;
    }

    // Replace a decimal with it's percentage value
    function convertToPercentage(n) {
      if (n <= 1) {
        n = (n * 100) + '%';
      }

      return n;
    }

    // Converts a decimal to a hex value
    function convertDecimalToHex(d) {
      return Math.round(parseFloat(d) * 255).toString(16);
    }
    // Converts a hex value to a decimal
    function convertHexToDecimal(h) {
      return (parseIntFromHex(h) / 255);
    }

    var matchers = (function() {

        // <http://www.w3.org/TR/css3-values/#integers>
      var CSS_INTEGER = '[-\\+]?\\d+%?';

        // <http://www.w3.org/TR/css3-values/#number-value>
      var CSS_NUMBER = '[-\\+]?\\d*\\.\\d+%?';

        // Allow positive/negative integer/number.  Don't capture the either/or, just the entire outcome.
      var CSS_UNIT = '(?:' + CSS_NUMBER + ')|(?:' + CSS_INTEGER + ')';

        // Actual matching.
        // Parentheses and commas are optional, but not required.
        // Whitespace can take the place of commas or opening paren
      var PERMISSIVE_MATCH3 = '[\\s|\\(]+(' + CSS_UNIT + ')[,|\\s]+(' + CSS_UNIT + ')[,|\\s]+(' + CSS_UNIT + ')\\s*\\)?';
      var PERMISSIVE_MATCH4 = '[\\s|\\(]+(' + CSS_UNIT + ')[,|\\s]+(' + CSS_UNIT + ')[,|\\s]+(' + CSS_UNIT + ')[,|\\s]+(' + CSS_UNIT + ')\\s*\\)?';

      return {
        rgb: new RegExp('rgb' + PERMISSIVE_MATCH3),
        rgba: new RegExp('rgba' + PERMISSIVE_MATCH4),
        hsl: new RegExp('hsl' + PERMISSIVE_MATCH3),
        hsla: new RegExp('hsla' + PERMISSIVE_MATCH4),
        hsv: new RegExp('hsv' + PERMISSIVE_MATCH3),
        hsva: new RegExp('hsva' + PERMISSIVE_MATCH4),
        hex3: /^([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
        hex6: /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,
        hex8: /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/
      };
    })();

    // `stringInputToObject`
    // Permissive string parsing.  Take in a number of formats, and output an object
    // based on detected format.  Returns `{ r, g, b }` or `{ h, s, l }` or `{ h, s, v}`
    function stringInputToObject(color) {

      color = color.replace(trimLeft,'').replace(trimRight, '').toLowerCase();
      var named = false;
      if (names[color]) {
        color = names[color];
        named = true;
      }
      else if (color == 'transparent') {
        return { r: 0, g: 0, b: 0, a: 0, format: 'name' };
      }

        // Try to match string input using regular expressions.
        // Keep most of the number bounding out of this function - don't worry about [0,1] or [0,100] or [0,360]
        // Just return an object and let the conversion functions handle that.
        // This way the result will be the same whether the tinycolor is initialized with string or object.
      var match;
      if ((match = matchers.rgb.exec(color))) {
        return { r: match[1], g: match[2], b: match[3] };
      }
      if ((match = matchers.rgba.exec(color))) {
        return { r: match[1], g: match[2], b: match[3], a: match[4] };
      }
      if ((match = matchers.hsl.exec(color))) {
        return { h: match[1], s: match[2], l: match[3] };
      }
      if ((match = matchers.hsla.exec(color))) {
        return { h: match[1], s: match[2], l: match[3], a: match[4] };
      }
      if ((match = matchers.hsv.exec(color))) {
        return { h: match[1], s: match[2], v: match[3] };
      }
      if ((match = matchers.hsva.exec(color))) {
        return { h: match[1], s: match[2], v: match[3], a: match[4] };
      }
      if ((match = matchers.hex8.exec(color))) {
        return {
          a: convertHexToDecimal(match[1]),
          r: parseIntFromHex(match[2]),
          g: parseIntFromHex(match[3]),
          b: parseIntFromHex(match[4]),
          format: named ? 'name' : 'hex8'
        };
      }
      if ((match = matchers.hex6.exec(color))) {
        return {
          r: parseIntFromHex(match[1]),
          g: parseIntFromHex(match[2]),
          b: parseIntFromHex(match[3]),
          format: named ? 'name' : 'hex'
        };
      }
      if ((match = matchers.hex3.exec(color))) {
        return {
          r: parseIntFromHex(match[1] + '' + match[1]),
          g: parseIntFromHex(match[2] + '' + match[2]),
          b: parseIntFromHex(match[3] + '' + match[3]),
          format: named ? 'name' : 'hex'
        };
      }

      return false;
    }

    window.tinycolor = tinycolor;
  })();

  $(function () {
    if ($.fn.spectrum.load) {
      $.fn.spectrum.processNativeColorInputs();
    }
  });

});

/* global searchHandler:false,  */
/* exported activeRegion */

var activeRegion = { // methods and members for currently active region
  geofence: null,
  region: undefined,

  set: function(region) {
    if (typeof region == 'undefined') {
      return; // if database is empty, do nothing
    }

    markers.clear();

    this.region = region;
    if (typeof region.geofence !== 'undefined' && region.geofence !== null ) {
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
      if (this.region.regionName == null) { // default global region
        this.region.markers.forEach(function(element) {
          markers.place(element);
        });
      } else if (this.region.type == 'classic') {
        this.region.markers.forEach((element) => { markers.place(element); });
      }
    }
  }, // refresh

  clear: function() {
    if (this.geofence != null) {
      this.geofence.setMap(null);
      this.geofence = null;
    }
    this.set(regions.list[null]);
    markers.resumeFetch();
  } // clear

}; // activeRegion

/* global activeRegion: false, MarkerSequence: false, regionPanelSettings: false */
/* exported regionPanel */

var regionPanel = {

  open: function(region) {
    panToPromise(geovoiceApi.parseLocation(region));
    history.replaceState('', region.regionName+' - Geovoice', getBaseUrl()+'/region/'+region._id);
    activeRegion.set(region);
    this.createHtml(region);
  }, // open

  close: function() {
    activeRegion.clear();
    history.replaceState('', 'Geovoice', getBaseUrl());
    document.querySelector('.right-panel').classList.remove('slide-in');
  }, // close

  createHtml: function(region) {

    var listContainer = document.createElement('ul');
    listContainer.className = 'mdl-list';

    if (region.type == 'sequence' && region.markers.length > 0) {
      var sequence = new MarkerSequence(region);
      listContainer.appendChild(sequence.getElement());
    } else if (region.type == 'classic') {
      region.markers.forEach( (marker) => {
        listContainer.appendChild(ui.createMarkerLi(marker));
      });
    }

    // Show no recording message if no markers exist
    if (listContainer.childElementCount == 0) {
      var p = document.createElement('P');
      p.textContent = 'There aren\'t any recordings yet, why don\'t you add one?';

      var divNo = document.createElement('div');
      divNo.id = 'no-recordings';
      divNo.appendChild(p);

      listContainer.appendChild(divNo);
    }

    // Create a close panel button
    var button = document.createElement('button');
    button.className = 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect right-panel__button';
    button.onclick = regionPanel.close;
    button.textContent = 'Close';

    var div = document.createElement('div');
    div.style['padding-left'] = '15px';
    div.appendChild(button);

    listContainer.appendChild(div);

    var rightPanel = document.querySelector('.right-panel');

    ui.clearContainer(rightPanel);
    rightPanel.appendChild(this.createTitle(region.regionName));
    rightPanel.appendChild(this.createGear(() => {
        regionPanelSettings.constructor(region, sheetContainer);
      }));
    rightPanel.appendChild(listContainer);

    rightPanel.classList.add('slide-in');
  }, // createHtml

  createTitle: function(title) {
    var span = document.createElement('span');
    span.className = 'right-panel__title';
    span.textContent = title;
    return span;
  }, // createTitle

  createGear: function(onClick) {
    var i = document.createElement('i');
    i.className = 'region-panel__settings_button material-icons';
    i.textContent = 'settings';

    var a = document.createElement('a');
    a.className = 'mdl-navigation__link';
    a.addEventListener('click', onClick);
    a.appendChild(i);
    return a;
  }, // createGear
}; // regionPanel

/* global regionPanel: false, Sortable: false */
/* export regionPanelSettings */

var regionPanelSettings = {
  constructor: function(region, parent) {
    this.region = region;
    this.parent = parent;
    ui.clearContainer(parent);
    this.initializeElement();
  },

  initializeElement: function() {
    this.parent.appendChild(regionPanel.createTitle(this.region.regionName));
    this.parent.appendChild(
      this.createBackButton(() => {
        //regionPanel.close();
        regionPanel.open(this.region);
        this.updateMarkerOrder();
      })
    );

    var ul = document.createElement('ul');
    ul.className = 'mdl-list';
    this.region.markers.forEach((item) => { ul.appendChild(ui.createMarkerLi(item, { draggable: true })); });
    this.parent.appendChild(ul);

    var region = this.region; // TODO see if this is needed
    var sortable = Sortable.create(ul, { // makes marker list sortable
      handle: '.drag_handle',
      onEnd: this.reorderMarkers
    });
  },

  updateMarkerOrder: function() {
    var data = new FormData();
    data.append('regionId', this.region._id);
    data.append('markers', JSON.stringify(regions.getTransporatableList(this.region)));

    $.ajax({
      url : '/update_marker_order',
      type: 'POST',
      data: data,
      contentType: false,
      processData: false,
      success: function() {
        ui.createSnack('marker reorder complete');
      },
      error: function() {
        ui.createSnack('Error reordering markers');
      }
    });
  },

  reorderMarkers: function(event) {
    var movedMarker = regionPanelSettings.region.markers[event.oldIndex];
    regionPanelSettings.region.markers.splice(event.oldIndex,1);
    regionPanelSettings.region.markers.splice(event.newIndex, 0, movedMarker);
  },

  createBackButton: function(onClick) {
    var i = document.createElement('i');
    i.className = 'region-panel__settings_button material-icons';
    i.textContent = 'arrow_back';

    var a = document.createElement('a');
    a.className = 'mdl-navigation__link';
    a.addEventListener('click', onClick);
    a.appendChild(i);
    return a;
  },
}; // regionPanelSettings

/* global activeRegion: false, regionPanel: false */
/* exported regions */

var regions = {

  list: [],

  fetch: function() {
		//var bounds = map.getBounds();
		// TODO create ajax request for markers, then delete current markers and show new
		// https://developers.google.com/maps/articles/toomanymarkers#distancebasedclustering

		// Dont refresh markers if InfoWindow is open
    if (!markers.fetchActive) {
      return;
    }
    $.ajax({
      url: '/get_markers',
      type: 'GET',
      success: function(data) {
        var regionList = JSON.parse(data);
        regions.clear();
        if (regionList.length == 0) {
          regions.createTempList();
        } else {
          for (var d = 0; d < regionList.length; d++) {
            if (regionList[d].regionName == 'null') {
              regionList[d].regionName = null;
            }
            regions.place(regionList[d]);
          }
        }

        regions.updateActiveRegion(regionList);

      },
      error: function(e) {
        ui.createSnack('Error retrieving markers: ' + e.toString());
      }
    });
  }, // fetch

  updateActiveRegion: function(regionList) {
    if (typeof activeRegion.region === 'undefined') {
      var rP = location.href.indexOf('region');
      var regionName = null;
      if (rP > -1) {
        var id = location.href.slice(rP+'region/'.length);
        regionList.some( (region) => {
          if (region._id == id) {
            regionPanel.open(regions.list[region.regionName]);
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
    data.append('regionName', region.regionName);
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

  getTransporatableList: function(region) {
    var markers = {};
    region.markers.forEach( marker => {
      markers.append({
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
    return markers;
  }, // getTransporatableList

  place: function(region) {  // ! this changes region.geofence from string to array
    if (region.regionName != null) {
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
		//markers.list.push(marker);
    this.list[region.regionName] = region;

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
      regionName: null,
      markers: []
    };
  }, // createTempList

  clear: function() {
    for (var region in regions.list) {
      if (typeof regions.list[region].marker != 'undefined') {
        regions.list[region].marker.setMap(null);
        regions.list[region].marker = null;
      }
    }
    markers.clear();
  } // clear
}; // regions

/* exported drawingUi */

var drawingUi = {

  manager: null,

  init: function() {
    this.manager = new google.maps.drawing.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.MARKER,
      drawingControl: true,
      drawingControlOptions: {
        position: google.maps.ControlPosition.TOP_CENTER,
        drawingModes: ['polygon']
      },
      polygonOptions: {
        fillOpacity: 0.3,
        fillColor: '#1998F7',
        editable: true,
        zIndex: 1
      }
    });
    this.manager.setMap(map);
    this.manager.setDrawingMode(null);
    setTimeout(function() {
      drawingUi.fixIcons();
      var drawingComplete = function(event) {
        var doneButton = $('#done-drawing');
        doneButton.css({
          'background-color': 'lightgreen'
        });

        doneButton.off('click').on('click', function() {
          drawingUi.destroy();
          regionUi.add.classic(event.overlay);
        });
      };
      google.maps.event.addListener(drawingUi.manager, 'overlaycomplete', drawingComplete);
    }, 200);


    // self destruct if user clicks anything else
    document.querySelectorAll('a').forEach( (a) => {
      a.addEventListener('click', () => {
        drawingUi.destroy();
        var event = this;
        document.querySelectorAll('a').forEach( (aa) => {
          aa.removeEventListener('click', event);
        });
      });
    });
  }, // init

  destroy: function() {
    if (this.manager != null) {
      this.manager.setMap(null);
      this.manager.setOptions({
        drawingControls: false
      });
    this.manager = null;
    }

  }, // destroy

  fixIcons: function() {
    $('.gmnoprint').each(function() {

      var setIcon = function(obj, icon) {
        obj.children().children().remove();
        obj.css('padding', '4px');
        obj.children().html(`<div class='drawing-manager-button'>
                                <i class="material-icons">` + icon + `</i>
                              </div>`);

      };

      var panButton = $(this).find('[title="Stop drawing"]');
      var polyButton = $(this).find('[title="Draw a shape"]');
      var container = panButton.parent().parent();

      panButton.attr('id', 'pan-tool');
      polyButton.attr('id', 'line-tool');
      polyButton.addClass('help');
      polyButton.attr('title', '');
      polyButton.attr('overflow', 'visible');

      // Change DrawingManager button icons
      setIcon(panButton, 'pan_tool');
      setIcon(polyButton, 'linear_scale');

      //Add finished editing button
      var doneButton = drawingUi.createButton('done-drawing', 'Finished drawing', 'check');
      container.append(doneButton);
    });
    drawingUi.showHelp(document.getElementById('line-tool'), document.getElementById('done-drawing'));
  }, // fixIcons

  showHelp: function(polyButton, doneButton) {
    setTimeout( () => { polyButton.classList.add('help');
      setTimeout( () => {
        polyButton.classList.remove('help');
        doneButton.classList.add('help');
        setTimeout( () => doneButton.classList.remove('help'),
          4000);
      }, 2000);
    }, 200);
  }, // showHelp

  createButton(id, title, icon, action = null) {
    var i = document.createElement('i');
    i.className = 'material-icons';
    i.textContent = icon;

    var innerDiv = document.createElement('div');
    innerDiv.className = 'drawing-manager-button';
    innerDiv.appendChild(i);

    var span = document.createElement('span');
    span.style = 'display: inlink-block;';
    span.appendChild(innerDiv);

    var div = document.createElement('div');
    div.id = id;
    div.draggable = false;
    div.title = title;
    div.className = 'drawing-manager-button-container';
    div.appendChild(span);

    var outerDiv = document.createElement('div');
    outerDiv.style = 'float: left; line-height: 0;';
    outerDiv.appendChild(div);

    if (action != null) {
      div.onClick = action;
    }

    return outerDiv;
  }, // createButton

  requestDrawing: function() {
    this.manager.activate(true);
  } // requestDrawing

}; // drawingUi

/* global drawingUi: false */
/* exported regionUi */

var regionUi = {

  add: {
    requestType: function() {
      showDialog({
        title: 'Which type of region would you like to make?',
        text: `
            We now support two different types of regions
            <div id='regionUi-container'></div>
            `,
        onLoaded: () => {
          var container = document.getElementById('regionUi-container');
          var classicDesc = 'Classic - region has a geofence, and marker to open';
          var sequenceDesc = 'Sequence - region markers are played in sequence';

          container.appendChild(ui.createRadio('classic', classicDesc, 'classic', 'type', true));
          container.appendChild(ui.createRadio('sequence', sequenceDesc, 'sequence', 'type'));
        },
        positive: {
          title: 'Ok',
          onClick: () => {
            var container = document.getElementById('regionUi-container');
            var selectionId = container.querySelector('input:checked').id;

            if (selectionId == 'classic') {
              drawingUi.init();
            } else if (selectionId == 'sequence') {
              ui.pickPoint();
              //regionUi.add.sequence();
            }
          }
        },
        negative: {
          title: 'Cancel'
        }
      });
    }, // requestType

    sequence: function(location) {
      //google.maps.event.addListenerOnce(map, 'click', resolve);

      var region = {
        lat: location.lat(),
        lng: location.lng(),
        geofence: null,
        type: 'sequence'
      };

      this.showCreateDialog(region);
    }, // sequence

    classic: function(geofence) {
      var location = geofence.c_getBounds().getCenter();

      var region = {
        lat: location.lat(),
        lng: location.lng(),
        geofence: geofence.c_getLatLngLiteralArray(),
        type: 'classic'
      };

      geofence.setMap(null);

      this.showCreateDialog(region);
    }, // classic


    showCreateDialog: function(region) {
      $.ajax({
        url: '/dialogs/addRegion.pug',
        type: 'GET',
        contentType: false,
        processData: false,
        success: function(data) {
          showDialog({
            title: 'Add Region',
            text: data,
            onLoaded: function() {

              // accordian animation
              $('.accordian-expand').click(
                () => $(event.target).next('.accordian-content').toggleClass('open'));

              // icon selection
              $('.map-marker').click((event) => {
                var icon = $(event.target).attr('id');
                var selected = $(event.target).parent().prevAll('span').first();
                var accordianContent = selected.nextAll('div').first();
                selected.
                attr('class', 'map-icon radio-map-icon ' + icon).
                attr('data-icon', icon);
                $(accordianContent).toggleClass('open');
              });

              //set initial icon
              $('.map-icon-point-of-interest').prop('checked', true);
              $('#selected-icon').
              attr('class', 'map-icon radio-map-icon map-icon-point-of-interest').
              attr('data-icon', 'map-icon-point-of-interest');

              var initialColor = '#1998F7';

              var markerShape = $('#selected-marker-shape');
              markerShape.css({
                'color': initialColor
              });
              markerShape.
              attr('class', 'map-icon radio-map-icon map-icon-map-pin').
              attr('data-icon', 'map-icon-map-pin');
              markerShape.nextAll('div').first().children().css({
                'color': initialColor
              });


              $('#region-palette').spectrum({ // Color picker
                showPaletteOnly: true,
                togglePaletteOnly: true,
                togglePaletteMoreText: 'more',
                togglePaletteLessText: 'less',
                hideAfterPaletteSelect: true,
                color: initialColor,
                palette: [
                  ['#00CCBB', '#1998F7', '#6331AE'],
                ],
                change: function(color) {
                  var hColor = color.toHexString();
                  var markerShape = $('#selected-marker-shape');
                  $('#region-color').attr('data-color', hColor);
                  markerShape.css({
                    'color': hColor
                  });
                  markerShape.nextAll('div').first().children().css({
                    'color': hColor
                  });
                },
              });

            },
            positive: {
              title: 'okay',
              onClick: function() {
                var color = $('#region-color').data('color');
                var icon = $('#selected-icon').attr('data-icon');
                var shape = $('#selected-marker-shape').attr('data-icon');
                var name = $('#region-name').val();

                // Add region marker properties
                region.icon = icon;
                region.shape = shape.substring('map-icon-'.length);
                region.color = color;
                region.regionName = name;
                regions.create(region);
              }
            }
          });
        },
        error: function() {
          ui.createSnack('Couldn\'t fetch dialog');
        }
      });
    }, // showCreateDialog
  }
};

/* global sound: false */
/* exported soundUi */

var soundUi = {

  request: function() {
    showDialog({
      title: 'Record some audio',
      text: 'Start recording? <a class="clickable" onClick="soundUi.requestUpload()">upload</a>',
      positive: {
        title: 'yes',
        onClick: function() {
          sound.start();
        }
      },
      negative: {
        title: 'cancel',
        onClick: function() {
          sound.cleanup();
        }
      }
    });
  }, // requestRecording

  requestUpload: function() { // request upload instead of recording
    sound.cleanup();
    showDialog({
      title: 'Lets do some dragging then',
      text: '<div id="dropContainer"></div>',
      onLoaded: () => {
        var container = document.getElementById('dropContainer');
        var dropZone = ui.createDropZone( (file) => {
          sound.blob = file;
          ui.loading.show();
          soundUi.preview(sound.location, URL.createObjectURL(file));
          ui.loading.hide();

        }, { type: 'audio' });
        container.append(dropZone);
      },
      negative: {
        title: 'cancel'
      }
    });
  }, // requestUpload

  preview: function(gps, url) {
    showDialog({ // class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect"
      title: 'Sound Good?',
      text: `
          <div id='marker-region-selection'>
          <div>Add it to a region</div>
          <select id="regions" class="mdl-button">
            <option value="none">none</option>
          <select>
          </div>
          <span>
          <audio controls id="recording-player">
            Your browser doesn't support playback
          </audio>
          <a id='recording-save' download="recording.mp3">Save</a>
          </span>
        `,
      onLoaded: function() {
        var player = $('#recording-player');
        player.attr('src', url);
        $('#recording-save').attr('href', url);
        player[0].load();

        if (!ENABLE_REGIONS) {
          document.getElementById('marker-region-selection').remove();
        } else {

          var regionsContainer = $('#regions');

          for (var place in regions.list) {
            if (regions.list[place].type == 'sequence') {
              regionsContainer.append('<option value="' + place + '">' + place + '</option>');
            } else if (regions.list[place].type == 'classic') {
              if (getBounds(regions.list[place].geofence).contains(sound.location)) {
                regionsContainer.append('<option value="' + place + '">' + place + '</option>');
              }
            }
          }
        }
      },
      positive: {
        title: 'yes',
        onClick: function() {
          var region;
          if (ENABLE_REGIONS) {
            var selected = $('#regions option:selected').text();
            region = (selected == 'none' ? null : selected);
          } else {
            region = null;
          }
          sound.upload(region);
          sound.cleanup();
        }
      },
      negative: {
        title: 'no',
        onClick: function() {
          sound.cleanup();
        }
      }
    });
  }, // recordPreview

  timer: function() {
    // Timer logic
    var time = 0.00;
    var timerInterval = setInterval(function() {
      time += 0.01;
      $('#recording-timer').text(time.toFixed(2));
    }, 1000);

    showDialog({
      title: 'Recording',
      text: '<h4><a id="recording-timer">0.00</a></h4>',
      positive: {
        title: 'done',
        onClick: function() {
          sound.stop();
          clearInterval(timerInterval);
        }
      },
      negative: {
        title: 'cancel',
        onClick: function() {
          sound.cleanup();
          clearInterval(timerInterval);
        }
      }
    });
  } // recordTimer
};

/* globals showLoading, hideLoading */

var ui = {
  createSnack: function(message, actionText = null, actionHandler = null) {
    var notification = document.querySelector('.mdl-js-snackbar');
    notification.MaterialSnackbar.showSnackbar({
      message: message,
      actionText: actionText,
      actionHandler: actionHandler
    });
  }, // createSnack

  createCheckbox: function(id, labelText) {
    var span = document.createElement('span');
    span.className = 'mdl-checkbox__label';
    span.textContent = labelText;

    var input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.className = 'mdl-checkbox__input';

    var label = document.createElement('label');
    label.className = 'mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect';
    label.for = id;
    label.appendChild(input);
    label.appendChild(span);
    return label;
  }, // createCheckbox

  createDropZone: function(callback, options) {
    options.type = options.type || 'image';
    options.class = options.class || 'drop-zone';
    options.enablePicker = options.enablePicker || true;

    var handleFile = function(file) {
      if (file.type.startsWith(options.type)) {
        callback(file);
      } else {
        dropZone.textContent = 'Only accepts '+options.type;
      }
    };

    var dropZone = document.createElement('div');
    dropZone.textContent = 'Drop '+options.type+' here';
    dropZone.className = options.class+' clickable';

    if (options.enablePicker) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = options.type+'/*';
      input.onchange = () => { handleFile(input.files[0]); };
      dropZone.addEventListener('click', () => { input.click();});
    }

    dropZone.addEventListener('dragover', event => event.preventDefault(), false);
    dropZone.addEventListener('drop', (event) => {
      event.preventDefault();
      handleFile(event.dataTransfer.files[0]);
    }, false);
    return dropZone;
  }, // createDropZone

  createMarkerContent: function(marker) {
    var container = document.createElement('div');
    container.className = 'marker-content';

    var pic = document.createElement('a');
    pic.className = 'user-pic';
    pic.setAttribute('href','/user/'+marker.info.creator);
    container.appendChild(pic);

    var meta = document.createElement('div');
    meta.style.float = 'left';

    var name = document.createElement('h5');
    name.textContent = marker.info.creator;
    meta.appendChild(name);

    var date = new Date(marker.info.date);
    var dateEl = document.createElement('h8');
    dateEl.textContent = 'At '+date.toLocaleTimeString() + ' on ' + date.toLocaleDateString();
    meta.appendChild(dateEl);
    container.append(meta);
    container.appendChild(document.createElement('br'));
    container.innerHTML += markers.getMediaElement(marker);
    container.appendChild(document.createElement('br'))

    var tags = document.createElement('span');
    tags.setAttribute('id', 'tag-container');
    container.appendChild(tags);

    geovoiceApi.getuser(
      marker.info.creator == 'you - still pending' ? document.querySelector('a[href="user"]').textContent : marker.info.creator)
      .then( (user) => { document.querySelector('.user-pic').style.backgroundImage = 'url("'+user.img+'")'});
    return container;
  },

  createMarkerLi: function(marker, options = {}) {
    options.draggable = options.draggable || false;

    var media;
    if (marker.type == 'audio' || marker.type == 'sound') {
      media = document.createElement('audio');
      media.controls = true;
      media.src = getResource(marker.media);
    } else if (marker.type == 'video') {
      media = document.createElement('a');
      media.addEventListener('click', () => {ui.popoutVideo(marker.media); });
      media.className = 'mdl-navigation__link';
      media.textContent = 'View video';
      media.style.padding ='10px';
    }

    var subTitle = document.createElement('span');
    subTitle.className = 'mdl-list__item-sub-title';
    subTitle.appendChild(media);

    var dateContent = document.createElement('span');
    dateContent.textContent = new Date(marker.date).toLocaleTimeString()+' on '+ new Date(marker.date).toLocaleDateString();

    var primaryContent = document.createElement('span');
    primaryContent.className = 'mdl-list__item-primary-content';
    primaryContent.appendChild(dateContent);
    primaryContent.appendChild(subTitle);

    var li = document.createElement('li');
    li.className = 'mdl-list__item mdl-list__item--two-line';
    li.style = 'border-top: 1px solid #ddd;';

    if (options.draggable) {
      var dragHandle = document.createElement('i');
      dragHandle.className = 'drag_handle material-icons';
      dragHandle.textContent= 'drag_handle';
      dragHandle.style = 'padding-right: 10px; color:#757575;';
      li.appendChild(dragHandle);
    }

    li.appendChild(primaryContent);

    return li;
  }, // createMarkerLi

  popoutVideo: function(src) {
    showDialog({
      text: '<video width="100%" type="video/webm" controls src="/'+src+'"></vide>'
    });
  }, // popoutVideo

  createCropModal: function(src, callback) {
    var croppie;
    showDialog({
      text: '<div id="croppie-target"></div>',
      onLoaded: function() {
        var target = document.getElementById('croppie-target');
        croppie = new Croppie(target, {
          viewport: { width: '10vw', height: '10vw'},
          boundary: { width: 300, height: 300}
        });
        croppie.bind({ url: src});
      },
      positive: {
        title: 'ok',
        onClick: function() {
          croppie.result({type: 'blob'}).then(callback);
        }
      },
      negative: {
        title: 'cancel'
      }
    });

  }, // createCropModal

  clearContainer: function(container) {
    while(container.firstChild) {
      container.removeChild(container.firstChild);
    }
  }, // clearContainer

  createAudio: function(url) {
    var audio = document.createElement('audio');
    audio.controls = true;
    audio.src = url;
    return audio;
  }, // createAudio

  createRadio: function(id, labelText, value, group, checked = false) {
    var span = document.createElement('span');
    span.className = 'mdl-radio__label';
    span.textContent = labelText;

    var input = document.createElement('input');
    input.type = 'radio';
    input.id = id;
    input.className = 'mdl-radio__button';
    input.name = group;
    input.value = value;
    input.checked = checked;

    var label = document.createElement('label');
    label.className = 'mdl-radio mdl-js-radio mdl-js-ripple-effect';
    label.for = id;
    label.appendChild(input);
    label.appendChild(span);
    return label;
  }, // createRadio

  loading: {
    show: function(timeout = 3000) {
      showLoading();
      setTimeout(function() {
        ui.loading.hide();
      }, timeout);
    }, // show

    hide: function() {
      hideLoading();
    } // hide

  }, // loading

  pickPoint: function() {
    var location = null;

    var getMapClick = function() {
      google.maps.event.addListenerOnce(map, 'click', (e) => {
        location = e.latLng;
        showDialog(confirmContent);
      });
    };

    var confirmContent = {
      title: 'This your point?',
      text: 'Is this where you want to set your point?',
      positive: { title: 'Yes', onClick: () => regionUi.add.sequence(location)},
      negative: { onClick: getMapClick}
    };

    var info = {
      title: 'Pick a location',
      text: 'Click on the map where you want your initial region point to be',
      positive: { onClick: getMapClick}
    };
    showDialog(info);
  } // pickPoint
}; // ui

/* global videoUi: false, showDialog: false */
/* exported videoUi */

var videoUi = {

  request: function(videoSource) {
    showDialog({
      title: 'Record a video',
      text: 'Start recording?<br>'+
              '<video width="100%" autoplay muted src="'+videoSource+'"></video>'+
              '<a class="clickable" onClick="videoUi.requestUpload()">upload</a>'
      ,
      positive: {
        title: 'yes',
        onClick: function() {
          video.start();
        }
      },
      negative: {
        title: 'cancel',
        onClick: function() {
          video.cleanup();
        }
      }
    });
  }, //request

  requestUpload: function() { // request upload instead of recording
    video.cleanup();
    showDialog({
      title: 'Lets do some dragging then',
      text: '<div id="dropContainer"></div>',
      onLoaded: () => {
        var container = document.getElementById('dropContainer');
        var dropZone = ui.createDropZone( (file) => {
          //var reader = new FileReader();
          video.blob = file;
          ui.loading.show();
          videoUi.preview(video.location, URL.createObjectURL(file));
          ui.loading.hide();

        }, { type: 'video' });
        container.append(dropZone);
      },
      negative: {
        title: 'cancel'
      }
    });
  }, // requestUpload

  timer: (videoSource) => {
    var time = 0.00;
    var timerInterval = setInterval(() => {
      time += 0.01;
      document.getElementById('recording-timer').textContent = time.toFixed(2);
    }, 1000);

    showDialog({
      title: 'Recording',
      text: '<div id="video-container" style="position:relative;">'+
              '<video width="100%" autoplay muted src="'+videoSource+'"></video>'+
              '<h4><a id="recording-timer" class="overlay-br">0.00</a></h4>'+
            '</div>',
      positive: {
        title: 'done',
        onClick: function() {
          video.stop();
          clearInterval(timerInterval);
        }
      },
      negative: {
        title: 'cancel',
        onClick: function() {
          video.cleanup();
          clearInterval(timerInterval);
        }
      }
    });
  }, // timer

  preview: function(location, url) {
    showDialog({
      title: 'Look Good?',
      text: `
      <div id='marker-region-selection'>
      <div>Add it to a region</div>
      <select id="regions" class="mdl-button">
        <option value="none">none</option>
      <select>
      </div>
      <span>
      <video style="width:100%;" controls id="recording-player">
        Your browser doesn't support playback
      </video>
      <a id='recording-save' download="recording.webm">Save</a>
      </span>
      `,
      onLoaded: function() {
        var player = document.querySelector('#recording-player');
        player.src = url;
        document.querySelector('#recording-save').href = url;

        if (!ENABLE_REGIONS) {
          document.getElementById('marker-region-selection').remove();
        } else {

          var regionsContainer = $('#regions');
          for (var place in regions.list) {
            if (regions.list[place].type == 'sequence') {
              regionsContainer.append('<option value="' + place + '">' + place + '</option>');
            } else if (regions.list[place].type == 'classic') {
              if (getBounds(regions.list[place].geofence).contains(video.location)) {
                regionsContainer.append('<option value="' + place + '">' + place + '</option>');
              }
            }
          }
        }
      },
      positive: {
        title: 'yes',
        onClick: function() {
          var region;
          if (ENABLE_REGIONS) {
            var selected = $('#regions option:selected').text();
            region = (selected == 'none' ? null : selected);
          } else {
            region = null;
          }
          video.upload(region);
          video.cleanup();
        }
      },
      negative: {
        title: 'no',
        onClick: function() {
          video.cleanup();
        }
      }
    });
  }
};
