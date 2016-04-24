import { connect } from 'react-redux'
import LunchMoves from '../components/LunchMoves'
import { values } from 'lodash';

function groupMovesBySpots (state) {
  var spotsById = state.moves.items.reduce((acc, move) => {
    let spotId = move.spot_id;
    
    if (!acc[spotId]) {
      acc[spotId] = {
        name: state.spots[spotId].name,
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
  return {
    spots: groupMovesBySpots(state)
  }
}

// const mapDispatchToProps = (dispatch) => {
//   return {
//     onTodoClick: (id) => {
//       dispatch(toggleTodo(id))
//     }
//   }
// }

const ListContainer = connect(
  mapStateToProps
)(LunchMoves)

export default ListContainer
