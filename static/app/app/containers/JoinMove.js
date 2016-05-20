import React, { Component } from 'react';
import { connect } from 'react-redux'
import { find } from 'lodash';
import { browserHistory } from 'react-router';


import Loading from '../components/Loading';
import { updateMove, fetchMoves, saveMove } from '../actions'

function mapStateToProps (state) {
    const {recentMove, moves} = state;
    return {recentMove, moves};
}

const mapDispatchToProps = (dispatch) => {
    return {
        updateMove: (move) => {
            return dispatch(updateMove(move));
        },
        saveMove: () => {
            return dispatch(saveMove());
        },
        fetchMoves: () => {
            return dispatch(fetchMoves());
        }
    };
}

class JoinMove extends Component {
    constructor (props) {
        super(props);
        this.state = {
            hasFetched: false
        };
    }
    
    updateMove(){
        let move = find(this.props.moves.items, {id: +this.props.routeParams.id});
        
        if (!move) {
            browserHistory.push('/edit');
        }
        
        this.props.updateMove({
            spot: move.spot,
            time: move.time
        });
        
        if (this.props.recentMove.user) {
            this.props.saveMove().then(() => {
                browserHistory.push('/');
            })
        } else {
            browserHistory.push('/edit');
        }
    }
    
    componentDidMount(){
        let move = find(this.props.moves.items, {id: +this.props.routeParams.id});
        if (!this.props.moves.haveFetched) {
            this.props.fetchMoves();
        } else {
            this.updateMove();
        }
    }

    componentDidUpdate(prevProps){
        if (!prevProps.moves.haveFetched && this.props.moves.haveFetched) {
            this.updateMove();
        }
    }
  
    render() {
        return <Loading />;
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(JoinMove);
