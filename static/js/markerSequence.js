class MarkerSequence {
  constructor(region) {
    this.region = region;
    markers.pauseFetch();
    this.currentMarker = 0;
    this.initializeElement();
  }

  initializeElement() {
    this.audio = document.createElement("audio");
    this.audio.controls = true;
    this.audio.src = this.region.markers[0].sound;

    var subTitle = document.createElement("span");
    subTitle.className = "mdl-list__item-sub-title";
    subTitle.appendChild(this.audio);

    this.text = document.createElement('span');
    this.text.textContent = this.region.markers.length+' marker';

    var primaryContent = document.createElement('span');
    primaryContent.className = 'mdl-list__item-primary-content';
    primaryContent.appendChild(this.text);
    primaryContent.appendChild(subTitle);

    this.element = document.createElement('li');
    this.element.className = 'mdl-list__item mdl-list__item--two-line';

    this.audio.onended = () => this.nextMarker();
    this.audio.onplay = () => this.started();
    this.element.append(primaryContent);

  //  map.panTo(getLoc(this.region.markers[0]));
  map.panTo(this.region.marker.getPosition());
  }

  started() {
    this.text.textContent = 'Playing '+(this.currentMarker+1)+' of '+this.region.markers.length;


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
