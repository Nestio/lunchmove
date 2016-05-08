import { connect } from 'react-redux'
import moment from 'moment';
import React, { Component } from 'react';
import MoveList from '../components/MoveList'
import { values, find } from 'lodash';
import { fetchSpots, fetchMoves, updateMove } from '../actions'
import Loading from '../components/Loading';

function mapMoves (state) {
    return state.moves.items.map((move) => {
        return Object.assign({}, move, {
            isOwnMove: move.id === state.recentMove.id
        });
    });
} 

function groupMovesBySpots (state) {
    let moves = mapMoves(state);
    let spotsById = moves.reduce((acc, move) => {
        let spotId = move.spot;

        if (!acc[spotId]) {
            let spot = find(state.spots.items, {id: spotId});

            acc[spotId] = {
                name: spot.name,
                id: spot.id,
                hasOwnMove: false,
                moves: []
              }
        }

        acc[spotId].moves.push(move);

        if (move.isOwnMove) {
            acc[spotId].hasOwnMove = true;
        }

        return acc;
    }, {});

    return values(spotsById);
} 

const mapStateToProps = (state) => {
    let spots = null;
    
    if (!state.moves.isFetching && !state.spots.isFetching) {
        spots = groupMovesBySpots(state);
    }
    
    return {
        spots,
        movesAreFetching: state.moves.isFetching,
        spotsAreFetching: state.spots.isFetching,
        recentMove: state.recentMove
    };
}

const mapDispatchToProps = (dispatch) => ({
    fetchMoves: () => dispatch(fetchSpots()),
    fetchSpots: () => dispatch(fetchMoves()),
    updateMove: (move) => dispatch(updateMove(move))
});

class List extends Component {
    componentWillMount () {
        if (!this.props.movesAreFetching) {
            this.props.fetchMoves();
        }
        
        if (!this.props.spotsAreFetching) {
            this.props.fetchSpots();
        }
    }
    
    render () {
        const {spots, recentMove, updateMove} = this.props;
        
        if (!spots) {
            return <Loading />
        } else {
            return <MoveList spots={spots} recentMove={recentMove} updateMove={updateMove} />
        }
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(List);
