import React from 'react';
import { Dialog } from '@rmwc/dialog';
import { connect } from 'react-redux';

import { closeDialog } from './actions';

const DialogQueue = ({ Modal, dispatch }) => {
  const close = () => dispatch(closeDialog());
  return (
    <Dialog open={Modal} onClose={close}>
      {Modal && <Modal close={close} dispatch={dispatch} /> }
    </Dialog>
  );
}


const mapStateToProps = state => {
  const dialogs = state.builtin.dialog;
  return {
    Modal: dialogs.length && dialogs[0]
  }
}


export default connect(mapStateToProps)(DialogQueue);
