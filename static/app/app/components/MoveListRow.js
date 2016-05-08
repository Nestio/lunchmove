import React from 'react';
import { browserHistory } from 'react-router';

import Move from './Move';

export default function MoveListRow ({name, moves, hasOwnMove, updateMove, id}) {
    let moveItems = moves.map((move, i) => <Move {...move} key={i} />);
    let newMove;
    let onClick = () => {
        const move = {
            spot: id,
            time: moves[moves.length - 1].time
        };
        updateMove(move);
        browserHistory.push('/edit');
    }
    
    if (!hasOwnMove) {
        newMove = (
            <div className="move move-new" onClick={ onClick }>
                <div className="move-icon">
                    <span className="glyphicon glyphicon-plus"></span>
                </div>
                <div className="move-name">
                    <span>Go Here</span>
                </div>
            </div>
        );
    }

    return (
        <div className="row move-row">
            <div className="spot-name col-md-12">
                <span>{name}</span>
            </div>
            <div className="spot-moves col-md-12">
                {moveItems}
                {newMove}
            </div>
        </div>
    );
};
