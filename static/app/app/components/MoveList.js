import React, { Component } from 'react';
import { Link } from 'react-router';

import MoveListRow from './MoveListRow';

export default function List (props) {
    let list;
    if (!props.spots.length) {
        list = (
            <div className="col-md-12 text-center">
                {"No one's going anywhere, just quite yet."}
            </div>
        );

    } else {
        list = props.spots.map((spot, i) => <MoveListRow {...spot} key={i}/>);
    }
    
    let yourMove;
    if (!props.recentMove.id) {
        yourMove = (
            <div className="container your-move">
                <div className="row">
                    <div className="col-sm-12 text-center">
                        <Link to='/edit' className="btn btn-default btn-lg">Where are you going?</Link>
                    </div>
                </div>
            </div>
        )
    }
    
    return (
        <div>
            <div className="lunch-moves-list">
                <div className="container moves-container">
                    {list}
                </div>
            </div>
            {yourMove}
        </div>
    )
}
