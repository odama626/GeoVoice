class MarkerSequence {
  constructor(region) {
    this.region = region;
    markers.pauseFetch();
    this.currentMarker = 0;
    this.initializeElement();
  }

  initializeElement() {
    if (this.region.markers[0].type == 'sound') {
      this.audio = document.createElement("audio");
      this.audio.type='audio/mpeg';
    } else if (this.region.markers[0].type == 'video') {
      this.audio = document.createElement("video");
      this.audio.style.heoght='100%';
      this.audio.type='video/webm';
    }
    this.audio.controls = true;
    this.audio.src = this.region.markers[0].sound;

    var subTitle = document.createElement("div");
    subTitle.appendChild(this.audio);

    this.text = document.createElement('span');
    this.text.textContent = this.region.markers.length+' marker';

    var primaryContent = document.createElement('span');
    //primaryContent.className = 'mdl-list__item-primary-content';
    primaryContent.appendChild(this.text);
    primaryContent.appendChild(subTitle);

    this.element = document.createElement('div');
  //  this.element.className = 'mdl-list__item mdl-list__item--two-line';

    this.audio.onended = () => this.nextMarker();
    this.audio.onplay = () => this.started();
    this.element.append(primaryContent);

  //  map.panTo(getLoc(this.region.markers[0]));
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
    var mediaElement
    if (this.region.markers[this.currentMarker].type == 'sound') {
      mediaElement = document.createElement("audio");
      mediaElement.type='audio/mpeg';
    } else if (this.region.markers[this.currentMarker].type == 'video') {
      mediaElement = document.createElement("video");
      mediaElement.style.heoght='100%';
      mediaElement.type='video/webm';
    }

    mediaElement.controls = true;
    //mediaElement.src = this.region.markers[0].sound;
    mediaElement.onended = () => this.nextMarker();
    mediaElement.onplay = () => this.started();
    this.audio.replaceWith(mediaElement);
    this.audio = mediaElement;
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

    // move marker to next sound location
    /*this.region.marker.position = new google.maps.LatLng({
      lat : parseFloat(this.region.markers[this.currentMarker].lat),
      lng : parseFloat(this.region.markers[this.currentMarker].lng)
    });*/

    panToPromise(getLoc(this.region.markers[this.currentMarker])).then(() =>{
      this.audio.pause();
      this.audio.currentTime = 0.00;
      this.audio.src = this.region.markers[this.currentMarker].sound;
      this.audio.play();
    });
  }

  getElement() {
    return this.element;
  }

}
