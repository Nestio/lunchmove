import find from 'lodash/find';

import {
    REQUEST_MOVES, RECEIVE_MOVES, UPDATE_MOVE
} from '../actions'


let initialState = {
    haveFetched: false,
    items: []
};

function updateMove(state, action) {
    let items = state.items;
    if (find(state.items, {id: action.move.id})) {
        items = items.map(move => {
            return (move.id === action.move.id) ? Object.assign({}, move, action.move) : move;
        });
    } else {
        items = items.concat([action.move]);
    }
    return Object.assign(state, { items });
}

export default function moves(state = initialState, action) {
    switch (action.type) {
        case REQUEST_MOVES:
            return Object.assign({}, state, {
                haveFetched: false
        })
        case RECEIVE_MOVES:
            return Object.assign({}, state, {
                haveFetched: true,
                items: action.moves
            })
        case UPDATE_MOVE:
            return action.move.id ? updateMove(state, action) : state;
        default:
            return state
    }
}
