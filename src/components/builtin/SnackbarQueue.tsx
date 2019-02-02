import React from 'react';
import { connect } from 'react-redux';
import { Snackbar } from '@rmwc/snackbar';
import { dismissSnack } from './actions';


const SnackbarQueue = ({ snack, dispatch }) => {
  const close = () => { console.log('close'); dispatch(dismissSnack()); };
  const props = {
    onHide: close,
    timeout: 1000,
    message: 'message not provided',
    ...snack
  }
  console.log(snack);
  return snack && <Snackbar show={true} {...props} />
}

const mapStateToProps = state => {
  const snacks = state.builtin.snack;
  return {
    snack: snacks.length > 0 && snacks[0]
  }
}

export default connect(mapStateToProps)(SnackbarQueue);
