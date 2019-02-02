import React from 'react';

import Index from './index';
// import Login from './login';
import Header from '../components/header/header';

import { BrowserRouter as Router, Route } from 'react-router-dom';
import DialogQueue from 'components/builtin/DialogQueue';
import SnackbarQueue from 'components/builtin/SnackbarQueue';
import { connect } from 'react-redux';


export default () => (
  <Router>
    <>
      <Header />
      <DialogQueue />
      <Route path='/' exact component={Index}/>

      <SnackbarQueue/>
    </>
  </Router>
)
