import { connect } from 'react-redux'
import LunchMoves from '../components/LunchMoves'
import { values, find } from 'lodash';

function mapMoves (state) {
  return state.moves.items.map((move) => {
    return Object.assign({}, move, {
      isOwnMove: move.id === state.recentMove.id
    });
  });
} 

function groupMovesBySpots (state) {
  let moves = mapMoves(state);
  debugger
  let spotsById = moves.reduce((acc, move) => {
    let spotId = move.spot;
    
    if (!acc[spotId]) {
      let spot = find(state.spots.items, {id: spotId});
      
      acc[spotId] = {
        name: spot.name,
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
  if (state.moves.items && state.spots.items) {
    spots = groupMovesBySpots(state);
  }
  return {
    spots
  };
}

const ListContainer = connect(
  mapStateToProps
)(LunchMoves)

export default ListContainer
