import React from 'react';
import ReactDOM from 'react-dom';

import 'material-components-web/dist/material-components-web.min.css';
import '../styles/global.scss';

import Router from './router';
import Store from './store';

ReactDOM.render(<Store children={<Router />} />, document.querySelector('body'));