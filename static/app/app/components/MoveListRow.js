import React from 'react';

import Move from './Move';

export default function MoveListRow ({name, moves, hasOwnMove}) {
    let moveItems = moves.map((move) => <Move {...move} />);
    let newMove;

    if (!hasOwnMove) {
        newMove = (
            <div className="move move-new">
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
