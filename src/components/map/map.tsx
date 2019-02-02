import React from 'react';
import * as style from './map.module.scss';
import { initScript, GMapsUrl } from '../../utils';

interface ILatLng {
  lat: number | (() => number);
  lng: number | (() => number);
}

interface IProps extends React.HTMLProps<HTMLDivElement> {
  apiKey?: string; // api key
  center?: ILatLng; // map center in Latitude Longitude
  zoom?: number; // default map zoom, defaults to 4
  markers?: ILatLng[];
  markerStyle?: any;
  hideUi?: boolean;
}

declare var google, Map, Promise;

const llToString = (a: ILatLng) => `{ lat:${typeof a.lat === 'function' ? a.lat() : a.lat}, lng:${ typeof a.lng === 'function' ? a.lng() : a.lng} }`;

export default class GMap extends React.Component<IProps> {
  mapContainerRef;
  map;
  markers;

  static defaultProps: any = {
    center: {lat: 37.2988843, lng: -98.9289485 },
    markerStyle: {
      icon: {
        url: '/res/images/mapMarker.svg',
        scaledSize: {width: 20, height: 30, f: 'px', b: 'px'}
      }
    }
  }

  constructor(props) {
    super(props);
    this.markers = new Map();
  }

  componentDidMount() {
    initScript('script-gmaps', GMapsUrl(this.props.apiKey || ''), this.init.bind(this));
  }

  init() {
    const { markers = [], center, zoom = 4, markerStyle, hideUi} = this.props;
    if (this.mapContainerRef && google && google.maps && google.maps.Map) {
      this.map = new google.maps.Map(this.mapContainerRef, { center, zoom, disableDefaultUI: hideUi });
      markers.forEach(marker => {
        this.markers.set(llToString(marker), new google.maps.Marker({ position: marker, map: this.map, ...markerStyle}));
      });
    }
  }

  componentDidUpdate(prevProps) {
    const { markers = [], markerStyle } = this.props;

    let current = markers.map(m => llToString(m));
    let past = (prevProps.markers || []).map(m => llToString(m));

    // Remove markers from the map that have been removed from props list
    past.forEach(marker => {
      if (current.indexOf(marker) === -1) {
        let m = this.markers.get(marker);
        if (m) {
          m.setMap(null);
          m = null;
          this.markers.delete(marker);
        } else {
          // past contains a duplicate
        }
      }
    });

    // add new props markers to the map
    current.forEach((marker, index) => {
      if (past.indexOf(marker) === -1 && !this.markers.get(marker)) {
        let gm = new google.maps.Marker({position: markers[index], map: this.map, ...markerStyle});
        this.markers.set(marker, gm);
      }
    });

    if (this.props.center !== prevProps.center) {
      this.map.setCenter(this.props.center);
    }

    if (this.map) {
      google.maps.event.trigger(this.map, 'resize');
    }
  }

  render() {
    const { markers, center, zoom, apiKey, className= '', markerStyle, hideUi, ...rest } = this.props;
    return (
      <div {...rest} className={`${style.container} ${className}`}  ref={ref => this.mapContainerRef = ref}>
        <div className={style.map}>
          </div>
      </div>
    );
  }
}
