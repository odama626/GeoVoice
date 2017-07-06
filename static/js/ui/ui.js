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
    pic.setAttribute('href','/user/e/'+marker.info.creator);
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
    container.innerHTML += geovoice._markers.getItemView(marker.info);
    container.appendChild(document.createElement('br'))

    var tags = document.createElement('span');
    tags.style.display = 'flex';
    tags.style['flex-wrap'] = 'wrap';
    tags.setAttribute('id', 'tag-container');
    container.appendChild(tags);

    geovoiceApi.getuser(
      marker.info.creator == 'you - still pending' ? document.querySelector('a[href="user"]').textContent : marker.info.creator)
      .then( (user) => { document.querySelector('.user-pic').style.backgroundImage = 'url("'+user.img+'")'});
    return container;
  },

  createGroupLi: function(group) {
    var name = document.createElement('span');
    name.textContent = group.name;

    var secondaryContent = document.createElement('span');
    secondaryContent.className = 'mdl-list__item-sub-title user-list';
    secondaryContent.textContent = `Owner: ${group.owner}`;

    var primaryContent = document.createElement('span');
    primaryContent.className = 'mdl-list__item-primary-content';
    primaryContent.appendChild(name);
    primaryContent.appendChild(secondaryContent);

    var li = document.createElement('li');
    li.className = 'mdl-list__item mdl-list__item--two-line';
    li.style = 'border-top: 1px solid #ddd;';
    li.appendChild(primaryContent);

    geovoiceApi.get('group', group.name)
    .then( group => {
      secondaryContent.innerHTML = `Owner: ${group.owner} &emsp; Users: ${group.users.join(', ')}`
    })

    return li;
  }, // createGroupLi

  createMarkerLi: function(marker, options = {}) {
    options.draggable = options.draggable || false;

    var media = geovoice._markers.getPanelView(marker);

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

  dialog: (opts = {}) => {
    return new Promise((resolve, reject) => {
      showDialog({
        title: opts.title,
        text: opts.text,
        onLoaded: opts.onLoaded,
        positive: {
          id: 'dialog-ok',
          title: 'ok',
          onClick: (e) => resolve(e)
        },
        negative: {
          id: 'dialog-cancel',
          title: 'cancel',
          onClick: (e) => reject(e)
        }
      })
    })
  }, // dialog

  markdownViewer: (ops) => {
    var container = document.createElement('div');
    container.classList.add('markdown-view-container');

    var description = document.createElement('div');
    description = document.createElement('div');
    description.classList.add('markdown-view');
    description.innerHTML = ui.markdownFormatter(ops.markdown);
    container.appendChild(description);

    var button = document.createElement('div');
    button.textContent = ops.button.text;
    button.classList.add('button');
    container.appendChild(button);

    var content = {
      viewer: description,
      update: (text) => description.innerHTML = ui.markdownFormatter(text),
    }

    button.onclick = _=>ops.button.onclick(content)

    return container;
  }, // markdownViewer

  markdownFormatter: (text) => {
    var a = marked(text, {break: true});
    a = a.replace(/<a/g, '<a target="_blank"')
         .replace(/<li>\[\s\]/g, '<li class="check-box"><input onclick="return false" type="checkbox">')
         .replace(/<li>\[x\]/g, '<li class="check-box"><input checked onclick="return false" type="checkbox">');
    return a;
  }, // markdownFormatter

  markdownInputDialog: (initialText) => {
    var srcText = initialText;
    var opts = {
      text: `<div class="markdown-input">
              <div class="markdown-view"></div>
              <textarea class="input"></textarea>
              <p class="info">Uses <a target="_blank" href="https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet">Markdown</a><p>
            </div>`,
      onLoaded: () => {
        var src = document.querySelector('.markdown-input > textarea');
        var dest = document.querySelector('.markdown-input > .markdown-view');
        src.value = srcText;
        dest.innerHTML = ui.markdownFormatter(srcText);
        var userHasScrolledDest = false;
        dest.addEventListener('scroll',  _=> {
          userHasScrolledDest = !(dest.scrollHeight - dest.clientHeight <= dest.scrollTop +1)
        });
        var parse = () => {
          srcText = src.value;//.replace(/-\s\[\s\]/g, '- **\u2610**').replace(/-\s\[x\]/g, '- **\u2611**');
          dest.innerHTML = ui.markdownFormatter(srcText);
          if (!userHasScrolledDest) { dest.scrollTop = dest.scrollHeight}
          src.scrollIntoView();
        }
        src.onkeyup = parse;
      }
    }
    return ui.dialog(opts).then(_=>{return srcText;});
  }, // markdownInputDialog

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
