import { connect } from 'react-redux'
import LunchMoves from '../components/LunchMoves'
import { values, find } from 'lodash';

function groupMovesBySpots (state) {
  var spotsById = state.moves.items.reduce((acc, move) => {
    let spotId = move.spot_id;
    
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
