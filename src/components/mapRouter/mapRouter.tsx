import React from 'react';
import { connect } from 'react-redux';

class MapRouter extends React.Component {
  componentDidMount() {
    const { dispatch } = this.props;
    dispatch()
  }
}




const mapStateToProps = state => {
  const regions = state.regions;
  return {
    regions
  }
}

export default connect(state => state.regions)(MapRouter)
