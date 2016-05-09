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
    
    componentDidMount(){
        let move = find(this.props.moves.items, {id: +this.props.routeParams.id});
        if (!move && !this.props.moves.isFetching) {
            this.props.fetchMoves();
        }
    }

    componentWillReceiveProps(nextProps){
        if (this.props.moves.isFetching && !nextProps.moves.isFetching) {
            let move = find(nextProps.moves.items, {id: +this.props.routeParams.id});
            
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
    }
  
    render() {
        return <Loading />;
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(JoinMove);
