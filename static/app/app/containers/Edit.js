import React, { Component } from 'react';
import { connect } from 'react-redux'

import { updateMove } from '../actions'
import NameForm from '../components/NameForm';

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
        console.log(NameForm);
        if (this.props.user) {
            return <div>{this.props.user}</div>
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
