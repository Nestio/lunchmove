import React, { Component } from 'react';
import { connect } from 'react-redux'

import { updateMove, fetchSpotsIfNeeded } from '../actions'
import NameForm from '../components/NameForm';
import MoveForm from '../components/MoveForm';


function mapStateToProps (state) {
    const {recentMove, spots} = state;
    return {recentMove, spots};
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateMove: (move) => {
      dispatch(updateMove(move))
    },
    fetchSpotsIfNeeded: () => {
      dispatch(fetchSpotsIfNeeded());
    }
  }
}

class Edit extends Component {
    componentDidMount(){
      this.props.fetchSpotsIfNeeded();
    }
    render() {
        if (this.props.recentMove.user) {
            return <MoveForm recentMove={this.props.recentMove} spots={this.props.spots}/>
        } else {
            return <NameForm updateMove={this.props.updateMove} updateMove={this.props.updateMove} />
        }
    }
}

const EditContainer = connect(
    mapStateToProps,
    mapDispatchToProps
)(Edit);

export default EditContainer
