import React from 'react';
import '@babel/polyfill';

import Header from '../components/header/header';
import Map from '../components/map/map';

export default class App extends React.Component {
  render() {
    return (
      <div>
        {/* <Header /> */}
        <Map hideUi={true} apiKey="AIzaSyCVFBjW1BJqBqyha0VpVSn7rQTmz8lbAPw" />
      </div>
    )
  }
}

