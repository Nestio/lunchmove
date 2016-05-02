import React, { Component } from 'react';
import { connect } from 'react-redux'

import { updateMove } from '../actions'
import NameForm from '../components/NameForm';
import MoveForm from '../components/MoveForm';


function mapStateToProps (state) {
    return state.recentMove;
}

const mapDispatchToProps = (dispatch) => {
  return {
    updateMove: (move) => {
      dispatch(updateMove(move))
    }
  }
}

class Edit extends Component { 
    render() {
        if (this.props.user) {
            return <MoveForm />
        } else {
            return <NameForm updateMove={this.props.updateMove} />
        }
    }
}

const EditContainer = connect(
    mapStateToProps,
    mapDispatchToProps
)(Edit);

export default EditContainer
