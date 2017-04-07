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

    panToPromise(getLoc(this.region.markers[this.currentMarker])).then(() =>{
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
